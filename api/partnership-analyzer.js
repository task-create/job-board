// /api/partnership-analyzer.js
async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8') || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const start = Date.now();
  try {
    const { companyName = '', companyLocations = '' } = await readJsonBody(req);

    // Input validation (avoid throwing later)
    const cName = (companyName || '').toString().trim();
    const cLocs = (companyLocations || '').toString().trim();

    // TODO: plug real LLM / data calls here. For now, keep it deterministic.
    const payload = {
      partnershipRating: 'Medium',
      ratingJustification: cName
        ? `Recent activity and postings around ${cLocs || 'Mercer County'} suggest ${cName} is a viable outreach target.`
        : `Based on recent postings in ${cLocs || 'Mercer County'}, this employer looks viable for outreach.`,
      companyValues: cName
        ? `${cName} emphasizes reliability, service, and shift coverage.`
        : `Employer emphasizes reliability, service, and shift coverage.`,
      contacts: [], // leave empty; your UI handles this
      draftEmail:
`Subject: Partnering to hire trained candidates in Mercer County

Hello Hiring Team,

I’m (YOUR NAME) from TASK Employment Services. We prepare job-ready candidates (ServSafe, SORA, forklift, soft skills) and can pre-screen for reliability, schedule fit, and transit access.

If you’re open, I’d love to share a 10–minute overview and send a short list of candidates for ${cName || 'your'} current roles.



    };

    // Simulate compute time to be realistic but safe
    await new Promise(r => setTimeout(r, 50));

    res.status(200).json({ ok: true, ms: Date.now() - start, ...payload });
  } catch (err) {
    // NEVER throw raw errors to client; send a soft fallback instead of 500
    console.error('partnership-analyzer fatal:', err);
    res.status(200).json({
      ok: false,
      note: 'fallback',
      message: 'Analyzer encountered an issue; returning a safe fallback.',
      partnershipRating: 'Low',
      ratingJustification: 'Automatic fallback. Please try again.',
      companyValues: 'N/A',
      contacts: [],
      draftEmail:
`Subject: Quick intro — TASK candidates

Hello Hiring Team,

I’m Sean from TASK Employment Services. We support employers with pre-screened candidates for entry-level roles across Mercer County.

Could we set up a brief intro call this week?

Best,
Sean`
    });
  }
};
