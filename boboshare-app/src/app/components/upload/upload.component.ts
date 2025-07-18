import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { UrlGeneratorService } from '../../services/url-generator.service';

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
  imports: [CommonModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent {
  selectedFiles: FileWithPreview[] = [];
  isDragOver = false;
  isUploading = false;
  uploadResults: UploadResult[] = [];

  constructor(
    private mediaService: MediaService,
    private urlGeneratorService: UrlGeneratorService
  ) {}

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
  }

  async uploadFiles(): Promise<void> {
    if (this.selectedFiles.length === 0) return;

    this.isUploading = true;
    this.uploadResults = [];

    try {
      for (const file of this.selectedFiles) {
        const uploadResult = await this.mediaService.uploadFile(file);
        const shareUrl = this.urlGeneratorService.generateShareUrl(uploadResult.id);
        
        this.uploadResults.push({
          name: file.name,
          url: uploadResult.url,
          shareUrl: shareUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        });
      }
    } catch (error) {
      console.error('Upload failed:', error);
      // In a real app, you'd show a user-friendly error message
    } finally {
      this.isUploading = false;
    }
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // In a real app, you'd show a success message
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
}
