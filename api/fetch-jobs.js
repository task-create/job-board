// /api/fetch-jobs.js
// Reads jobs from Supabase (primary) and Adzuna (optional secondary).
// Returns a unified array shaped the way your UI expects.
// CORS + OPTIONS + robust error handling.

const fetch = global.fetch || require('node-fetch');

function okJson(res, obj, status = 200) {
  res.status(status).json(obj);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function parseIntSafe(v, fallback) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - (Number.isFinite(days) ? days : 7));
  return d.toISOString();
}

// Normalize records to your front-end shape
function normJob(j) {
  // Expecting fields your UI uses:
  // title, description, company, location, industry, salary_min, salary_max, created, redirect_url
  return {
    title: j.title || 'Untitled',
    description: j.description || '',
    company: j.company || j.company_name || 'Unknown Company',
    location: j.location || j.city || j.place || '',
    industry: j.industry || j.category || null,
    salary_min: typeof j.salary_min === 'number' ? j.salary_min
              : (typeof j.salary_min === 'string' ? Number(j.salary_min) : null),
    salary_max: typeof j.salary_max === 'number' ? j.salary_max
              : (typeof j.salary_max === 'string' ? Number(j.salary_max) : null),
    created: j.created || j.created_at || j.date || new Date().toISOString(),
    redirect_url: j.redirect_url || j.url || j.apply_url || null
  };
}

async function fetchSupabase({ url, anonKey, where, q, days, limit }) {
  if (!url || !anonKey) {
    return { ok: false, source: 'supabase', error: 'Missing SUPABASE_URL or SUPABASE_ANON_KEY', jobs: [] };
  }

  // Prefer a public view/table e.g. public.jobs (approved=true).
  // Adjust table and filters to your schema.
  const endpoint = `${url}/rest/v1/jobs`;
  const sinceISO = daysAgoISO(days);

  const params = new URLSearchParams();
  // RLS-safe filters (postgrest)
  params.set('select', 'title,description,company,location,industry,salary_min,salary_max,created,redirect_url,approved');
  params.set('approved', 'eq.true');
  params.set('created', `gte.${sinceISO}`);
  if (q) {
    // Simple ilike on title/description; adjust if you have FTS
    params.set('or', `(title.ilike.*${q}*,description.ilike.*${q}*,company.ilike.*${q}*)`);
  }
  if (where) {
    params.set('location', `ilike.*${where}*`);
  }
  params.set('order', 'created.desc');
  params.set('limit', String(parseIntSafe(limit, 100)));

  const resp = await fetch(`${endpoint}?${params.toString()}`, {
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { ok: false, source: 'supabase', error: `HTTP ${resp.status}: ${text || 'Supabase error'}`, jobs: [] };
  }

  const rows = await resp.json().catch(() => []);
  return { ok: true, source: 'supabase', jobs: rows.map(normJob) };
}

async function fetchAdzuna({ appId, apiKey, where, q, days, limit }) {
  if (!appId || !apiKey) {
    return { ok: false, source: 'adzuna', error: 'Missing ADZUNA_APP_ID or ADZUNA_API_KEY', jobs: [] };
  }

  // US endpoint; adjust country if needed
  const base = `https://api.adzuna.com/v1/api/jobs/us/search/1`;
  const params = new URLSearchParams();
  params.set('app_id', appId);
  params.set('app_key', apiKey);
  params.set('results_per_page', String(parseIntSafe(limit, 50)));
  if (q) params.set('what', q);
  if (where) params.set('where', where);
  // Adzuna doesn’t have "days" param universally; some regions support "max_days_old"
  if (days) params.set('max_days_old', String(parseIntSafe(days, 7)));

  const resp = await fetch(`${base}?${params.toString()}`);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return { ok: false, source: 'adzuna', error: `HTTP ${resp.status}: ${text || 'Adzuna error'}`, jobs: [] };
  }

  const data = await resp.json().catch(() => ({}));
  const results = Array.isArray(data.results) ? data.results : [];
  const mapped = results.map(r => normJob({
    title: r.title,
    description: r.description,
    company: r.company?.display_name,
    location: `${r.location?.area?.filter(Boolean).join(', ') || r.location?.display_name || ''}`,
    industry: r.category?.label,
    salary_min: r.salary_min ?? null,
    salary_max: r.salary_max ?? null,
    created: r.created ?? r.created_at,
    redirect_url: r.redirect_url
  }));

  return { ok: true, source: 'adzuna', jobs: mapped };
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return okJson(res, { error: 'Method Not Allowed' }, 405);

  const t0 = Date.now();

  try {
    const url = new URL(req.url, 'http://localhost'); // base isn’t used
    const q = (url.searchParams.get('q') || '').trim();
    const where = (url.searchParams.get('where') || '').trim();
    const days = parseIntSafe(url.searchParams.get('days'), 7);
    const limit = parseIntSafe(url.searchParams.get('limit'), 100);

    // ENV
    const SUPABASE_URL  = process.env.SUPABASE_URL;
    const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
    const ADZUNA_API_KEY= process.env.ADZUNA_API_KEY;

    // Fetch in parallel; don’t fail the whole request if one source is down
    const [sb, adz] = await Promise.allSettled([
      fetchSupabase({ url: SUPABASE_URL, anonKey: SUPABASE_ANON, where, q, days, limit }),
      fetchAdzuna({ appId: ADZUNA_APP_ID, apiKey: ADZUNA_API_KEY, where, q, days, limit: Math.min(limit, 50) })
    ]);

    const supabaseRes = sb.status === 'fulfilled' ? sb.value : { ok: false, source: 'supabase', error: sb.reason?.message || 'Supabase fetch failed', jobs: [] };
    const adzunaRes   = adz.status === 'fulfilled' ? adz.value : { ok: false, source: 'adzuna',   error: adz.reason?.message || 'Adzuna fetch failed', jobs: [] };

    // Merge + de-dupe by (title+company+location)
    const merged = [...supabaseRes.jobs, ...adzunaRes.jobs];
    const seen = new Set();
    const deduped = merged.filter(j => {
      const key = [j.title, j.company, j.location].map(s => (s || '').toLowerCase()).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Optional: clamp final size
    const finalJobs = deduped.slice(0, limit);

    // Compose diagnostics so your UI can show partial source info if desired
    const diag = {
      supabase: { ok: !!supabaseRes.ok, count: supabaseRes.jobs.length, error: supabaseRes.ok ? null : supabaseRes.error },
      adzuna:   { ok: !!adzunaRes.ok,   count: adzunaRes.jobs.length,   error: adzunaRes.ok ? null : adzunaRes.error }
    };

    // If both sources failed, still return 200 with empty list + reason (avoid client “Failed to fetch”)
    okJson(res, {
      ok: true,
      ms: Date.now() - t0,
      sources: diag,
      jobs: finalJobs
    }, 200);

  } catch (err) {
    // Never explode; return structured failure so client can render a nice error block
    console.error('fetch-jobs fatal:', err);
    okJson(res, {
      ok: false,
      message: 'Failed to fetch jobs from backend services.',
      detail: String(err?.message || err),
      jobs: [],
      sources: {}
    }, 200);
  }
};
