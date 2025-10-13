// /api/job-assistant.js
// This is a secure serverless function that acts as a proxy to the Gemini API.
// The front-end calls this endpoint, which then adds the secret API key and calls Google.

export default async function handler(req, res) {
    // Allow requests from your Vercel deployment URL
    res.setHeader('Access-Control-Allow-Origin', 'https://job-board-assistant.vercel.app');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }

    const { title, description } = req.body;
    if (!title || !description) {
        return res.status(400).json({ error: 'Job title and description are required.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;
    
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

    try {
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Gemini API Error:', errorText);
            throw new Error(`Gemini API Error: ${geminiResponse.status}`);
        }

        const result = await geminiResponse.json();
        const jsonText = result.candidates[0].content.parts[0].text;
        const data = JSON.parse(jsonText);

        return res.status(200).json(data);

    } catch (error) {
        console.error("Failed to get job assistant insights:", error);
        return res.status(500).json({ error: 'Failed to communicate with the AI assistant.' });
    }
}
