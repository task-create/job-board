// /api/partnership-analyzer.js
// Vercel Node Serverless Function (CommonJS)

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8') || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = async function handler(req, res) {
  // --- CORS headers (preflight + actual) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const t0 = Date.now();

  try {
    const { companyName = '', companyLocations = '' } = await readJsonBody(req);
    const cName = String(companyName || '').trim();
    const cLocs = String(companyLocations || '').trim();

    // ---- Stub logic (replace with real analysis if desired) ----
    // You can call LLMs, scrape career pages, or query your DB here.
    const partnershipRating = cName ? 'Medium' : 'Low';
    const ratingJustification = cName
      ? `Recent postings around ${cLocs || 'Mercer County'} suggest ${cName} may be a viable outreach target.`
      : `Based on recent postings in ${cLocs || 'Mercer County'}, this employer category could be viable, but validation is recommended.`;

    const companyValues = cName
      ? `${cName} appears to emphasize reliability, service, and shift coverage.`
      : `Employer emphasis typically includes reliability, service, and shift coverage.`;

    // Neutral email draft — no personal info
    const draftEmail = `Subject: Local hiring partnership inquiry

Hello Hiring Team,

We support jobseekers in Mercer County and can share pre-screened candidates for entry-level roles. We can also align on shift coverage, transit access, and basic certifications (e.g., food safety, SORA, forklift).

If helpful, we can send a brief overview and a small candidate slate aligned to your current openings. Would a 10-minute intro be convenient this week?

Best regards`;

    const payload = {
      ok: true,
      ms: Date.now() - t0,
      partnershipRating,
      ratingJustification,
      companyValues,
      contacts: [], // leave empty unless you have verified names
      draftEmail
    };

    return res.status(200).json(payload);
  } catch (err) {
    // Graceful fallback (still 200)
    console.error('partnership-analyzer fatal:', err);
    return res.status(200).json({
      ok: false,
      note: 'fallback',
      message: 'Analyzer encountered an issue; returning a safe fallback.',
      partnershipRating: 'Low',
      ratingJustification: 'Automatic fallback. Please try again.',
      companyValues: 'N/A',
      contacts: [],
      draftEmail: `Subject: Local hiring partnership inquiry

Hello Hiring Team,

We support jobseekers in Mercer County and can share pre-screened candidates for entry-level roles. We can also align on shift coverage, transit access, and basic certifications.

If helpful, we can send a brief overview and a small candidate slate aligned to your current openings. Would a short intro this week be convenient?

Best regards`
    });
  }
};
