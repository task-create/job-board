// Add near top:
const BAD_TITLE_WORDS = [
  "bitcoin","crypto","forex","nft","escort","adult",
  "fee required","training fee","wire transfer","deposit required"
];
const TRUSTED_HOSTS = new Set([
  // Keep this tight; expand as you learn what’s clean in your region
  "indeed.com","ziprecruiter.com","glassdoor.com","linkedin.com","adzuna.com"
]);
const MIN_REASONABLE_HOURLY = 12;   // NJ floor for entry-level
const MAX_REASONABLE_HOURLY = 60;   // sanity upper bound for “entry level”
const COUNTY = "Mercer";
const STATE  = "NJ";

function hostFromUrl(u) {
  try { return new URL(u).hostname.replace(/^www\./,''); } catch { return ""; }
}
function hasBadTitle(title="") {
  const t = title.toLowerCase();
  return BAD_TITLE_WORDS.some(w => t.includes(w));
}
function wageFromAnnual(a) {
  return (a && !isNaN(a)) ? a/2080 : null;
}
function plausibleHourly(h) {
  if (h == null) return true; // allow missing wage; we’ll display “—”
  return h >= MIN_REASONABLE_HOURLY && h <= MAX_REASONABLE_HOURLY;
}
function inMercerNJ(loc="") {
  const L = loc.toLowerCase();
  return L.includes("mercer") || L.includes("trenton") || L.includes("hamilton")
      || L.includes("ewing") || L.includes("princeton") || L.includes("lawrence");
}

// Inside your toRow(j) (or equivalent) normalization:
function normalizeRow(j) {
  const loH = wageFromAnnual(j.salary_min);
  const hiH = wageFromAnnual(j.salary_max);
  const midpoint = loH && hiH ? (loH+hiH)/2 : (loH ?? hiH ?? null);

  const loc = j.location?.display_name || "";
  const url = j.redirect_url || null;
  const srcHost = hostFromUrl(url);

  const flagged = [];
  if (hasBadTitle(j.title || "")) flagged.push("bad_title_words");
  if (url && srcHost && !TRUSTED_HOSTS.has(srcHost)) flagged.push(`untrusted_source:${srcHost}`);
  if (!inMercerNJ(loc)) flagged.push("outside_mercer_hint");
  if (!plausibleHourly(midpoint)) flagged.push("implausible_wage");

  return {
    // your existing columns
    title: j.title || null,
    company: j.company?.display_name || null,
    location: loc || null,
    description: j.description || null,
    apply_link: url,
    is_active: true,
    expiration_date: null,
    industry: j.category?.label || null,
    wage: midpoint, // hourly (midpoint) if present; else null

    // provenance
    source: "adzuna",
    external_id: j.id,
    created_at_external: j.created || j.created_at || null,
    county: COUNTY,
    state: STATE,
    ingested_at: new Date().toISOString(),

    // review flags
    reviewed: false,
    approved: flagged.length === 0,  // auto-approve only clean rows
    flagged_reasons: flagged
  };
}
