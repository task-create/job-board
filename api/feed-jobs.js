// /api/feed-jobs?limit=20&approved=true&location=Trenton&min_wage=17&industry=Retail&q=warehouse
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  const p = new URLSearchParams();

  const limit    = Math.max(1, Math.min(100, parseInt(req.query.limit || "20", 10)));
  const q        = (req.query.q || "").toString().trim();
  const industry = (req.query.industry || "").toString().trim();
  const location = (req.query.location || "").toString().trim();
  const minWage  = req.query.min_wage ? Number(req.query.min_wage) : null;
  const approved = (req.query.approved ?? "true").toString(); // default true

  p.set("select", [
    "id","title","company","industry","location",
    "wage","apply_link","description",
    "created_at","created_at_external","approved","reviewed","flagged_reasons"
  ].join(","));
  p.set("order", "coalesce(created_at_external,created_at).desc");
  p.set("limit", String(limit));
  p.set("state", "eq.NJ");
  p.set("county", "eq.Mercer");

  // Only approved by default
  if (approved === "true") p.set("approved", "is.true");

  if (industry) p.set("industry", `eq.${industry}`);
  if (minWage)  p.set("wage", `gte.${minWage}`);
  if (location) p.set("location", `ilike.%${location}%`);
  if (q)        p.set("or", `(title.ilike.%${q}%,company.ilike.%${q}%,industry.ilike.%${q}%,location.ilike.%${q}%)`);

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/jobs?${p.toString()}`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    if (!r.ok) throw new Error(await r.text());
    const rows = await r.json();

    // Cache at edge 5 mins
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json({ jobs: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
