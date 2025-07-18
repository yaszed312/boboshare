import { Routes } from '@angular/router';
import { UploadComponent } from './components/upload/upload.component';
import { GalleryComponent } from './components/gallery/gallery.component';
import { ViewerComponent } from './components/viewer/viewer.component';
import { CollectionComponent } from './components/collection/collection.component';

export const routes: Routes = [
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { path: 'upload', component: UploadComponent },
  { path: 'gallery', component: GalleryComponent },
  { path: 'collections', component: CollectionComponent },
  { path: 'view/:id', component: ViewerComponent },
  { path: 'collection/:id', component: CollectionComponent },
  { path: '**', redirectTo: '/upload' }
];
