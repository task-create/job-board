// GET /api/feed-jobs
// Optional: ?q=keywords&industry=Warehouse&limit=20
// Returns top-N most recent rows from Supabase 'jobs' (source='adzuna' by default)

export default async function handler(req, res) {
  // CORS for your static dashboard
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Missing Supabase env vars" });
  }

  const {
    q = "",
    industry = "",
    limit = "20",
    source = "adzuna" // keep the feed to adzuna ingested jobs by default
  } = req.query;

  // Build PostgREST filters
  const params = new URLSearchParams();
  params.set("select", [
    "id",
    "source",
    "external_id",
    "title",
    "company",
    "industry",
    "location",
    "created_at_external",
    "salary_min_hourly",
    "salary_max_hourly",
    "url",
    "description"
  ].join(","));

  params.set("order", "created_at_external.desc.nullslast");
  params.set("limit", String(Math.max(1, Math.min(100, parseInt(limit, 10) || 20))));

  // Base filters
  params.set("source", `eq.${source}`);
  params.set("county", "eq.Mercer");
  params.set("state", "eq.NJ");

  if (industry) params.set("industry", `eq.${industry}`);

  // Full-text-ish filter across title/company (case-insensitive)
  if (q) {
    // ilike title OR company — PostgREST doesn't support OR in query params directly,
    // so fetch broader and filter client-side OR use a PostgREST RPC later.
    // For now, just apply ilike on title; dashboard also filters client-side.
    params.set("title", `ilike.%${q}%`);
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/jobs?${params.toString()}`;
    const r = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    if (!r.ok) throw new Error(`Supabase feed error ${r.status} ${await r.text()}`);
    const rows = await r.json();

    return res.status(200).json({
      meta: { count: rows.length, limit: Number(limit), source, industry, q },
      jobs: rows
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
