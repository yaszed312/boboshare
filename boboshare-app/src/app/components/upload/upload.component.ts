import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import { UrlGeneratorService } from '../../services/url-generator.service';
import { CollectionService, Collection } from '../../services/collection.service';

interface FileWithPreview extends File {
  preview?: string;
}

interface UploadResult {
  name: string;
  url: string;
  shareUrl: string;
  type: string; // Accept MIME types like 'video/mp4', 'image/jpeg'
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent {
  selectedFiles: FileWithPreview[] = [];
  isDragOver = false;
  isUploading = false;
  uploadResults: UploadResult[] = [];
  collections: Collection[] = [];
  selectedCollectionId: string = '';
  newCollectionName: string = '';
  autoCollectionUrl: string = '';

  constructor(
    private mediaService: MediaService,
    private urlGeneratorService: UrlGeneratorService,
    private collectionService: CollectionService
  ) {
    this.loadCollections();
  }

  loadCollections(): void {
    this.collections = this.collectionService.getAllCollections();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.processFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files) {
      this.processFiles(Array.from(files));
    }
  }

  private processFiles(files: File[]): void {
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    validFiles.forEach(file => {
      const fileWithPreview = file as FileWithPreview;
      this.createPreview(fileWithPreview);
      this.selectedFiles.push(fileWithPreview);
    });
  }

  private createPreview(file: FileWithPreview): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      file.preview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  clearFiles(): void {
    this.selectedFiles = [];
    this.uploadResults = [];
    this.autoCollectionUrl = '';
  }

