import { Component, OnInit } from '@angular/core';
import { NotificationsWidget } from './components/notificationswidget';
import { StatsWidget } from './components/statswidget';
import { RecentSalesWidget } from './components/recentsaleswidget';
import { BestSellingWidget } from './components/bestsellingwidget';
import { RevenueStreamWidget } from './components/revenuestreamwidget';
import { OrderQueueWidget } from './components/orderqueuewidget';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    //imports: [StatsWidget, RecentSalesWidget, BestSellingWidget, RevenueStreamWidget, NotificationsWidget, CommonModule],
    imports: [CommonModule, OrderQueueWidget],
    template: `
        <div class="grid grid-cols-12 gap-8">
            <div class="col-span-12" *ngIf="user">
                <div class="card mb-0">
                    <div class="flex justify-between mb-3">
                        <div>
                            <span class="block text-500 font-medium mb-3">Welcome Back</span>
                            <div class="text-900 font-medium text-xl">{{ user.name }}</div>
                            <div class="text-500 mt-2">Role: <span class="font-bold text-primary">{{ user.role }}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Provisioning Queue for Technical & Admin -->
            <div class="col-span-12" *ngIf="isTechOrAdmin">
                <app-order-queue-widget 
                    title="Provisioning Queue" 
                    [statuses]="['ToBeProvisioned', 'UnderProcessing']" 
                    [showStatusColumn]="true"
                    [showStatusFilter]="true"
                    [showTechUser]="true"
                />
            </div>

            <!-- Finance Queue for Finance & Admin -->
            <div class="col-span-12" *ngIf="isFinanceOrAdmin">
                <app-order-queue-widget 
                    title="Finance Approval Queue" 
                    [statuses]="['WaitingForFinanceApproval']" 
                    [showStatusColumn]="true"
                    [showStatusFilter]="false"
                    [showTechUser]="false"
                />
            </div>

            

            <!--
            <app-stats-widget class="contents" />
            <div class="col-span-12 xl:col-span-6">
                <app-recent-sales-widget />
                <app-best-selling-widget />
            </div>
            <div class="col-span-12 xl:col-span-6">
                <app-revenue-stream-widget />
                <app-notifications-widget />
            </div>
            -->
        </div>
    `
})
export class Dashboard implements OnInit {
    user: any;

    constructor(private authService: AuthService) {}

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            this.user = user;
        });
    }

    get isTechOrAdmin() {
        return this.user?.role === 'Admin' || this.user?.role === 'Technical';
    }

    get isFinanceOrAdmin() {
        return this.user?.role === 'Admin' || this.user?.role === 'Finance';
    }
}
