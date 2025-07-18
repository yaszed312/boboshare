import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CollectionService, Collection } from '../../services/collection.service';
import { MediaService, UploadResult } from '../../services/media.service';
import { UrlGeneratorService } from '../../services/url-generator.service';

@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './collection.component.html',
  styleUrl: './collection.component.scss'
})
export class CollectionComponent implements OnInit {
  collections: Collection[] = [];
  newCollectionName: string = '';
  newCollectionDescription: string = '';
  showShareModal = false;
  selectedCollection: Collection | null = null;

  constructor(
    private collectionService: CollectionService,
    private mediaService: MediaService,
    private urlGeneratorService: UrlGeneratorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCollections();
  }

  loadCollections(): void {
    this.collections = this.collectionService.getAllCollections();
  }

  createCollection(): void {
    if (this.newCollectionName.trim()) {
      const collection = this.collectionService.createCollection(
        this.newCollectionName.trim(),
        this.newCollectionDescription.trim() || undefined
      );
      
      // Generate share URL for the collection
      collection.shareUrl = this.urlGeneratorService.generateCollectionShareUrl(collection.id);
      
      this.newCollectionName = '';
      this.newCollectionDescription = '';
      this.loadCollections();
    }
  }

  shareCollection(collection: Collection): void {
    this.selectedCollection = {
      ...collection,
      shareUrl: this.urlGeneratorService.generateCollectionShareUrl(collection.id)
    };
    this.showShareModal = true;
  }

  editCollection(collection: Collection): void {
    // In a real app, you'd open an edit modal or navigate to an edit page
    console.log('Edit collection:', collection);
  }

  deleteCollection(collection: Collection): void {
    if (confirm(`Are you sure you want to delete "${collection.name}"?`)) {
      this.collectionService.deleteCollection(collection.id);
      this.loadCollections();
    }
  }

  addFilesToCollection(collection: Collection): void {
    // Navigate to gallery to select files
    this.router.navigate(['/gallery'], { 
      queryParams: { 
        addToCollection: collection.id,
        collectionName: collection.name 
      } 
    });
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.selectedCollection = null;
  }

  async copyShareUrl(): Promise<void> {
    if (this.selectedCollection?.shareUrl) {
      try {
        await navigator.clipboard.writeText(this.selectedCollection.shareUrl);
        // In a real app, you'd show a success message
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }

  shareToFacebook(): void {
    if (this.selectedCollection?.shareUrl) {
      const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.selectedCollection.shareUrl)}`;
      window.open(url, '_blank', 'width=600,height=400');
    }
  }

  shareToTwitter(): void {
    if (this.selectedCollection) {
      const text = `Check out this collection: ${this.selectedCollection.name}`;
      const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.selectedCollection.shareUrl || '')}`;
      window.open(url, '_blank', 'width=600,height=400');
    }
  }

  shareToWhatsApp(): void {
    if (this.selectedCollection) {
      const text = `Check out this collection: ${this.selectedCollection.name} ${this.selectedCollection.shareUrl}`;
      const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }
}
