// /api/fetch-jobs.js
export default async function handler(req, res) {
  // Set CORS headers for browser access (preflight and actual)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle the browser's preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Only allow GET for the actual request
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { ADZUNA_APP_ID, ADZUNA_API_KEY } = process.env;
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    console.error('Adzuna API credentials are not configured on the server.');
    // Return a 200 with a user-friendly error payload instead of crashing
    return res.status(200).json({ 
        ok: false,
        message: 'Job service is not configured correctly. Please contact support.',
        meta: {},
        jobs: [] 
    });
  }

  const DEFAULT_Q = '"entry level" OR warehouse OR healthcare OR manufacturing OR culinary OR retail';
  const DEFAULT_WHERE = 'Mercer County, New Jersey';
  
  try {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/1`);
    url.searchParams.set('app_id', ADZUNA_APP_ID);
    url.searchParams.set('app_key', ADZUNA_API_KEY);
    url.searchParams.set('results_per_page', req.query.limit || '100');
    url.searchParams.set('what', req.query.q || DEFAULT_Q);
    url.searchParams.set('where', req.query.where || DEFAULT_WHERE);
    url.searchParams.set('max_days_old', req.query.days || '7');
    url.searchParams.set('sort_by', 'date');

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
      redirect_url: j.redirect_url
    }));

    return res.status(200).json({ 
        ok: true,
        meta: { 
            query: req.query.q || DEFAULT_Q, 
            where: req.query.where || DEFAULT_WHERE, 
            count: jobs.length 
        }, 
        jobs 
    });

  } catch (err) {
    console.error('Failed to fetch jobs from Adzuna:', err);
    // Instead of 500, send 200 with a safe fallback payload
    return res.status(200).json({ 
        ok: false,
        message: 'Could not connect to the job service. Please try again later.',
        meta: {},
        jobs: []
    });
  }
}

