// /api/job-assistant.js
// This function uses Gemini to analyze a job description.

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
    const { title, description } = req.body;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;
    
    const prompt = `
        Based on the following job title and description, please provide a simple summary and three practice interview questions.
        Job Title: ${title}
        Description: ${description}
        Provide the output as a JSON object with this exact structure:
        { "summary": ["string", "string", "string"], "interviewQuestions": ["string", "string", "string"] }`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
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
    console.error('Job Assistant error:', error);
    return res.status(500).json({ error: 'Failed to get insights from AI assistant.' });
  }
}

