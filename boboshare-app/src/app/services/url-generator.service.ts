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

  generateCollectionShareUrl(collectionId: string): string {
    // Generate a URL for sharing an entire collection
    const baseUrl = window.location.origin;
    return `${baseUrl}/collection/${collectionId}`;
  }

  generateShortUrl(fileId: string): string {
    // Generate a shorter URL for easier sharing
    // In a real app, you might use a URL shortening service
    const shortId = this.generateShortId(fileId);
    const baseUrl = window.location.origin;
    return `${baseUrl}/s/${shortId}`;
  }

  generateShortCollectionUrl(collectionId: string): string {
    // Generate a shorter URL for collections
    const shortId = this.generateShortId(collectionId);
    const baseUrl = window.location.origin;
    return `${baseUrl}/c/${shortId}`;
  }

  private generateShortId(id: string): string {
    // Create a shorter version of the ID for URL shortening
    // This is a simple implementation - in production you'd use a proper URL shortening service
    return id.substring(0, 8);
  }

  extractFileIdFromUrl(url: string): string | null {
    // Extract file ID from a share URL
    const match = url.match(/\/view\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  extractCollectionIdFromUrl(url: string): string | null {
    // Extract collection ID from a collection share URL
    const match = url.match(/\/collection\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  extractShortIdFromUrl(url: string): string | null {
    // Extract short ID from a shortened URL
    const match = url.match(/\/s\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  extractShortCollectionIdFromUrl(url: string): string | null {
    // Extract short collection ID from a shortened collection URL
    const match = url.match(/\/c\/([^\/]+)$/);
    return match ? match[1] : null;
  }
}
