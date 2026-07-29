import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { CustomerProduct } from '../../models/customer-product.model';
import { CustomerProductService } from '../../services/customer-product.service';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.model';

@Component({
    selector: 'app-customer-product',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        ButtonModule,
        RippleModule,
        ToolbarModule,
        InputTextModule,
        InputIconModule,
        IconFieldModule,
        TagModule,
        DialogModule
    ],
    template: `
        <div class="card">
            <p-toolbar styleClass="mb-4">
                <ng-template #start>
                    <p-button icon="pi pi-arrow-left" class="mr-2" [rounded]="true" [text]="true" (click)="goBack()" />
                    <div class="flex flex-col">
                        <span class="font-bold text-xl">Customer Products</span>
                        <span class="text-gray-500" *ngIf="customer">{{ customer.company_name }}</span>
                    </div>
                </ng-template>
                <ng-template #end>
                    <p-button label="Refresh" icon="pi pi-refresh" severity="secondary" (onClick)="loadData()" />
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="customerProducts()"
                [rows]="10"
                [paginator]="true"
                [globalFilterFields]="['product_name', 'product_sku', 'status', 'notes']"
                [tableStyle]="{ 'min-width': '75rem' }"
                [rowHover]="true"
                dataKey="id"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} products"
                [showCurrentPageReport]="true"
                [rowsPerPageOptions]="[10, 20, 50]"
            >
                <ng-template #caption>
                    <div class="flex items-center justify-between">
                        <span class="p-input-icon-left"></span>
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                        </p-iconfield>
                    </div>
                </ng-template>
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="product_name" style="min-width:14rem">
                            Product
                            <p-sortIcon field="product_name" />
                        </th>
                        <th pSortableColumn="product_sku" style="min-width:10rem">
                            SKU
                            <p-sortIcon field="product_sku" />
                        </th>
                        <th pSortableColumn="segment" style="min-width:10rem">
                            Segment
                            <p-sortIcon field="segment" />
                        </th>
                        <th pSortableColumn="disti_name" style="min-width:10rem">
                            Distributor
                            <p-sortIcon field="disti_name" />
                        </th>
                        <th pSortableColumn="quantity" style="min-width:8rem">
                            Qty
                            <p-sortIcon field="quantity" />
                        </th>
                        <th pSortableColumn="start_activation_date" style="min-width:10rem">
                            Start|Activation Date
                            <p-sortIcon field="start_activation_date" />
                        </th>
                        <th pSortableColumn="expiration_date" style="min-width:10rem">
                            Expiration
                            <p-sortIcon field="expiration_date" />
                        </th>
                        <th pSortableColumn="status" style="min-width:10rem">
                            Status
                            <p-sortIcon field="status" />
                        </th>
                         <th pSortableColumn="billing_cycle" style="min-width:10rem">
                            Cycle
                            <p-sortIcon field="billing_cycle" />
                        </th>
                        <th style="min-width: 6rem">Details</th>
                    </tr>
                </ng-template>
                <ng-template #body let-cp>
                    <tr>
                        <td class="font-bold">{{ cp.product_name }}</td>
                        <td>{{ cp.product_sku }}</td>
                        <td>{{ cp.segment }}</td>
                        <td>{{ cp.disti_name }}</td>
                        <td>{{ cp.quantity }}</td>
                        <td>
                             {{ cp.start_date | date:'mediumDate' }}
                        </td>
                        <td>
                             <span [ngClass]="{'text-red-500 font-bold': isExpiringSoon(cp.expiration_date)}">
                                {{ cp.expiration_date | date:'mediumDate' }}
                             </span>
                        </td>
                        <td>
                            <p-tag [value]="cp.status" [severity]="getSeverity(cp.status)" />
                        </td>
                        <td>{{ cp.billing_cycle }}</td>
                        <td>
                            <p-button icon="pi pi-eye" [rounded]="true" [text]="true" (click)="viewDetails(cp)" />
                        </td>
                    </tr>
                </ng-template>
                <ng-template #emptymessage>
                    <tr>
                        <td colspan="7" class="text-center p-4">No products found for this customer.</td>
                    </tr>
                </ng-template>
            </p-table>

            <p-dialog [(visible)]="detailsDialog" [style]="{ width: '500px' }" [header]="selectedProduct?.product_name || 'Details'" [modal]="true" styleClass="p-fluid">
                <ng-template #content>
                    <div class="flex flex-col gap-4" *ngIf="selectedProduct">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="font-bold block mb-1">Start|Activation Date</label>
                                <span>{{ selectedProduct.start_date | date:'mediumDate' }}</span>
                            </div>
                            <div>
                                <label class="font-bold block mb-1">Term</label>
                                <span>{{ selectedProduct.term }}</span>
                            </div>
                            <div>
                                <label class="font-bold block mb-1">Billing Cycle</label>
                                <span>{{ selectedProduct.billing_cycle }}</span>
                            </div>
                        </div>
                        
                        <div *ngIf="selectedProduct.notes">
                            <label class="font-bold block mb-2">Notes</label>
                            <div class="bg-gray-100 p-3 rounded">
                                {{ selectedProduct.notes }}
                            </div>
                        </div>
                    </div>
                </ng-template>
                <ng-template #footer>
                    <div class="flex justify-between items-center w-full">
                        <p-button *ngIf="selectedProduct?.order_id" 
                                label="View Order ({{selectedProduct?.order_number}})" 
                                icon="pi pi-external-link" 
                                severity="info"
                                [text]="true"
                                (click)="navigateToOrder(selectedProduct!.order_id!)" />
                        <p-button label="Close" icon="pi pi-times" text (click)="detailsDialog = false" />
                    </div>
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class CustomerProductPage implements OnInit {
    customerId: string | null = null;
    customerProducts = signal<CustomerProduct[]>([]);
    customer: Customer | null = null;
    selectedProduct: CustomerProduct | null = null;
    detailsDialog: boolean = false;

    @ViewChild('dt') dt!: Table;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private customerProductService: CustomerProductService,
        private customerService: CustomerService
    ) {}

    ngOnInit() {
        this.route.paramMap.subscribe(params => {
            this.customerId = params.get('id');
            if (this.customerId) {
                this.loadData();
            }
        });
    }

    loadData() {
        if (!this.customerId) return;

        // Fetch customer details
        this.customerService.getCustomer(this.customerId).subscribe(res => {
            if (res.success) {
                this.customer = res.customer;
            }
        });

        // Fetch customer products
        this.customerProductService.getByCustomerId(this.customerId).subscribe(res => {
            if (res.success) {
                this.customerProducts.set(res.customerProducts);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    viewDetails(cp: CustomerProduct) {
        this.selectedProduct = cp;
        this.detailsDialog = true;
    }

    navigateToOrder(orderId: string) {
        this.router.navigate(['/pages/order', orderId]);
    }

    goBack() {
        this.router.navigate(['/pages/customer']);
    }

    getSeverity(status: string) {
        switch (status) {
            case 'Active':
                return 'success';
            case 'Expired':
                return 'danger';
            case 'Suspended':
                return 'warn';
            case 'Cancelled':
                return 'secondary';
            default:
                return 'info';
        }
    }

    isExpiringSoon(dateStr?: string): boolean {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log('Difference in days:', diffDays);
        return diffDays <= 30 && diffDays > 0;
    }
}
