import { Storage } from '@google-cloud/storage';
import { config } from '../config';

// Initialize the GCP Cloud Storage client.
// It uses the GCP Project ID and key file path from the environment config.
const storage = new Storage({
  projectId: config.gcpProjectId,
  keyFilename: config.googleApplicationCredentials,
});

const bucket = storage.bucket(config.gcpBucketName);

/**
 * Uploads a policy PDF file to GCP Cloud Storage.
 * 
 * @param localFilePath The temporary local path where the file is stored
 * @param destinationName The name of the file in the bucket (e.g. policies/<policy_id>.pdf)
 * @returns The GCP Cloud Storage URI (gs://bucket/path)
 */
export async function uploadPDF(
  localFilePath: string,
  destinationName: string
): Promise<string> {
  // Skeleton: print upload metadata and return virtual path
  console.log(`[GCP Storage] Skeleton: Uploading ${localFilePath} to bucket ${config.gcpBucketName} as ${destinationName}`);
  return `gs://${config.gcpBucketName}/${destinationName}`;
}

/**
 * Deletes a policy PDF from GCP Cloud Storage (typically run by the TTL cleanup).
 * 
 * @param gcpPath The GCP Cloud Storage URI or object name to delete
 */
export async function deletePDF(gcpPath: string): Promise<void> {
  // Skeleton: print delete metadata
  console.log(`[GCP Storage] Skeleton: Deleting object ${gcpPath} from bucket ${config.gcpBucketName}`);
}

export { storage, bucket };
