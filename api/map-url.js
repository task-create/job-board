// /api/map-url.js
// This function securely generates a Google Maps embed URL with your API key.

async function readJsonBody(req) {
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8') || '{}';
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  // Set CORS headers for browser access and handle preflight requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const { GOOGLE_MAPS_API_KEY } = process.env;
  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API Key is not configured on the server.');
    // Return a fallback URL without a pin if the key is missing
    const { location } = await readJsonBody(req);
    const fallbackUrl = `https://maps.google.com/maps?q=${encodeURIComponent(location || 'Mercer County, NJ')}&output=embed`;
    return res.status(200).json({ ok: true, url: fallbackUrl });
  }

  try {
    const { location } = await readJsonBody(req);
    if (!location) {
        return res.status(400).json({ ok: false, error: 'Missing required field: location.' });
    }
    
    // Construct the secure Google Maps Embed URL
    const mapUrl = new URL('https://www.google.com/maps/embed/v1/place');
    mapUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    mapUrl.searchParams.set('q', location);

    res.status(200).json({ ok: true, url: mapUrl.toString() });

  } catch (err) {
    console.error('Map URL generator error:', err);
    res.status(500).json({ 
        ok: false, 
        error: 'Failed to generate map URL.'
    });
  }
}
