import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MediaService, UploadResult } from '../../services/media.service';
import { UrlGeneratorService } from '../../services/url-generator.service';

type FilterType = 'all' | 'images' | 'videos';
type SortType = 'newest' | 'oldest' | 'name' | 'size';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gallery.component.html',
  styleUrl: './gallery.component.scss'
})
export class GalleryComponent implements OnInit {
  allFiles: UploadResult[] = [];
  filteredFiles: UploadResult[] = [];
  currentFilter: FilterType = 'all';
  currentSort: SortType = 'newest';
  showShareModal = false;
  selectedFile: UploadResult | null = null;

  constructor(
    private mediaService: MediaService,
    private urlGeneratorService: UrlGeneratorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFiles();
  }

  loadFiles(): void {
    this.allFiles = this.mediaService.getAllFiles();
    this.applyFilterAndSort();
  }

  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.applyFilterAndSort();
  }

  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.currentSort = target.value as SortType;
    this.applyFilterAndSort();
  }

  private applyFilterAndSort(): void {
    // Apply filter
    let filtered = this.allFiles;
    if (this.currentFilter === 'images') {
      filtered = this.allFiles.filter(file => file.type === 'image' || file.type.startsWith('image/'));
    } else if (this.currentFilter === 'videos') {
      filtered = this.allFiles.filter(file => file.type === 'video' || file.type.startsWith('video/'));
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (this.currentSort) {
        case 'newest':
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case 'oldest':
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'size':
          return b.size - a.size;
        default:
          return 0;
      }
    });

    this.filteredFiles = filtered;
  }

  viewFile(file: UploadResult): void {
    this.router.navigate(['/view', file.id]);
  }

  shareFile(file: UploadResult, event: Event): void {
    event.stopPropagation();
    this.selectedFile = {
      ...file,
      shareUrl: this.urlGeneratorService.generateShareUrl(file.id)
    };
    this.showShareModal = true;
  }

  deleteFile(file: UploadResult, event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      this.mediaService.deleteFile(file.id);
      this.loadFiles();
    }
  }

  closeShareModal(): void {
    this.showShareModal = false;
    this.selectedFile = null;
  }

  async copyShareUrl(): Promise<void> {
    if (this.selectedFile?.shareUrl) {
      try {
        await navigator.clipboard.writeText(this.selectedFile.shareUrl);
        // In a real app, you'd show a success message
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
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
}
