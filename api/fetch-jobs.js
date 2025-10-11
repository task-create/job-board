// This is a Vercel Serverless Function
// It will handle requests to /api/fetch-jobs

export default async function handler(request, response) {
  // 1. Get our secret API credentials from Vercel Environment Variables
  const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID;
  const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;

  // Check if the credentials are set, if not, return an error
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    return response.status(500).json({ error: "API credentials are not configured." });
  }

  // 2. Define the search parameters for the Adzuna API
  const country = 'us'; // Search in the United States
  const resultsPerPage = 20; // Get up to 20 results
  const location = 'Mercer County, New Jersey'; // Target location
  const maxDaysOld = 1; // Only get jobs posted in the last 24 hours

  // 3. Construct the full Adzuna API URL with our parameters
  const adzunaUrl = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
  adzunaUrl.searchParams.set('app_id', ADZUNA_APP_ID);
  adzunaUrl.searchParams.set('app_key', ADZUNA_API_KEY);
  adzunaUrl.searchParams.set('results_per_page', resultsPerPage);
  adzunaUrl.searchParams.set('where', location);
  adzunaUrl.searchParams.set('max_days_old', maxDaysOld);
  adzunaUrl.searchParams.set('sort_by', 'date'); // Sort by the newest jobs first

  try {
    // 4. Call the Adzuna API
    console.log(`Fetching jobs from: ${adzunaUrl}`);
    const apiResponse = await fetch(adzunaUrl.toString());

    // If the request to Adzuna was not successful, throw an error
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`Adzuna API Error: ${apiResponse.status} ${errorText}`);
    }

    // Parse the JSON data from the response
    const data = await apiResponse.json();

    // 5. Send the job results back as the response from our own API
    return response.status(200).json({
      message: `Successfully found ${data.results.length} new jobs in ${location}.`,
      jobs: data.results,
    });

  } catch (error) {
    // If anything goes wrong during the process, log the error and send a server error response
    console.error('Failed to fetch jobs:', error);
    return response.status(500).json({ error: 'Failed to fetch jobs from Adzuna.' });
  }
}
