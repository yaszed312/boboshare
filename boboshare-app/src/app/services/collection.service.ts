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

  constructor() {}

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
    return collection;
  }

  addFileToCollection(collectionId: string, file: UploadResult): boolean {
    const collection = this.collections.find(c => c.id === collectionId);
    if (collection) {
      collection.files.push(file);
      collection.updatedAt = new Date();
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
      return true;
    }
    return false;
  }

  deleteCollection(collectionId: string): boolean {
    const index = this.collections.findIndex(c => c.id === collectionId);
    if (index !== -1) {
      this.collections.splice(index, 1);
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
