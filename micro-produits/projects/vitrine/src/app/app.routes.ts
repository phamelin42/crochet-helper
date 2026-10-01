import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./vitrine-page').then((m) => m.VitrinePage) },
  { path: '**', redirectTo: '' },
];
