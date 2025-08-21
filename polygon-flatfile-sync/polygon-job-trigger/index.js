const { google } = require('googleapis');

exports.runJob = async (message, context) => {
  console.log('📨 Pub/Sub message received. Triggering Cloud Run Job...');

  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const run = google.run({
    version: 'v2',
    auth, // 👈 This attaches the authorized client to the API
  });

  const jobName = 'projects/set-up-nicely-v1/locations/us-central1/jobs/polygon-flatfile-sync';

  try {
    const res = await run.projects.locations.jobs.run({
      name: jobName,
      requestBody: {},
    });

    console.log(`✅ Job triggered successfully: ${res.data.name}`);
  } catch (error) {
    console.error('🔥 Failed to trigger job:', error.message || error);
    throw error;
  }
};
