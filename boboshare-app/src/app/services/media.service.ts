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
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private uploadedFiles: UploadResult[] = [];

  constructor() {}

  uploadFile(file: File): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      // Simulate file upload delay
      setTimeout(() => {
        try {
          // Generate a unique ID for the file
          const id = this.generateUniqueId();
          
          // Create a mock URL (in a real app, this would be the actual uploaded file URL)
          const url = URL.createObjectURL(file);
          
          const result: UploadResult = {
            id,
            url,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date()
          };
          
          // Store the file info (in a real app, this would be saved to a database)
          this.uploadedFiles.push(result);
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, 2000); // Simulate 2-second upload time
    });
  }

  getFileById(id: string): UploadResult | undefined {
    return this.uploadedFiles.find(file => file.id === id);
  }

  getAllFiles(): UploadResult[] {
    return [...this.uploadedFiles];
  }

  deleteFile(id: string): boolean {
    const index = this.uploadedFiles.findIndex(file => file.id === id);
    if (index !== -1) {
      this.uploadedFiles.splice(index, 1);
      return true;
    }
    return false;
  }

  private generateUniqueId(): string {
    // Generate a simple unique ID (in a real app, you might use UUID)
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
