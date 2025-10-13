/**
 * @api {get} /api/fetch-jobs Get Job Listings from Adzuna
 * @apiName FetchJobs
 * @apiGroup Jobs
 * @apiVersion 1.0.0
 *
 * @apiParam {String} [q]       Search query (keywords).
 * @apiParam {String} [where]   Location to search within.
 * @apiParam {Number} [days=3]  Max age of job postings in days (1-14).
 * @apiParam {Number} [limit=20] Number of results to return (1-50).
 *
 * @apiSuccess {Object} meta    Metadata about the request.
 * @apiSuccess {Object[]} jobs  An array of job objects.
 *
 * @apiDescription This endpoint acts as a proxy to the Adzuna API,
 * fetching job listings with sensible defaults for the Mercer County area.
 * It includes a lightweight in-memory cache to reduce redundant API calls.
 */

// A simple in-memory cache to avoid spamming the Adzuna API for identical requests.
const cache = new Map();

// Helper to calculate a human-readable "posted ago" string.
function timeAgo(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}


export default async function handler(req, res) {
  // --- Standard Headers & Options Request Handling ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Powered-By', 'Awesome Job Finder 9000'); // A little flair!
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // --- API Key Validation ---
  const { ADZUNA_APP_ID, ADZUNA_API_KEY } = process.env;
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    console.error('CRITICAL: Adzuna API credentials are not configured in environment variables.');
    return res.status(500).json({ error: 'Server configuration error: API credentials missing.' });
  }

  // --- Sensible Defaults & Parameter Sanitization ---
  const defaults = {
    q: '"entry level" OR warehouse OR healthcare OR manufacturing OR culinary OR retail',
    where: 'Mercer County, New Jersey',
    days: '3',
    limit: '20',
  };
  const country = 'us';
  const page = '1';

  const q = (req.query.q || defaults.q).toString();
  const where = (req.query.where || defaults.where).toString();
  // Ensure 'days' and 'limit' are within reasonable, valid bounds.
  const days = String(Math.max(1, Math.min(14, parseInt(req.query.days || defaults.days, 10))));
  const limit = String(Math.max(1, Math.min(50, parseInt(req.query.limit || defaults.limit, 10)))); // Adzuna max is 50

  // --- Build Adzuna API Request URL ---
  const adzunaParams = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_API_KEY,
    results_per_page: limit,
    what: q,
    where: where,
    max_days_old: days,
    sort_by: 'date',
  });
  const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/${country}/search/${page}?${adzunaParams.toString()}`;

  // --- Caching Logic ---
  const cacheKey = adzunaUrl;
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < 300000)) { // 5 minute cache
    console.log(`CACHE HIT: Serving from cache for key: ${cacheKey}`);
    return res.status(200).json(cached.data);
  }
  console.log(`CACHE MISS: Fetching fresh data for key: ${cacheKey}`);

  // --- Main API Fetch Logic ---
  try {
    const response = await fetch(adzunaUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Adzuna API Error (Status: ${response.status}): ${errorText}`);
      throw new Error(`Adzuna API responded with status ${response.status}.`);
    }
    const data = await response.json();

    // --- Data Normalization & Enrichment ---
    // Transform the raw Adzuna response into a clean, consistent format for our front-end.
    const jobs = (data.results || []).map(j => ({
      id: j.id,
      title: j.title || 'No Title Provided',
      company: j.company?.display_name || 'Company Not Listed',
      industry: j.category?.label || 'Uncategorized',
      location: j.location?.display_name || 'Location Not Specified',
      description: j.description || 'No description available.',
      created: j.created || null,
      posted_ago: timeAgo(j.created), // Add our human-readable time
      apply_link: j.redirect_url,
      wage: null, // Adzuna wage data is unreliable; handle on front-end if needed.
    }));

    const responsePayload = {
      meta: {
        source: 'Adzuna API (Live)',
        query: { what: q, where, days: Number(days), limit: Number(limit) },
        count: jobs.length,
      },
      jobs,
    };

    // Store the successful response in the cache before sending it.
    cache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

    return res.status(200).json(responsePayload);

  } catch (error) {
    console.error('FATAL: Failed to fetch and process jobs.', {
      query: req.query,
      errorMessage: error.message,
    });
    return res.status(500).json({ error: 'An error occurred while fetching jobs.' });
  }
}

