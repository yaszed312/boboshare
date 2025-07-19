import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface UploadResult {
  id: string;
  url: string;
  shareUrl?: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  isLargeFile?: boolean; // Flag for files stored in IndexedDB
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private uploadedFiles: UploadResult[] = [];
  private readonly STORAGE_KEY = 'boboshare_files';
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'BoboshareDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'largeFiles';

  constructor() {
    this.loadFilesFromStorage();
    // Only initialize IndexedDB in browser environment
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      this.initIndexedDB();
    }
  }

  private loadFilesFromStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.uploadedFiles = parsed.map((file: any) => ({
          ...file,
          uploadedAt: new Date(file.uploadedAt)
        }));
      }
    } catch (error) {
      console.error('Error loading files from storage:', error);
      this.uploadedFiles = [];
    }
  }

  private saveFilesToStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      // Check if data is too large for localStorage
      const dataToStore = JSON.stringify(this.uploadedFiles);
      const dataSize = new Blob([dataToStore]).size;
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      
      if (dataSize > maxSize) {
        console.warn('Media data too large for localStorage, truncating...');
        // Keep only the most recent files
        this.uploadedFiles = this.uploadedFiles
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(0, 20); // Keep only 20 most recent files
        
        // Try again with reduced data
        const reducedData = JSON.stringify(this.uploadedFiles);
        localStorage.setItem(this.STORAGE_KEY, reducedData);
      } else {
        localStorage.setItem(this.STORAGE_KEY, dataToStore);
      }
    } catch (error) {
      console.error('Error saving files to storage:', error);
      
      // If quota exceeded, try to clear some space
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old data...');
        this.clearOldData();
        
        // Try to save again with reduced data
        try {
          const reducedData = JSON.stringify(this.uploadedFiles.slice(0, 10)); // Keep only 10 most recent
          localStorage.setItem(this.STORAGE_KEY, reducedData);
        } catch (retryError) {
          console.error('Failed to save even after clearing old data:', retryError);
        }
      }
    }
  }

  private clearOldData(): void {
    try {
      // Clear old files
      this.uploadedFiles = this.uploadedFiles
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
        .slice(0, 5); // Keep only 5 most recent files
      
      // Clear some localStorage space
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('boboshare_') && key !== this.STORAGE_KEY) {
          keysToRemove.push(key);
        }
      }
      
      // Remove old data
      keysToRemove.slice(0, 5).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  }

  private async initIndexedDB(): Promise<void> {
    // Check if we're in a browser environment with IndexedDB support
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return;
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  private async storeLargeFile(id: string, blob: Blob): Promise<void> {
    if (!this.db) {
      await this.initIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put({ id, data: blob });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getLargeFile(id: string): Promise<Blob | null> {
    if (!this.db) {
      await this.initIndexedDB();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async uploadFile(file: File, fileUrl?: string): Promise<UploadResult> {
    console.log('=== DEBUG: uploadFile ===');
    console.log('File:', file);
    console.log('File size:', file.size);
    console.log('File URL provided:', !!fileUrl);
    
    return new Promise(async (resolve, reject) => {
      // Simulate file upload delay
      setTimeout(async () => {
        try {
          // Generate a unique ID for the file
          const id = this.generateUniqueId();
          console.log('Generated file ID:', id);
          
          let url: string;
          let isLargeFile = false;
          
          // For large videos (>10MB), store in IndexedDB
          if (file.type.startsWith('video/') && file.size > 10 * 1024 * 1024) {
            console.log('Large video detected, storing in IndexedDB...');
            await this.storeLargeFile(id, file);
            url = `indexeddb://${id}`; // Custom URL scheme for IndexedDB files
            isLargeFile = true;
          } else {
            // Use provided file URL or create blob URL as fallback
            url = fileUrl || URL.createObjectURL(file);
          }
          
          console.log('File URL:', url.substring(0, 50) + '...');
          
          const result: UploadResult = {
            id,
            url,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date(),
            isLargeFile
          };
          
          console.log('Created upload result:', result);
          
          // Store the file info (in a real app, this would be saved to a database)
          this.uploadedFiles.push(result);
          this.saveFilesToStorage();
          
          console.log('Total files in storage:', this.uploadedFiles.length);
          console.log('=== END DEBUG ===');
          
          resolve(result);
        } catch (error) {
          console.error('Upload error:', error);
          reject(error);
        }
      }, 2000); // Simulate 2-second upload time
    });
  }

  async getFileById(id: string): Promise<UploadResult | undefined> {
    console.log('=== DEBUG: getFileById ===');
    console.log('Looking for file ID:', id);
    console.log('Available files:', this.uploadedFiles.map(f => ({ id: f.id, name: f.name, isLargeFile: f.isLargeFile })));
    
    const file = this.uploadedFiles.find(file => file.id === id);
    console.log('Found file:', file);
    
    // If it's a large file, get the actual blob from IndexedDB
    if (file && file.isLargeFile) {
      console.log('Large file detected, retrieving from IndexedDB...');
      const blob = await this.getLargeFile(id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        file.url = url;
        console.log('Retrieved large file from IndexedDB');
      }
    }
    
    console.log('=== END DEBUG ===');
    return file;
  }

  getAllFiles(): UploadResult[] {
    return [...this.uploadedFiles];
  }

  deleteFile(id: string): boolean {
    const index = this.uploadedFiles.findIndex(file => file.id === id);
    if (index !== -1) {
      this.uploadedFiles.splice(index, 1);
      this.saveFilesToStorage();
      return true;
    }
    return false;
  }

  private generateUniqueId(): string {
    // Generate a simple unique ID (in a real app, you might use UUID)
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
