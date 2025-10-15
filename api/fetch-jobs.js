// /api/fetch-jobs.js
// This function fetches jobs from Adzuna using an optimized query list.

// In-memory cache store (simple Object Map)
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // Cache duration: 10 minutes

function generateCacheKey(query, location) {
    return JSON.stringify({ query: query.toLowerCase(), location: location.toLowerCase() });
}

// Function to normalize job data to a consistent structure
function normalizeJob(job, source) {
    // Adzuna normalization
    const id = `adzuna-${job.id}`;
    return {
        id,
        title: job.title || 'Job Opening',
        company: job.company?.display_name || 'Confidential',
        location: job.location?.display_name || 'Mercer County, NJ',
        description: job.description || 'No description provided.',
        created: job.created || job.created_at || new Date().toISOString(),
        salary_min: job.salary_min ?? null,
        salary_max: job.salary_max ?? null,
        redirect_url: job.redirect_url,
        source: 'Adzuna'
    };
}

// Function to call Adzuna API
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
        const text = await response.text();
        throw new Error(`Adzuna API returned non-200 status (${response.status}). Body: ${text}`);
    }
    const data = await response.json();
    return (data.results || []).map(job => normalizeJob(job, 'adzuna'));
}

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });


    const { ADZUNA_APP_ID, ADZUNA_API_KEY } = process.env;
    
    // --- CRITICAL CHECK: ENSURE KEYS EXIST ---
    if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
        // Explicitly tell the front-end what the problem is
        return res.status(500).json({ ok: false, error: 'CONFIGURATION ERROR: Adzuna API keys are not configured on the Vercel server. Please check Environment Variables.' });
    }
    
    // --- OPTIMIZED DEFAULT QUERY FOR TASK NEEDS ---
    const ENTRY_LEVEL_ROLES = 'warehouse OR retail OR "customer service" OR healthcare OR housekeeping OR cook OR "food service" OR culinary OR assembly OR manufacturing OR sanitation OR cleaner';
    const NEXT_LEVEL_KEYWORDS = 'team lead OR supervisor OR coordinator OR shift lead OR senior associate OR specialized technician OR foreman';

    const DEFAULT_Q = `(${ENTRY_LEVEL_ROLES}) OR (${NEXT_LEVEL_KEYWORDS})`;
    const DEFAULT_WHERE = 'Mercer County, New Jersey';

    const q = req.query.q || DEFAULT_Q;
    const where = req.query.where || DEFAULT_WHERE;
    const limit = req.query.limit || '100';
    const days = req.query.days || '7';

    const cacheKey = generateCacheKey(q, where);
    const cachedEntry = cache.get(cacheKey);

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
        console.log(`Cache HIT for: ${cacheKey}`);
        return res.status(200).json({ ok: true, jobs: cachedEntry.jobs, source: 'Cache', meta: cachedEntry.meta });
    }
    console.log(`Cache MISS for: ${cacheKey}. Fetching live data...`);

    let adzunaJobs = [];
    
    try {
        adzunaJobs = await fetchFromAdzuna(q, where, limit, days, ADZUNA_APP_ID, ADZUNA_API_KEY);
        
        const combinedJobs = adzunaJobs;
        
        if (combinedJobs.length === 0) {
             return res.status(200).json({ 
                ok: false, 
                message: 'No recent jobs found matching your criteria. Try broadening your search.', 
                jobs: [],
                meta: { count: 0 }
            });
        }
        
        const responseData = {
            ok: true,
            jobs: combinedJobs,
            meta: { 
                count: combinedJobs.length,
                source: 'Adzuna (Optimized)'
            }
        };

        // Cache the results
        cache.set(cacheKey, { jobs: combinedJobs, timestamp: Date.now(), meta: responseData.meta });

        return res.status(200).json(responseData);

    } catch (err) {
        console.error('FATAL Adzuna Fetch error:', err);
        return res.status(500).json({ ok: false, error: `Adzuna API call failed. Details: ${err.message}` });
    }
}
