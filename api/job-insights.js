// /api/job-insights.js
// This function uses the Gemini API to provide analysis on a job posting.

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

  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ ok: false, error: 'API key is not configured on the server.' });
  }

  try {
    const { jobTitle, jobDescription } = await readJsonBody(req);

    if (!jobTitle) {
        return res.status(400).json({ ok: false, error: 'Missing required field: jobTitle.' });
    }

    const prompt = `
        You are a career coach for TASK (Trenton Area Soup Kitchen). Your goal is to provide simple, clear insights about a job to a client.
        
        Job Title: "${jobTitle}"
        Job Description: "${jobDescription}"

        Based on the job information, perform the following two tasks:
        1.  **A Day on the Job:** Write a short, simple paragraph describing what a typical day might look like in this role. Use plain language.
        2.  **Key Skills to Highlight:** Identify the top 3-4 most important skills or qualifications the employer is looking for. List them as simple bullet points.

        Return the output as a single JSON object with this exact structure:
        { 
          "dayInTheLife": "string",
          "keySkills": ["string", "string", "string"]
        }
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
    console.error('Job insights error:', err);
    res.status(500).json({ 
        ok: false, 
        message: 'Failed to generate job insights.',
        // Return a safe fallback
        dayInTheLife: "Could not generate a daily summary. Please review the job description for typical tasks and responsibilities.",
        keySkills: ["Review job description for key skills", "Reliability and punctuality", "Willingness to learn"]
    });
  }
}