  async uploadFiles(): Promise<void> {
    if (this.selectedFiles.length === 0) return;

    this.isUploading = true;
    this.uploadResults = [];
    this.autoCollectionUrl = '';

    try {
      for (const file of this.selectedFiles) {
        let fileUrl: string;
        
        // For videos, use blob URL (large files will be handled by media service)
        if (file.type.startsWith('video/')) {
          fileUrl = URL.createObjectURL(file);
        } else {
          // For images, use base64
          fileUrl = await this.fileToBase64(file);
        }
        
        const uploadResult = await this.mediaService.uploadFile(file, fileUrl);
        const shareUrl = this.urlGeneratorService.generateShareUrl(uploadResult.id);
        
        const result: UploadResult = {
          name: file.name,
          url: fileUrl,
          shareUrl: shareUrl,
          type: file.type
        };
        
        this.uploadResults.push(result);
      }
      
      // Generate auto collection URL after all files are uploaded
      this.generateAutoCollectionUrl();
    } catch (error) {
      console.error('Upload failed:', error);
      // Even if upload fails, try to generate a collection URL for the files we have
      if (this.uploadResults.length > 0) {
        this.generateAutoCollectionUrl();
      }
    } finally {
      this.isUploading = false;
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  async generateAutoCollectionUrl(): Promise<void> {
    console.log('=== DEBUG: generateAutoCollectionUrl ===');
    console.log('uploadResults:', this.uploadResults);
    
    // Create a real collection with the uploaded files
    const collectionName = `Collection_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    const collection = this.collectionService.createCollection(collectionName);
    
    console.log('Created collection:', collection);
    
    // Add all uploaded files to the collection
    for (let i = 0; i < this.uploadResults.length; i++) {
      const result = this.uploadResults[i];
      console.log(`Processing file ${i + 1}:`, result);
      
      // Get the actual file from media service using the share URL
      const fileId = result.shareUrl.split('/').pop() || '';
      console.log('Extracted fileId:', fileId);
      
      const actualFile = await this.mediaService.getFileById(fileId);
      console.log('Found actual file:', actualFile);
      
      if (actualFile) {
        // Use the actual file data from media service
        console.log('Adding actual file to collection:', actualFile);
        this.collectionService.addFileToCollection(collection.id, actualFile);
      } else {
        // Fallback: create a file object with the data we have
        const fileForCollection: any = {
          id: fileId,
          name: result.name,
          url: result.url,
          type: result.type,
          size: 0,
          uploadedAt: new Date()
        };
        
        console.log('Adding fallback file to collection:', fileForCollection);
        this.collectionService.addFileToCollection(collection.id, fileForCollection);
      }
    }
    
    // Check the final collection state
    const finalCollection = this.collectionService.getCollection(collection.id);
    console.log('Final collection state:', finalCollection);
    
    // Generate the collection URL using the real collection ID
    this.autoCollectionUrl = this.urlGeneratorService.generateCollectionShareUrl(collection.id);
    console.log('Generated collection URL:', this.autoCollectionUrl);
    console.log('=== END DEBUG ===');
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // In a real app, you'd show a success message
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  addToCollection(result: UploadResult): void {
    // Navigate to collections page to add this file
    // In a real app, you'd show a modal to select collection
    console.log('Add to collection:', result);
  }

  async addAllToCollection(): Promise<void> {
    if (!this.selectedCollectionId) return;

    // Add all uploaded files to the selected collection
    for (const result of this.uploadResults) {
      const file = await this.mediaService.getFileById(result.shareUrl.split('/').pop() || '');
      if (file) {
        this.collectionService.addFileToCollection(this.selectedCollectionId, file);
      }
    }

    this.selectedCollectionId = '';
    this.loadCollections();
    // In a real app, you'd show a success message
  }

  async createAndAddToCollection(): Promise<void> {
    if (!this.newCollectionName.trim()) return;

    // Create new collection
    const collection = this.collectionService.createCollection(this.newCollectionName.trim());
    
    // Add all uploaded files to the new collection
    for (const result of this.uploadResults) {
      // Get the actual file from media service using the share URL
      const fileId = result.shareUrl.split('/').pop() || '';
      const actualFile = await this.mediaService.getFileById(fileId);
      
      if (actualFile) {
        // Use the actual file data from media service
        this.collectionService.addFileToCollection(collection.id, actualFile);
      } else {
        // Fallback: create a file object with the data we have
        const fileForCollection: any = {
          id: fileId,
          name: result.name,
          url: result.url,
          type: result.type,
          size: 0,
          uploadedAt: new Date()
        };
        
        this.collectionService.addFileToCollection(collection.id, fileForCollection);
      }
    }

    // Generate collection share URL
    const collectionShareUrl = this.urlGeneratorService.generateCollectionShareUrl(collection.id);
    
    // Show success message with collection URL
    alert(`Collection "${collection.name}" created successfully!\n\nCollection Share URL: ${collectionShareUrl}`);
    
    this.newCollectionName = '';
    this.loadCollections();
  }

  async saveAutoCollection(): Promise<void> {
    // Prompt user for collection name
    const collectionName = prompt('Enter a name for this collection:');
    if (!collectionName?.trim()) return;

    // Create new collection with the uploaded files
    const collection = this.collectionService.createCollection(collectionName.trim());
    
    // Add all uploaded files to the new collection
    for (const result of this.uploadResults) {
      // Get the actual file from media service using the share URL
      const fileId = result.shareUrl.split('/').pop() || '';
      const actualFile = await this.mediaService.getFileById(fileId);
      
      if (actualFile) {
        // Use the actual file data from media service
        this.collectionService.addFileToCollection(collection.id, actualFile);
      } else {
        // Fallback: create a file object with the data we have
        const fileForCollection: any = {
          id: fileId,
          name: result.name,
          url: result.url,
          type: result.type,
          size: 0,
          uploadedAt: new Date()
        };
        
        this.collectionService.addFileToCollection(collection.id, fileForCollection);
      }
    }

    // Update the auto collection URL to use the new collection ID
    this.autoCollectionUrl = this.urlGeneratorService.generateCollectionShareUrl(collection.id);
    
    // Show success message
    alert(`Collection "${collection.name}" saved successfully!\n\nCollection Share URL: ${this.autoCollectionUrl}`);
    
    this.loadCollections();
  }
}
