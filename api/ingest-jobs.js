// /api/ingest-jobs.js

export default async function handler(req, res) {
  try {
    // --- protect with a secret so only your cron/manual link can run it
    const CRON_SECRET = process.env.CRON_SECRET;
    if (!CRON_SECRET || req.query.secret !== CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // --- required env
    const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID;
    const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
    const SUPABASE_URL   = process.env.SUPABASE_URL;
    const SERVICE_KEY    = process.env.SUPABASE_SERVICE_KEY;

    if (!ADZUNA_APP_ID || !ADZUNA_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: "Missing required environment variables." });
    }

    // ─────────────────────────────────────────────────────────────
    // 1) SAFETY FILTERS + HELPERS  (← your block goes right here)
    // ─────────────────────────────────────────────────────────────
    const BAD_TITLE_WORDS = [
      "bitcoin","crypto","forex","nft","escort","adult",
      "fee required","training fee","wire transfer","deposit required"
    ];
    const TRUSTED_HOSTS = new Set([
      "indeed.com","ziprecruiter.com","glassdoor.com","linkedin.com","adzuna.com"
    ]);
    const MIN_REASONABLE_HOURLY = 12;   // NJ entry-level floor
    const MAX_REASONABLE_HOURLY = 60;   // sanity upper bound
    const COUNTY = "Mercer";
    const STATE  = "NJ";

    function hostFromUrl(u) {
      try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ""; }
    }
    function hasBadTitle(title = "") {
      const t = title.toLowerCase();
      return BAD_TITLE_WORDS.some(w => t.includes(w));
    }
    function wageFromAnnual(a) {
      return (a && !isNaN(a)) ? a / 2080 : null; // salary -> hourly
    }
    function plausibleHourly(h) {
      if (h == null) return true; // allow missing
      return h >= MIN_REASONABLE_HOURLY && h <= MAX_REASONABLE_HOURLY;
    }
    function inMercerNJ(loc = "") {
      const L = loc.toLowerCase();
      return (
        L.includes("mercer") || L.includes("trenton") || L.includes("hamilton") ||
        L.includes("ewing")  || L.includes("princeton") || L.includes("lawrence")
      );
    }

    // Normalize one Adzuna job into your jobs table columns
    function normalizeRow(j) {
      const loH = wageFromAnnual(j.salary_min);
      const hiH = wageFromAnnual(j.salary_max);
      const midpoint = loH && hiH ? (loH + hiH) / 2 : (loH ?? hiH ?? null);

      const loc = j.location?.display_name || "";
      const url = j.redirect_url || null;
      const srcHost = hostFromUrl(url);

      const flagged = [];
      if (hasBadTitle(j.title || ""))             flagged.push("bad_title_words");
      if (url && srcHost && !TRUSTED_HOSTS.has(srcHost)) flagged.push(`untrusted_source:${srcHost}`);
      if (!inMercerNJ(loc))                        flagged.push("outside_mercer_hint");
      if (!plausibleHourly(midpoint))              flagged.push("implausible_wage");

      // IMPORTANT: only include columns that exist in your table
      return {
        title: j.title || null,
        company: j.company?.display_name || null,
        location: loc || null,
        description: j.description || null,
        apply_link: url,
        is_active: true,
        expiration_date: null,
        industry: j.category?.label || null,
        wage: midpoint,               // hourly midpoint or null
        reviewed: false,              // staff hasn’t reviewed yet
        approved: flagged.length === 0 // auto-approve only clean rows
        // If you add columns later, you can extend here, e.g.:
        // created_at_external: j.created || j.created_at || null,
        // county: COUNTY, state: STATE,
        // flagged_reasons: flagged
      };
    }

    // ─────────────────────────────────────────────────────────────
    // 2) FETCH FROM ADZUNA (last 1–3 days, entry-level keywords)
    // ─────────────────────────────────────────────────────────────
    const country = "us";
    const resultsPerPage = 50;
    const maxDaysOld = 3;
    const keywords = 'warehouse OR healthcare OR manufacturing OR culinary OR retail OR "entry level"';
    const location = "Mercer County, New Jersey";

    const base = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    base.searchParams.set("app_id", ADZUNA_APP_ID);
    base.searchParams.set("app_key", ADZUNA_API_KEY);
    base.searchParams.set("results_per_page", resultsPerPage);
    base.searchParams.set("what", keywords);
    base.searchParams.set("where", location);
    base.searchParams.set("max_days_old", maxDaysOld);
    base.searchParams.set("sort_by", "date");

    const adzunaResp = await fetch(base.toString());
    if (!adzunaResp.ok) {
      const txt = await adzunaResp.text();
      throw new Error(`Adzuna error ${adzunaResp.status}: ${txt}`);
    }
    const data = await adzunaResp.json();
    const rawJobs = Array.isArray(data.results) ? data.results : [];

    // ─────────────────────────────────────────────────────────────
    // 3) TRANSFORM & UPSERT INTO public.jobs
    // ─────────────────────────────────────────────────────────────
    const rows = rawJobs.map(normalizeRow);

    // optional: drop rows missing apply_link (used for de-dupe)
    const cleaned = rows.filter(r => r.apply_link);

    // Upsert via PostgREST
    const upsertResp = await fetch(`${SUPABASE_URL}/rest/v1/jobs`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates" // upsert semantics
      },
      body: JSON.stringify(cleaned)
    });

    if (!upsertResp.ok) {
      const txt = await upsertResp.text();
      throw new Error(`Supabase upsert failed ${upsertResp.status}: ${txt}`);
    }

    return res.status(200).json({
      message: "Ingest complete",
      fetched: rawJobs.length,
      queued: cleaned.length
    });
  } catch (err) {
    console.error("ingest-jobs error:", err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
