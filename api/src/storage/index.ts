import { LocalStorageProvider } from './local';
import { GCSStorageProvider } from './gcp';
import { config } from '../config';

export interface StorageProvider {
  save(file: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(path: string): Promise<void>;
}

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const driver = config.storageDriver;
    if (driver === 'gcs') {
      storageInstance = new GCSStorageProvider();
    } else {
      storageInstance = new LocalStorageProvider();
    }
  }
  return storageInstance;
}
