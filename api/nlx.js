// /api/nlx.js - Vercel serverless function
export default async function handler(req, res) {
  try {
    const {
      keyword = "forklift operator",
      location = "Trenton, NJ",
      radius = "25",
      sortColumns = "acquisitiondate",
      sortOrder = "DESC",
      startRecord = "0",
      pageSize = "50",
      days = "30",
    } = req.query;

    const userId = process.env.COS_USER_ID;      // <-- set in Vercel env
    const token  = process.env.COS_API_TOKEN;    // <-- set in Vercel env

    if (!userId || !token) {
      return res.status(500).json({ error: "Missing COS_USER_ID or COS_API_TOKEN" });
    }

    const base = "https://api.careeronestop.org/v2/jobsearch";
    const path = [
      encodeURIComponent(userId),
      encodeURIComponent(keyword),
      encodeURIComponent(location),
      encodeURIComponent(radius),
      encodeURIComponent(sortColumns),
      encodeURIComponent(sortOrder),
      encodeURIComponent(startRecord),
      encodeURIComponent(pageSize),
      encodeURIComponent(days),
    ].join("/");

    const url = `${base}/${path}?enableJobDescriptionSnippet=true`;

    const r = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      // Node fetch follows redirects from de.jobsyn.org fine
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({ error: "COS upstream error", details: text });
    }

    const data = await r.json();

    // Optional NJ filter guard (keeps only NJ)
    const jobs = Array.isArray(data?.Jobs) ? data.Jobs.filter(j =>
      /\bNJ\b/.test((j.Location || "").split(",").pop()?.trim() || "")
    ) : [];

    // CORS for your front end
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();

    return res.status(200).json({ JobCount: jobs.length, Jobs: jobs });
  } catch (err) {
    return res.status(500).json({ error: "Proxy failure", details: String(err) });
  }
}
