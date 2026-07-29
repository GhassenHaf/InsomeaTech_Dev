import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { Order } from '../../models/order.model';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { CustomerService } from '../../services/customer.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';
import { Customer } from '../../models/customer.model';
import { User } from '../../models/user.model';

@Component({
    selector: 'app-order-list',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToolbarModule,
        InputTextModule,
        InputIconModule,
        IconFieldModule,
        TagModule,
        SelectModule
    ],
    template: `
        <div class="card">
            <p-toolbar styleClass="mb-6">
                <ng-template #start>
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-xl">Orders</span>
                    </div>
                </ng-template>
                <ng-template #end>
                    <p-button label="New Order" icon="pi pi-plus" severity="secondary" (onClick)="navigateToCreate()" *ngIf="canCreate" />
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="orders()"
                [rows]="10"
                [paginator]="true"
                [globalFilterFields]="['order_number', 'customer_name', 'sales_person_name', 'status_order']"
                [tableStyle]="{ 'min-width': '75rem' }"
                [rowHover]="true"
                dataKey="id"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} orders"
                [showCurrentPageReport]="true"
                [rowsPerPageOptions]="[10, 20, 30]"
            >
                <ng-template #caption>
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h5 class="m-0"></h5>
                        <div class="flex flex-col md:flex-row gap-2">
                            <p-select [options]="customers" optionLabel="company_name" optionValue="company_name" placeholder="Filter by Customer" (onChange)="dt.filter($event.value, 'customer_name', 'equals')" styleClass="w-full md:w-40" [showClear]="true" [filter]="true" appendTo="body" />
                            <p-select [options]="users" optionLabel="name" optionValue="name" placeholder="Filter by Sales Person" (onChange)="dt.filter($event.value, 'sales_person_name', 'equals')" styleClass="w-full md:w-40" [showClear]="true" [filter]="true" appendTo="body" />
                            <p-select [options]="statuses" placeholder="Filter by Status" (onChange)="dt.filter($event.value, 'status_order', 'equals')" styleClass="w-full md:w-40" [showClear]="true" appendTo="body" />
                            <p-iconfield>
                                <p-inputicon styleClass="pi pi-search" />
                                <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search Order #" />
                            </p-iconfield>
                        </div>
                    </div>
                </ng-template>
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="order_number" style="min-width:12rem">
                            Order #
                            <p-sortIcon field="order_number" />
                        </th>
                        <th pSortableColumn="customer_name" style="min-width:14rem">
                            Customer
                            <p-sortIcon field="customer_name" />
                        </th>
                        <th pSortableColumn="order_date" style="min-width:10rem">
                            Order Date
                            <p-sortIcon field="order_date" />
                        </th>
                        <th pSortableColumn="sales_person_name" style="min-width:12rem">
                            Sales Person
                            <p-sortIcon field="sales_person_name" />
                        </th>
                        <th pSortableColumn="status_order" style="min-width: 10rem">
                            Status
                            <p-sortIcon field="status_order" />
                        </th>
                        <th style="min-width: 8rem">Actions</th>
                    </tr>
                </ng-template>
                <ng-template #body let-order>
                    <tr>
                        <td class="font-bold">{{ order.order_number }}</td>
                        <td>{{ order.customer_name }}</td>
                        <td>{{ order.order_date | date:'mediumDate' }}</td>
                        <td>{{ order.sales_person_name }}</td>
                        <td>
                            <p-tag [value]="order.status_order" [severity]="getSeverity(order.status_order)" />
                        </td>
                        <td>
                            <p-button icon="pi pi-eye" [rounded]="true" [text]="true" (click)="viewOrder(order)" pTooltip="View Details" />
                        </td>
                    </tr>
                </ng-template>
            </p-table>
        </div>
    `
})
export class OrderListPage implements OnInit {
    orders = signal<Order[]>([]);
    customers: Customer[] = [];
    users: User[] = [];
    statuses = ['WaitingForFinanceApproval', 'ToBeProvisioned', 'UnderProcessing', 'DistiProcessing', 'Done', 'Cancelled'];

    @ViewChild('dt') dt!: Table;

    constructor(
        private orderService: OrderService,
        private customerService: CustomerService,
        private userService: UserService,
        private authService: AuthService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadOrders();
        this.customerService.getCustomers().subscribe(res => this.customers = res.customers);
        this.userService.getUsers().subscribe(res => this.users = res.data.filter(u => u.role === 'Sales' || u.role === 'Admin'));
    }

    get canCreate() {
        const role = this.authService.getUserRole();
        return role === 'Admin' || role === 'Sales';
    }

    loadOrders() {
        this.orderService.getOrders().subscribe((response) => {
            if (response.success) {
                this.orders.set(response.orders);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    viewOrder(order: Order) {
        this.router.navigate(['/pages/order', order.id]);
    }

    navigateToCreate() {
        this.router.navigate(['/pages/order/new']);
    }

    getSeverity(status: string) {
        switch (status) {
            case 'Done':
                return 'success';
            case 'WaitingForFinanceApproval':
            case 'ToBeProvisioned':
                return 'warn';
            case 'UnderProcessing':
            case 'DistiProcessing':
                return 'info';
            case 'Cancelled':
                return 'danger';
            default:
                return 'secondary';
        }
    }
}