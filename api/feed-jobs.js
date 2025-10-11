// /api/feed-jobs?limit=20&q=warehouse&industry=Retail&min_wage=17&location=Trenton
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const limit    = Math.max(1, Math.min(100, parseInt(req.query.limit || "20", 10)));
  const q        = (req.query.q || "").toString().trim();             // keyword: title/company/industry
  const industry = (req.query.industry || "").toString().trim();      // exact match
  const location = (req.query.location || "").toString().trim();      // ilike
  const minWage  = req.query.min_wage ? Number(req.query.min_wage) : null;

  const params = new URLSearchParams();
  params.set("select", [
    "id","title","company","industry","location",
    "wage","apply_link","description",
    "created_at","created_at_external"
  ].join(","));
  params.set("order", "coalesce(created_at_external,created_at).desc");
  params.set("limit", String(limit));

  // If you added these columns, keep results to your area + active rows:
  params.set("state", "eq.NJ");
  params.set("county", "eq.Mercer");
  params.set("is_active", "is.true");

  if (industry) params.set("industry", `eq.${industry}`);
  if (minWage)  params.set("wage", `gte.${minWage}`);
  if (location) params.set("location", `ilike.%${location}%`);
  if (q)        params.set("or", `(title.ilike.%${q}%,company.ilike.%${q}%,industry.ilike.%${q}%,location.ilike.%${q}%)`);

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/jobs?${params.toString()}`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    if (!r.ok) throw new Error(await r.text());
    const rows = await r.json();

    // Edge cache for 5 minutes to keep it snappy
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ jobs: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
