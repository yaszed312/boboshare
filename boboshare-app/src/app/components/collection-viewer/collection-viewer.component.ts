import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CollectionService, Collection } from '../../services/collection.service';
import { MediaService, UploadResult } from '../../services/media.service';
import { UrlGeneratorService } from '../../services/url-generator.service';

@Component({
  selector: 'app-collection-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './collection-viewer.component.html',
  styleUrl: './collection-viewer.component.scss'
})
export class CollectionViewerComponent implements OnInit {
  collection: Collection | null = null;
  collectionFiles: UploadResult[] = [];
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private collectionService: CollectionService,
    private mediaService: MediaService,
    public urlGeneratorService: UrlGeneratorService
  ) {}

  ngOnInit(): void {
    this.loadCollection();
  }

  loadCollection(): void {
    console.log('=== DEBUG: loadCollection ===');
    const collectionId = this.route.snapshot.paramMap.get('id');
    console.log('Loading collection with ID:', collectionId);
    
    if (!collectionId) {
      console.log('No collection ID found');
      this.error = true;
      this.loading = false;
      return;
    }

    // Try to load the collection
    const foundCollection = this.collectionService.getCollection(collectionId);
    console.log('Found collection:', foundCollection);
    
    if (!foundCollection) {
      console.log('Collection not found');
      this.error = true;
      this.loading = false;
      return;
    }

    this.collection = foundCollection;
    console.log('Collection files:', this.collection.files);

    // Load the actual file data for each file in the collection
    this.collectionFiles = this.collection.files.map(file => {
      console.log('Processing collection file:', file);
      return {
        ...file,
        shareUrl: this.urlGeneratorService.generateShareUrl(file.id)
      };
    });

    console.log('Final collection files:', this.collectionFiles);
    console.log('=== END DEBUG ===');
    this.loading = false;
  }

  downloadFile(file: UploadResult): void {
    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    
    // If the URL is a base64 data URL, we need to convert it to a blob
    if (file.url.startsWith('data:')) {
      // Convert base64 to blob
      const byteString = atob(file.url.split(',')[1]);
      const mimeString = file.url.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      link.href = URL.createObjectURL(blob);
    } else {
      link.href = file.url;
    }
    
    link.download = file.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadAllFiles(): void {
    // Download all files in the collection
    this.collectionFiles.forEach((file, index) => {
      setTimeout(() => {
        this.downloadFile(file);
      }, index * 500); // Stagger downloads by 500ms to avoid browser blocking
    });
  }

  viewFile(file: UploadResult): void {
    // Navigate to the individual file viewer
    this.router.navigate(['/view', file.id]);
  }

  shareCollection(): void {
    if (this.collection) {
      const shareUrl = this.urlGeneratorService.generateCollectionShareUrl(this.collection.id);
      if (navigator.share) {
        navigator.share({
          title: this.collection.name,
          text: `Check out this collection: ${this.collection.name}`,
          url: shareUrl
        });
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        alert('Collection URL copied to clipboard!');
      }
    }
  }

  copyShareUrl(): void {
    if (this.collection) {
      const shareUrl = this.urlGeneratorService.generateCollectionShareUrl(this.collection.id);
      navigator.clipboard.writeText(shareUrl);
      alert('Collection URL copied to clipboard!');
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  goBack(): void {
    this.router.navigate(['/upload']);
  }
} 