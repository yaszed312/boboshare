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
  type: 'image' | 'video';
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
    console.log('UploadComponent initialized');
    console.log('Initial autoCollectionUrl:', this.autoCollectionUrl);
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

    console.log('Starting upload process...');
    this.isUploading = true;
    this.uploadResults = [];
    this.autoCollectionUrl = ''; // Reset auto collection URL

    try {
      console.log('Uploading files:', this.selectedFiles.length);
      
      for (const file of this.selectedFiles) {
        console.log('Uploading file:', file.name);
        const uploadResult = await this.mediaService.uploadFile(file);
        const shareUrl = this.urlGeneratorService.generateShareUrl(uploadResult.id);
        
        const result: UploadResult = {
          name: file.name,
          url: uploadResult.url,
          shareUrl: shareUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        };
        
        this.uploadResults.push(result);
        console.log('File uploaded successfully:', result);
      }
      
      console.log('All files uploaded. Generating auto collection URL...');
      // Generate auto collection URL after all files are uploaded
      this.generateAutoCollectionUrl();
      
      console.log('Upload process completed successfully');
    } catch (error) {
      console.error('Upload failed:', error);
      // Even if upload fails, try to generate a collection URL for the files we have
      if (this.uploadResults.length > 0) {
        console.log('Generating collection URL for uploaded files despite error...');
        this.generateAutoCollectionUrl();
      }
    } finally {
      this.isUploading = false;
      console.log('Final state - Upload Results:', this.uploadResults.length, 'Auto URL:', this.autoCollectionUrl);
    }
  }

  generateAutoCollectionUrl(): void {
    // Create a temporary collection ID for the uploaded files
    const tempCollectionId = 'temp_' + Date.now();
    this.autoCollectionUrl = this.urlGeneratorService.generateCollectionShareUrl(tempCollectionId);
    console.log('Generated auto collection URL:', this.autoCollectionUrl);
    console.log('Upload results length:', this.uploadResults.length);
  }

  forceGenerateUrl(): void {
    // Force generate a URL even if no files are uploaded (for testing)
    const tempCollectionId = 'force_' + Date.now();
    this.autoCollectionUrl = this.urlGeneratorService.generateCollectionShareUrl(tempCollectionId);
    console.log('Force generated URL:', this.autoCollectionUrl);
    alert('Force generated URL: ' + this.autoCollectionUrl);
  }

  testComponent(): void {
    console.log('=== Component Test ===');
    console.log('Selected Files:', this.selectedFiles.length);
    console.log('Upload Results:', this.uploadResults.length);
    console.log('Auto Collection URL:', this.autoCollectionUrl);
    console.log('Is Uploading:', this.isUploading);
    console.log('Collections:', this.collections.length);
    
    // Test URL generation
    const testUrl = this.urlGeneratorService.generateCollectionShareUrl('test_' + Date.now());
    console.log('Test URL generated:', testUrl);
    
    alert('Component test completed. Check console for details.');
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

  addAllToCollection(): void {
    if (!this.selectedCollectionId) return;

    // Add all uploaded files to the selected collection
    this.uploadResults.forEach(result => {
      const file = this.mediaService.getFileById(result.shareUrl.split('/').pop() || '');
      if (file) {
        this.collectionService.addFileToCollection(this.selectedCollectionId, file);
      }
    });

    this.selectedCollectionId = '';
    this.loadCollections();
    // In a real app, you'd show a success message
  }

  createAndAddToCollection(): void {
    if (!this.newCollectionName.trim()) return;

    // Create new collection
    const collection = this.collectionService.createCollection(this.newCollectionName.trim());
    
    // Add all uploaded files to the new collection
    this.uploadResults.forEach(result => {
      const file = this.mediaService.getFileById(result.shareUrl.split('/').pop() || '');
      if (file) {
        this.collectionService.addFileToCollection(collection.id, file);
      }
    });

    // Generate collection share URL
    const collectionShareUrl = this.urlGeneratorService.generateCollectionShareUrl(collection.id);
    
    // Show success message with collection URL
    alert(`Collection "${collection.name}" created successfully!\n\nCollection Share URL: ${collectionShareUrl}`);
    
    this.newCollectionName = '';
    this.loadCollections();
  }

  saveAutoCollection(): void {
    // Prompt user for collection name
    const collectionName = prompt('Enter a name for this collection:');
    if (!collectionName?.trim()) return;

    // Create new collection with the uploaded files
    const collection = this.collectionService.createCollection(collectionName.trim());
    
    // Add all uploaded files to the new collection
    this.uploadResults.forEach(result => {
      const file = this.mediaService.getFileById(result.shareUrl.split('/').pop() || '');
      if (file) {
        this.collectionService.addFileToCollection(collection.id, file);
      }
    });

    // Update the auto collection URL to use the new collection ID
    this.autoCollectionUrl = this.urlGeneratorService.generateCollectionShareUrl(collection.id);
    
    // Show success message
    alert(`Collection "${collection.name}" saved successfully!\n\nCollection Share URL: ${this.autoCollectionUrl}`);
    
    this.loadCollections();
  }
}
