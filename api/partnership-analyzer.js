// /api/partnership-analyzer.js
// This function uses Gemini to analyze a potential employer partner.

export default async function handler(req, res) {
  // Set CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle the browser's preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key is not configured.' });
  }

  try {
    const { companyName, companyLocations } = req.body;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    const emailExample = `Hello Hiring Team,\n\nI’m Sean from TASK Employment Services. We prepare job-ready candidates (servsafe, SORA, forklift, and soft skills) and can pre-screen for reliability, schedule fit, and transit access.\n\nIf you’re open, I’d love to share a 10–minute overview and send a short list of candidates for your current roles.\n\nBest,\nSean Ford\nTASK Employment Services`;
    const prompt = `You are a partnership research assistant for TASK, a non-profit focused on workforce development in Mercer County, NJ. Your task is to analyze a potential employer partner. Company Name: "${companyName}". Known Hiring Locations: "${companyLocations}". Perform these actions: 1. Search the web for this company to find potential contacts (HR, Talent Acquisition) and summarize its mission/values. 2. Rate its partnership potential as "High", "Medium", or "Low" with a brief justification. 3. Draft a personalized outreach email based on the provided example. Return a single JSON object with this structure: { "contacts": [{ "name": "string or null", "title": "string or null" }], "companyValues": "string", "partnershipRating": "string", "ratingJustification": "string", "draftEmail": "string" } Email Example for style: ${emailExample}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ "google_search": {} }],
        generationConfig: { responseMimeType: "application/json" },
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error: ${errorText}`);
    }

    const result = await response.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    const data = JSON.parse(jsonText);
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('Partnership Analyzer error:', error);
    return res.status(500).json({ error: 'Failed to analyze partnership.' });
  }
}

