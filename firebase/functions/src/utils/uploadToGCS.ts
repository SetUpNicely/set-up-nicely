// ✅ Upload a file to GCS
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

const storage = new Storage();
const BUCKET_NAME = 'set-up-nicely-flatfiles'; // Replace with your actual GCS bucket name

export async function uploadToGCS(localPath: string, destinationPath: string) {
  try {
    const bucket = storage.bucket(BUCKET_NAME);
    await bucket.upload(localPath, {
      destination: destinationPath,
      gzip: false,
    });
    console.log(`✅ Uploaded to GCS: ${destinationPath}`);
  } catch (error) {
    console.error(`❌ Failed to upload to GCS: ${destinationPath}`, error);
    throw error;
  }
}
