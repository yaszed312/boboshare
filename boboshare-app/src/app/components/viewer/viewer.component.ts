import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaService, UploadResult } from '../../services/media.service';
import { UrlGeneratorService } from '../../services/url-generator.service';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewer.component.html',
  styleUrl: './viewer.component.scss'
})
export class ViewerComponent implements OnInit {
  file: UploadResult | null = null;
  shareUrl: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mediaService: MediaService,
    private urlGeneratorService: UrlGeneratorService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const fileId = params['id'];
      if (fileId) {
        this.loadFile(fileId);
      }
    });
  }

  private async loadFile(fileId: string): Promise<void> {
    this.file = await this.mediaService.getFileById(fileId) || null;
    if (this.file) {
      this.shareUrl = this.urlGeneratorService.generateShareUrl(fileId);
    }
  }

  goBack(): void {
    this.router.navigate(['/gallery']);
  }

  shareFile(): void {
    if (navigator.share && this.file) {
      navigator.share({
        title: this.file.name,
        text: 'Check out this media I shared!',
        url: this.shareUrl
      });
    } else {
      this.copyShareUrl();
    }
  }

  async copyShareUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl);
      // In a real app, you'd show a success message
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  downloadFile(): void {
    if (this.file) {
      const link = document.createElement('a');
      link.href = this.file.url;
      link.download = this.file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  toggleFullscreen(): void {
    const mediaElement = document.querySelector('.media-content') as HTMLElement;
    if (mediaElement) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mediaElement.requestFullscreen();
      }
    }
  }

  shareToFacebook(): void {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  shareToTwitter(): void {
    const text = `Check out this media I shared: ${this.file?.name}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(this.shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  }

  shareToWhatsApp(): void {
    const text = `Check out this media I shared: ${this.file?.name} ${this.shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }
}
