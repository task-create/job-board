// /api/fetch-jobs.js
// This function fetches jobs from Adzuna and includes a cache to improve performance.

// In-memory cache to store recent results.
const cache = new Map();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export default async function handler(req, res) {
  // Set CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle the browser's preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  // --- Caching Logic ---
  const cacheKey = req.url; // Use the full request URL as the cache key
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey);
    // Check if the cached data is still fresh
    if (Date.now() - cached.timestamp < CACHE_DURATION_MS) {
      // Return the cached data instantly
      return res.status(200).json(cached.data);
    }
  }
  // --- End Caching Logic ---

  const { ADZUNA_APP_ID, ADZUNA_API_KEY } = process.env;
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    return res.status(500).json({ ok: false, error: 'API credentials are not configured on the server.' });
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

    const responseData = { 
        ok: true,
        meta: { 
            query: req.query.q || DEFAULT_Q, 
            where: req.query.where || DEFAULT_WHERE, 
            count: jobs.length 
        }, 
        jobs 
    };

    // Store the new result in the cache before sending it
    cache.set(cacheKey, {
        timestamp: Date.now(),
        data: responseData
    });

    return res.status(200).json(responseData);

  } catch (err) {
    console.error('Failed to fetch jobs from Adzuna:', err);
    // Don't crash the server, return a graceful error response
    return res.status(500).json({ ok: false, error: 'Failed to fetch jobs from Adzuna.' });
  }
}

