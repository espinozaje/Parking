import { Routes } from '@angular/router';

export const routes: Routes = [

{
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
{
    path: 'home',
    loadComponent: () => import('./parking/parking').then(m => m.Parking)
  },
    {
    path: '**',
    redirectTo: 'home'
  }

];
