// /api/metrics
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  try {
    const sql = `
      with base as (
        select industry, wage
        from jobs
        where state = 'NJ' and county = 'Mercer' and is_active is true
      )
      select
        industry,
        count(*) as jobs,
        round(avg(wage)::numeric,2) as avg_hourly
      from base
      group by industry
      order by jobs desc
      limit 8;
    `;
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: sql })
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    return res.status(200).json({ industries: data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
