import { Component, Input, OnInit, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { SelectModule } from 'primeng/select';
import { Router } from '@angular/router';
import { OrderService } from '../../../services/order.service';
import { Order } from '../../../models/order.model';

@Component({
    selector: 'app-order-queue-widget',
    standalone: true,
    imports: [
        CommonModule, 
        FormsModule,
        TableModule, 
        ButtonModule, 
        TagModule,
        InputTextModule,
        InputIconModule,
        IconFieldModule,
        SelectModule
    ],
    template: `
        <div class="card">
            <div class="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div class="font-semibold text-xl">{{ title }}</div>
                <div class="flex gap-2 w-full md:w-auto">
                    <p-select 
                        *ngIf="showStatusFilter && statuses.length > 1"
                        [options]="statuses" 
                        placeholder="Filter Status" 
                        (onChange)="dt.filter($event.value, 'status_order', 'equals')" 
                        styleClass="w-full md:w-40" 
                        [showClear]="true" 
                        appendTo="body" 
                    />
                    <p-iconfield class="w-full md:w-auto">
                        <p-inputicon styleClass="pi pi-search" />
                        <input 
                            pInputText 
                            type="text" 
                            (input)="onGlobalFilter(dt, $event)" 
                            placeholder="Search..." 
                            class="w-full md:w-40"
                        />
                    </p-iconfield>
                    <p-button icon="pi pi-refresh" [text]="true" [rounded]="true" (onClick)="loadOrders()" />
                </div>
            </div>
            
            <p-table 
                #dt
                [value]="orders" 
                [paginator]="true" 
                [rows]="5" 
                responsiveLayout="scroll"
                [globalFilterFields]="['order_number', 'customer_name', 'status_order']"
            >
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="order_number">Order # <p-sortIcon field="order_number" /></th>
                        <th pSortableColumn="customer_name">Customer <p-sortIcon field="customer_name" /></th>
                        <th pSortableColumn="status_order" *ngIf="showStatusColumn">Status <p-sortIcon field="status_order" /></th>
                        <th pSortableColumn="order_date">Date <p-sortIcon field="order_date" /></th>
                        <th pSortableColumn="technical_user_name" *ngIf="showTechUser">Tech User <p-sortIcon field="technical_user_name" /></th>
                        <th pSortableColumn="sales_person_name" *ngIf="!showTechUser">Sales Person <p-sortIcon field="sales_person_name" /></th>
                        <th style="width: 4rem"></th>
                    </tr>
                </ng-template>
                <ng-template #body let-order>
                    <tr>
                        <td class="font-bold">{{ order.order_number }}</td>
                        <td>{{ order.customer_name }}</td>
                        <td *ngIf="showStatusColumn">
                            <p-tag [value]="order.status_order" [severity]="getSeverity(order.status_order)" />
                        </td>
                        <td>{{ order.order_date | date:'mediumDate' }}</td>
                        <td *ngIf="showTechUser">{{ order.technical_user_name || '-' }}</td>
                        <td *ngIf="!showTechUser">{{ order.sales_person_name }}</td>
                        <td>
                            <p-button icon="pi pi-arrow-right" [text]="true" [rounded]="true" (onClick)="viewOrder(order)" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td [attr.colspan]="showStatusColumn ? 6 : 5" class="text-center p-4">No orders found in this queue.</td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `
})
export class OrderQueueWidget implements OnInit, OnChanges {
    @Input() title: string = 'Order Queue';
    @Input() statuses: string[] = [];
    @Input() showStatusFilter: boolean = true;
    @Input() showStatusColumn: boolean = true;
    @Input() showTechUser: boolean = true; // If false, shows Sales Person

    orders: Order[] = [];
    
    @ViewChild('dt') dt!: Table;

    constructor(
        private orderService: OrderService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadOrders();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['statuses']) {
            this.loadOrders();
        }
    }

    loadOrders() {
        if (!this.statuses || this.statuses.length === 0) return;

        // Fetch all orders and filter client-side for now
        // Ideally backend supports array of statuses: ?status_order=A,B
        this.orderService.getOrders().subscribe(res => {
            if (res.success) {
                this.orders = res.orders.filter(o => 
                    this.statuses.includes(o.status_order)
                );
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    viewOrder(order: Order) {
        this.router.navigate(['/pages/order', order.id]);
    }

    getSeverity(status: string) {
        switch (status) {
            case 'Done': return 'success';
            case 'WaitingForFinanceApproval': return 'warn';
            case 'ToBeProvisioned': return 'warn';
            case 'UnderProcessing': return 'info';
            case 'DistiProcessing': return 'info';
            case 'Cancelled': return 'danger';
            default: return 'secondary';
        }
    }
}
