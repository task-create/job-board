// /api/career-counselor.js
// This function uses the Gemini API to suggest job titles based on user input.

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
  // CORS headers
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

  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ ok: false, error: 'API key is not configured on the server.' });
  }

  try {
    const { userInput } = await readJsonBody(req);
    if (!userInput) {
        return res.status(400).json({ ok: false, error: 'User input is missing.' });
    }

    const prompt = `
        Act as a career counselor for entry-level job seekers in Mercer County, NJ. 
        Based on the user's input of their skills, interests, or past work, suggest 5 specific job titles or search terms they could use to find local work.
        User input: "${userInput}"
        
        Return the output as a single JSON object with this exact structure: { "suggestions": ["string", "string", "string", "string", "string"] }
    `;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Gemini API Error:', errorBody);
        throw new Error(`Gemini API request failed with status ${response.status}`);
    }

    const result = await response.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    const data = JSON.parse(jsonText);

    res.status(200).json({ ok: true, ...data });

  } catch (err) {
    console.error('Career counselor error:', err);
    res.status(500).json({ 
        ok: false, 
        error: 'Failed to generate career suggestions.'
    });
  }
}
