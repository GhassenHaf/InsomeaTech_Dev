import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu implements OnInit, OnDestroy {
    model: MenuItem[] = [];
    private userSubscription: Subscription | undefined;

    constructor(private authService: AuthService) {}

    ngOnInit() {
        this.userSubscription = this.authService.currentUser$.subscribe(() => {
            this.updateMenu();
        });
    }

    ngOnDestroy() {
        if (this.userSubscription) {
            this.userSubscription.unsubscribe();
        }
    }

    updateMenu() {
        const isAdmin = this.authService.hasRole('Admin');
        const isSales = this.authService.hasAnyRole(['Sales', 'Admin']);
        const isTechnical = this.authService.hasAnyRole(['Technical', 'Admin']);

        this.model = [
            {
                label: 'Home',
                items: [
                    { label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }
                ]
            },
            {
                label: 'Management',
                items: [
                    {
                        label: 'Customers',
                        icon: 'pi pi-fw pi-users',
                        routerLink: ['/pages/customer'],
                        visible: true
                    },
                    {
                        label: 'Products',
                        icon: 'pi pi-fw pi-box',
                        routerLink: ['/pages/product'],
                        visible: true
                    },
                    {
                        label: 'Orders',
                        icon: 'pi pi-fw pi-shopping-cart',
                        routerLink: ['/pages/order'],
                        visible: true
                    }
                ]
            },
            {
                label: 'Finance',
                items: [
                    {
                        label: 'Invoices',
                        icon: 'pi pi-fw pi-file',
                        routerLink: ['/pages/finance/invoices'],
                        visible: true
                    }
                ]
            },
            {
                label: 'Administration',
                items: [
                    {
                        label: 'Users',
                        icon: 'pi pi-fw pi-user-edit',
                        routerLink: ['/pages/user'],
                        visible: isAdmin

                    },
                    {
                        label: 'Distributors',
                        icon: 'pi pi-fw pi-building',
                        routerLink: ['/pages/disti'],
                        visible: true
                    },
                    /*
                    {
                        label: 'Webhooks',
                        icon: 'pi pi-fw pi-globe',
                        routerLink: ['/pages/webhook'],
                        visible: isAdmin
                    },
                    */
                    {
                        label: 'Audit Logs',
                        icon: 'pi pi-fw pi-history',
                        routerLink: ['/pages/audit'],
                        visible: isAdmin
                    }
                ]
            },
            {
                label: 'Account',
                items: [
                    {
                        label: 'Logout',
                        icon: 'pi pi-fw pi-sign-out',
                        command: () => {
                            this.authService.logout();
                        }
                    }
                ]
            }
        ];
    }
}
