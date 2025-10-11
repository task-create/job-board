// /api/ingest-jobs?secret=YOUR_CRON_SECRET
export default async function handler(req, res) {
  if (req.query.secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { ADZUNA_APP_ID, ADZUNA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: "Missing environment variables" });
  }

  const QUERIES = [
    `"entry level" OR warehouse OR "picker packer" OR logistics`,
    `"entry level" OR culinary OR "prep cook" OR "line cook" OR "food service" OR dishwasher`,
    `"entry level" OR retail OR cashier OR "customer service" OR receptionist`,
    `"entry level" OR healthcare OR "medical assistant" OR "patient care" OR "rehab aide"`,
    `"entry level" OR manufacturing OR production OR assembler OR "machine operator"`
  ];
  const WHERE = "Mercer County, New Jersey";
  const DAYS = "3";
  const LIMIT = "100";
  const PAGE = "1";
  const country = "us";

  const fetchAdzuna = async (q) => {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${PAGE}`);
    url.searchParams.set("app_id", ADZUNA_APP_ID);
    url.searchParams.set("app_key", ADZUNA_API_KEY);
    url.searchParams.set("results_per_page", LIMIT);
    url.searchParams.set("what", q);
    url.searchParams.set("where", WHERE);
    url.searchParams.set("max_days_old", DAYS);
    url.searchParams.set("sort_by", "date");
    const r = await fetch(url.toString());
    if (!r.ok) throw new Error(`Adzuna ${r.status} ${await r.text()}`);
    const data = await r.json();
    return data.results || [];
  };

  const hourly = (a) => (a && !isNaN(a) ? a / 2080 : null);

  const toRow = (j) => {
    // midpoint hourly if both exist, else whichever exists
    const loH = hourly(j.salary_min);
    const hiH = hourly(j.salary_max);
    const midpoint =
      loH && hiH ? (loH + hiH) / 2 :
      hiH ? hiH :
      loH ? loH : null;

    return {
      // existing columns in your table:
      title: j.title || null,
      company: j.company?.display_name || null,
      location: j.location?.display_name || null,
      description: j.description || null,
      apply_link: j.redirect_url || null,
      is_active: true,
      expiration_date: null, // unknown from Adzuna
      industry: j.category?.label || null,
      wage: midpoint, // hourly USD (midpoint)
      // new columns we added:
      source: "adzuna",
      external_id: j.id,
      created_at_external: j.created || j.created_at || null,
      state: "NJ",
      county: "Mercer",
      ingested_at: new Date().toISOString()
    };
  };

  try {
    // fetch all personas
    const all = [];
    for (const q of QUERIES) all.push(...(await fetchAdzuna(q)));

    // dedupe by external_id
    const seen = new Set();
    const rows = [];
    for (const j of all) {
      if (!j?.id || seen.has(j.id)) continue;
      seen.add(j.id);
      rows.push(toRow(j));
    }

    // UPSERT into your table by (source, external_id)
    const url = `${SUPABASE_URL}/rest/v1/jobs?on_conflict=source,external_id`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates"
      },
      body: JSON.stringify(rows)
    });
    if (!r.ok) throw new Error(`Supabase upsert ${r.status} ${await r.text()}`);

    return res.status(200).json({ message: "Ingest complete", fetched: all.length, upserted_unique: rows.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}

