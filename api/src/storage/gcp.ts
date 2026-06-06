import { Storage } from '@google-cloud/storage';
import { config } from '../config';
import { StorageProvider } from './index';

export class GCSStorageProvider implements StorageProvider {
  private storage: Storage | null = null;

  private getStorageClient(): Storage {
    if (!this.storage) {
      this.storage = new Storage({
        projectId: config.gcpProjectId,
        keyFilename: config.googleApplicationCredentials,
      });
    }
    return this.storage;
  }

  async save(file: Buffer, filename: string, mimeType: string): Promise<string> {
    const storageClient = this.getStorageClient();
    const bucket = storageClient.bucket(config.gcsBucketName);
    const gcsFile = bucket.file(`uploads/${filename}`);
    await gcsFile.save(file, {
      metadata: {
        contentType: mimeType,
      },
    });
    return `uploads/${filename}`;
  }

  async delete(path: string): Promise<void> {
    const storageClient = this.getStorageClient();
    const bucket = storageClient.bucket(config.gcsBucketName);
    const gcsFile = bucket.file(path);
    try {
      await gcsFile.delete();
    } catch (err: any) {
      if (err.code === 404 || err.status === 404 || err.message?.includes('Not Found')) {
        return;
      }
      throw err;
    }
  }
}
