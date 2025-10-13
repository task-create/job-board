// /api/fetch-jobs

export default async function handler(req, res) {
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
  const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    return res.status(500).json({ error: 'API credentials are not configured.' });
  }

  const DEFAULT_Q = '"entry level" OR warehouse OR healthcare OR manufacturing OR culinary OR retail';
  const DEFAULT_WHERE = 'Mercer County, New Jersey';
  const DEFAULT_DAYS = '7';
  const DEFAULT_LIMIT = '100';
  const PAGE = '1';
  const country = 'us';

  const q = (req.query.q || DEFAULT_Q).toString();
  const where = (req.query.where || DEFAULT_WHERE).toString();
  const days = String(Math.max(1, Math.min(14, parseInt(req.query.days || DEFAULT_DAYS, 10) || 7)));
  const limit = String(Math.max(1, Math.min(100, parseInt(req.query.limit || DEFAULT_LIMIT, 10) || 100)));

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${PAGE}`);
  url.searchParams.set('app_id', ADZUNA_APP_ID);
  url.searchParams.set('app_key', ADZUNA_API_KEY);
  url.searchParams.set('results_per_page', limit);
  url.searchParams.set('what', q);
  url.searchParams.set('where', where);
  url.searchParams.set('max_days_old', days);
  url.searchParams.set('sort_by', 'date');

  try {
    const r = await fetch(url.toString());
    if (!r.ok) {
      const text = await r.text();
      throw new Error(`Adzuna API Error: ${r.status} ${text}`);
    }
    const data = await r.json();

    const jobs = (data.results || []).map(j => ({
      id: j.id,
      title: j.title || '',
      company: j.company?.display_name || '—',
      industry: j.category?.label || 'Uncategorized',
      location: j.location?.display_name || '—',
      description: j.description || '',
      created: j.created || '',
      salary_min: j.salary_min ?? null,
      salary_max: j.salary_max ?? null,
      redirect_url: j.redirect_url,
    }));

    return res.status(200).json({
      meta: { where, days: Number(days), limit: Number(limit), count: jobs.length, query: q },
      jobs,
    });
  } catch (err) {
    console.error('Failed to fetch jobs:', err);
    return res.status(500).json({ error: 'Failed to fetch jobs from Adzuna.' });
  }
}

