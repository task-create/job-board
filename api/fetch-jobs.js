// /api/fetch-jobs.js
// This function fetches jobs from Adzuna and includes robust error handling for external API failures.

const fetch = global.fetch || require('node-fetch');

// In-memory cache store
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateCacheKey(query, location) {
    return JSON.stringify({ query: query.toLowerCase(), location: location.toLowerCase() });
}

function normalizeJob(job) {
    return {
        id: `adzuna-${job.id}`,
        title: job.title || 'Job Opening',
        company: job.company?.display_name || 'Confidential',
        location: job.location?.display_name || 'Mercer County, NJ',
        description: job.description || 'No description provided.',
        created: job.created || new Date().toISOString(),
        salary_min: job.salary_min ?? null,
        salary_max: job.salary_max ?? null,
        redirect_url: job.redirect_url,
        industry: job.category?.label || 'Uncategorized',
        source: 'Adzuna'
    };
}

async function fetchFromAdzuna(q, where, limit, days, appId, apiKey) {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/us/search/1`);
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', apiKey);
    url.searchParams.set('results_per_page', limit);
    url.searchParams.set('what', q);
    url.searchParams.set('where', where);
    url.searchParams.set('max_days_old', days);
    url.searchParams.set('sort_by', 'date');

    const response = await fetch(url.toString());
    if (!response.ok) {
        // This is the critical part - it captures Adzuna's HTML error page
        const errorText = await response.text().catch(() => 'Failed to read error body.');
        throw new Error(`Adzuna API returned a non-200 status (${response.status}). This is an issue with the external job service, not our server.`);
    }
    const data = await response.json();
    return (data.results || []).map(normalizeJob);
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

    const { ADZUNA_APP_ID, ADZUNA_API_KEY } = process.env;
    
    if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
        return res.status(500).json({ ok: false, error: 'CONFIGURATION ERROR: Adzuna API keys are not configured on the Vercel server. Please check Environment Variables.' });
    }
    
    const url = new URL(req.url, 'http://localhost');
    const q = (url.searchParams.get('q') || '').trim();
    const where = (url.searchParams.get('where') || '').trim();
    const limit = url.searchParams.get('limit') || '100';
    const days = url.searchParams.get('days') || '7';

    const cacheKey = generateCacheKey(q, where);
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
        return res.status(200).json({ ok: true, jobs: cachedEntry.jobs, source: 'Cache' });
    }

    try {
        const jobs = await fetchFromAdzuna(q, where, limit, days, ADZUNA_APP_ID, ADZUNA_API_KEY);
        
        if (jobs.length === 0) {
             return res.status(200).json({ 
                ok: false, 
                message: 'No recent jobs found matching your criteria. Try broadening your search.', 
                jobs: []
            });
        }
        
        const responseData = { ok: true, jobs };
        cache.set(cacheKey, { jobs, timestamp: Date.now() });
        return res.status(200).json(responseData);

    } catch (err) {
        console.error('FATAL Adzuna Fetch error:', err);
        return res.status(500).json({ ok: false, error: `Failed to fetch jobs from the backend. Reason: ${err.message}` });
    }
}

