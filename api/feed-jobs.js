// /api/feed-jobs?limit=20&industry=Retail&q=cashier
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Missing Supabase env vars" });
  }

  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || "20", 10)));
  const industry = (req.query.industry || "").toString();
  const q = (req.query.q || "").toString();

  const params = new URLSearchParams();
  params.set("select",
    [
      "id","title","company","industry","location",
      "created_at","created_at_external","wage",
      "apply_link","description"
    ].join(",")
  );
  params.set("order", "coalesce(created_at_external,created_at).desc");
  params.set("limit", String(limit));
  params.set("state", "eq.NJ");
  params.set("county", "eq.Mercer");
  params.set("is_active", "is.true");

  if (industry) params.set("industry", `eq.${industry}`);
  if (q) params.set("title", `ilike.%${q}%`);

  try {
    const url = `${SUPABASE_URL}/rest/v1/jobs?${params.toString()}`;
    const r = await fetch(url, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` }
    });
    if (!r.ok) throw new Error(`Feed error ${r.status} ${await r.text()}`);
    const rows = await r.json();
    return res.status(200).json({ meta: { count: rows.length, limit, industry, q }, jobs: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
