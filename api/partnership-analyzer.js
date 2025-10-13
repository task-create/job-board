// /api/partnership-analyzer.js
// This secure serverless function researches a company and drafts an outreach email.
// It uses the Gemini API with Google Search grounding.

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

    const { companyName, companyLocations } = req.body;
    if (!companyName) {
        return res.status(400).json({ error: 'Company name is required.' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${geminiApiKey}`;
    
    const emailExample1 = `Hello,\\n\\nI am Sean Ford, the Workforce Development Coordinator at the Trenton Area Soup Kitchen (TASK). I wanted to reach out to discuss a unique partnership opportunity that could bring significant value to both TASK and your company.\\n\\nAt TASK, we are dedicated to empowering individuals through programs designed to improve employability and self-sufficiency. One of our most impactful initiatives is the Emilio Culinary Academy, a 10-week culinary training program. The Academy provides hands-on experience in essential kitchen skills—from knife skills and ingredient ordering to basic baking and sanitation. Graduates also earn a ServSafe certification, equipping them with the credentials and practical experience to succeed in professional culinary environments.\\n\\nPartnering with TASK could provide your company with a pipeline of motivated, certified, and well-prepared individuals ready to contribute to your team. By collaborating, we can help foster the local talent pool, support the community, and bring additional qualified staff into your establishments.\\n\\nI would love the opportunity to discuss how we could build a mutually beneficial partnership. Please let me know if you’d be open to connecting at your convenience.\\n\\nThank you for your time and consideration.`;
    const emailExample2 = `Good Morning,\\n\\nMy name is Sean Ford, and I am the Workforce Development Coordinator at the Trenton Area Soup Kitchen. I am reaching out to you because we have several skilled and motivated individuals who are currently seeking employment opportunities. I wanted to see if your company has any openings where their skills might be a good fit.\\n\\nOur patrons come from diverse backgrounds and possess various skills, including customer service, housekeeping, sanitation, and manual labor. We also provide job readiness training to ensure they are well-prepared for the workforce. \\n\\nIf you have any current or upcoming job openings that could benefit from these skilled individuals, I would love to discuss this further. Please let me know the best way to proceed, whether sending over resumes for your review or arranging a time to discuss how we can collaborate.\\n\\nThank you for considering this opportunity to support our community while meeting your staffing needs. I look forward to the possibility of working together.`;

    const prompt = `
        You are a partnership research assistant for the Trenton Area Soup Kitchen (TASK), a non-profit focused on workforce development.
        Your task is to analyze a potential employer partner.
        
        Company Name: "${companyName}"
        Known Hiring Locations: "${companyLocations}"

        Perform the following actions:
        1.  Search the web for this company. Find potential contacts in HR, Talent Acquisition, or management, especially on LinkedIn.
        2.  Analyze the company's official website to understand its mission, values, and any community involvement initiatives.
        3.  Based on its values and industry, rate its potential as a hiring partner for TASK on a scale of "High", "Medium", or "Low". Provide a brief justification for your rating.
        4.  Using the provided examples as a guide for tone and content, draft a personalized, plug-and-play outreach email to this company. The email should be addressed to a general contact if a specific one isn't found.

        Email examples for style guidance:
        --- EXAMPLE 1 ---
        ${emailExample1}
        --- EXAMPLE 2 ---
        ${emailExample2}
        ---

        Provide the output as a single JSON object with this exact structure:
        {
          "contacts": [
            { "name": "string or null", "title": "string or null" }
          ],
          "companyValues": "string",
          "partnershipRating": "string (High, Medium, or Low)",
          "ratingJustification": "string",
          "draftEmail": "string (formatted with newlines)"
        }`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ "google_search": {} }],
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
        console.error("Partnership analysis failed:", error);
        return res.status(500).json({ error: 'Failed to communicate with the AI analyzer.' });
    }
}
