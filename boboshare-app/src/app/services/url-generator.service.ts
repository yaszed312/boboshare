import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UrlGeneratorService {

  constructor() {}

  generateShareUrl(fileId: string): string {
    // In a real app, this would be your actual domain
    const baseUrl = window.location.origin;
    return `${baseUrl}/view/${fileId}`;
  }

  generateShortUrl(fileId: string): string {
    // Generate a shorter URL for easier sharing
    // In a real app, you might use a URL shortening service
    const shortId = this.generateShortId(fileId);
    const baseUrl = window.location.origin;
    return `${baseUrl}/s/${shortId}`;
  }

  private generateShortId(fileId: string): string {
    // Create a shorter version of the file ID for URL shortening
    // This is a simple implementation - in production you'd use a proper URL shortening service
    return fileId.substring(0, 8);
  }

  extractFileIdFromUrl(url: string): string | null {
    // Extract file ID from a share URL
    const match = url.match(/\/view\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  extractShortIdFromUrl(url: string): string | null {
    // Extract short ID from a shortened URL
    const match = url.match(/\/s\/([^\/]+)$/);
    return match ? match[1] : null;
  }
}
