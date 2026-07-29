import { Routes } from '@angular/router';
import { Documentation } from './documentation/documentation';
import { Crud } from './crud/crud';
import { Empty } from './empty/empty';

export default [
    { path: 'documentation', component: Documentation },
    { path: 'crud', component: Crud },
    { path: 'empty', component: Empty },
    { path: 'customer', loadComponent: () => import('./customer/customer').then((m) => m.CustomerPage) },
    { path: 'customer/:id/products', loadComponent: () => import('./customer-product/customer-product').then((m) => m.CustomerProductPage) },
    { path: 'product', loadComponent: () => import('./product/product').then((m) => m.ProductPage) },
    { path: 'order', loadComponent: () => import('./order/order-list').then((m) => m.OrderListPage) },
    { path: 'order/new', loadComponent: () => import('./order/order-create').then((m) => m.OrderCreatePage) },
    { path: 'order/:id', loadComponent: () => import('./order/order-detail').then((m) => m.OrderDetailPage) },
    { path: 'disti', loadComponent: () => import('./distributor/distributor').then((m) => m.DistributorPage) },
    { path: 'user', loadComponent: () => import('./user/user').then((m) => m.UserPage) },
    { path: 'audit', loadComponent: () => import('./audit/audit').then((m) => m.AuditPage) },
    { path: 'finance/invoices', loadComponent: () => import('./finance/invoices').then((m) => m.InvoicesPage) },
    { path: '**', redirectTo: '/notfound' }
] as Routes;
