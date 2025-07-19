import { Injectable } from '@angular/core';
import { UploadResult } from './media.service';

export interface Collection {
  id: string;
  name: string;
  description?: string;
  files: UploadResult[];
  createdAt: Date;
  updatedAt: Date;
  shareUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private collections: Collection[] = [];
  private readonly STORAGE_KEY = 'boboshare_collections';

  constructor() {
    this.loadCollectionsFromStorage();
  }

  private loadCollectionsFromStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        this.collections = parsed.map((collection: any) => ({
          ...collection,
          createdAt: new Date(collection.createdAt),
          updatedAt: new Date(collection.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Error loading collections from storage:', error);
      this.collections = [];
    }
  }

  private saveCollectionsToStorage(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
      }
      
      // Check if data is too large for localStorage
      const dataToStore = JSON.stringify(this.collections);
      const dataSize = new Blob([dataToStore]).size;
      const maxSize = 5 * 1024 * 1024; // 5MB limit
      
      if (dataSize > maxSize) {
        console.warn('Collection data too large for localStorage, truncating...');
        // Keep only the most recent collections
        this.collections = this.collections
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 10); // Keep only 10 most recent collections
        
        // Try again with reduced data
        const reducedData = JSON.stringify(this.collections);
        localStorage.setItem(this.STORAGE_KEY, reducedData);
      } else {
        localStorage.setItem(this.STORAGE_KEY, dataToStore);
      }
    } catch (error) {
      console.error('Error saving collections to storage:', error);
      
      // If quota exceeded, try to clear some space
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old data...');
        this.clearOldData();
        
        // Try to save again with reduced data
        try {
          const reducedData = JSON.stringify(this.collections.slice(0, 5)); // Keep only 5 most recent
          localStorage.setItem(this.STORAGE_KEY, reducedData);
        } catch (retryError) {
          console.error('Failed to save even after clearing old data:', retryError);
        }
      }
    }
  }

  private clearOldData(): void {
    try {
      // Clear old collections
      this.collections = this.collections
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 3); // Keep only 3 most recent collections
      
      // Clear some localStorage space
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('boboshare_') && key !== this.STORAGE_KEY) {
          keysToRemove.push(key);
        }
      }
      
      // Remove old data
      keysToRemove.slice(0, 5).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  }

  createCollection(name: string, description?: string): Collection {
    const collection: Collection = {
      id: this.generateUniqueId(),
      name,
      description,
      files: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.collections.push(collection);
    this.saveCollectionsToStorage();
    return collection;
  }

  addFileToCollection(collectionId: string, file: UploadResult): boolean {
    const collection = this.collections.find(c => c.id === collectionId);
    if (collection) {
      collection.files.push(file);
      collection.updatedAt = new Date();
      this.saveCollectionsToStorage();
      return true;
    }
    return false;
  }

  removeFileFromCollection(collectionId: string, fileId: string): boolean {
    const collection = this.collections.find(c => c.id === collectionId);
    if (collection) {
      const index = collection.files.findIndex(f => f.id === fileId);
      if (index !== -1) {
        collection.files.splice(index, 1);
        collection.updatedAt = new Date();
        this.saveCollectionsToStorage();
        return true;
      }
    }
    return false;
  }

  getCollection(collectionId: string): Collection | undefined {
    return this.collections.find(c => c.id === collectionId);
  }

  getAllCollections(): Collection[] {
    return [...this.collections];
  }

  updateCollection(collectionId: string, updates: Partial<Collection>): boolean {
    const collection = this.collections.find(c => c.id === collectionId);
    if (collection) {
      Object.assign(collection, updates);
      collection.updatedAt = new Date();
      this.saveCollectionsToStorage();
      return true;
    }
    return false;
  }

  deleteCollection(collectionId: string): boolean {
    const index = this.collections.findIndex(c => c.id === collectionId);
    if (index !== -1) {
      this.collections.splice(index, 1);
      this.saveCollectionsToStorage();
      return true;
    }
    return false;
  }

  getCollectionsByFile(fileId: string): Collection[] {
    return this.collections.filter(c => c.files.some(f => f.id === fileId));
  }

  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
