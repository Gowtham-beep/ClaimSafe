import fs from 'fs';
import path from 'path';
import { StorageProvider } from './index';
import { config } from '../config';

export class LocalStorageProvider implements StorageProvider {
  async save(file: Buffer, filename: string, mimeType: string): Promise<string> {
    const storageDir = config.localStoragePath;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    const fullPath = path.join(storageDir, filename);
    await fs.promises.writeFile(fullPath, file);
    
    // returns relative path e.g., "uploads/<uuid>.pdf"
    const folder = path.basename(storageDir);
    return `${folder}/${filename}`;
  }

  async delete(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    const physicalPath = path.join(config.localStoragePath, filename);
    try {
      await fs.promises.unlink(physicalPath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return; // Do not throw if file not found
      }
      throw err;
    }
  }
}
