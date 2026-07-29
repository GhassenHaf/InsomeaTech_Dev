import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { StepsModule } from 'primeng/steps';
import { FileUploadModule } from 'primeng/fileupload';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DialogModule } from 'primeng/dialog';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { CustomerService } from '../../services/customer.service';
import { ProductService } from '../../services/product.service';
import { DistributorService } from '../../services/distributor.service';
import { OrderService } from '../../services/order.service';
import { OrderLineService } from '../../services/order-line.service';
import { Customer } from '../../models/customer.model';
import { Product } from '../../models/product.model';
import { Distributor } from '../../models/distributor.model';

@Component({
    selector: 'app-order-create',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        DatePickerModule,
        TableModule,
        StepsModule,
        FileUploadModule,
        AutoCompleteModule,
        BadgeModule,
        TooltipModule,
        DialogModule,
        IconFieldModule,
        InputIconModule
    ],
    template: `
        <div class="card shadow-sm border-0">
            <span class="block text-900 font-bold text-xl mb-4">Create New Order</span>
            
            <p-steps [model]="stepItems" [(activeIndex)]="activeStep" [readonly]="true" class="mb-6" />

            <!-- Step 1: Order Info -->
            <div *ngIf="activeStep === 0" class="flex flex-col gap-4 animate-fadein w-full py-4">
                <div class="flex flex-col gap-4 w-full">
                    <div class="flex flex-col gap-2">
                        <label for="customer" class="block font-bold">Customer <span class="text-red-500">*</span></label>
                        <p-select [options]="customers" [(ngModel)]="orderInfo.customer_id" optionLabel="company_name" optionValue="id" placeholder="Select a Customer" [filter]="true" filterBy="company_name" fluid />
                    </div>
                    <div class="flex flex-col gap-2">
                        <label for="order_date" class="block font-bold">Order Date</label>
                        <p-datepicker [(ngModel)]="orderInfo.order_date" [showIcon]="true" [minDate]="minDate" fluid />
                    </div>
                </div>
                <div class="flex flex-col gap-2">
                    <label for="notes" class="block font-bold">Notes</label>
                    <textarea pTextarea [(ngModel)]="orderInfo.notes" rows="4" fluid placeholder="Add any special instructions..."></textarea>
                </div>
                <div class="flex pt-6 justify-end">
                    <p-button label="Next: Select Products" icon="pi pi-arrow-right" iconPos="right" (onClick)="nextStep()" [disabled]="!orderInfo.customer_id || !orderInfo.order_date" />
                </div>
            </div>

            <!-- Step 2: Catalog & Selection -->
            <div *ngIf="activeStep === 1" class="animate-fadein w-full py-4">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <!-- Left Column: Catalog Browser -->
                    <div class="lg:col-span-8 flex flex-col gap-4">
                        <!-- Filters Section -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                            <div class="flex flex-col gap-1">
                                <label class="block font-bold text-sm">Segment</label>
                                <p-select [options]="segments" [(ngModel)]="catalogFilters.segment" placeholder="All" [showClear]="true" (onChange)="loadCatalog()" fluid />
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="block font-bold text-sm">Cycle</label>
                                <p-select [options]="billingCycles" [(ngModel)]="catalogFilters.billing_cycle" placeholder="All" [showClear]="true" (onChange)="loadCatalog()" fluid />
                            </div>
                            <div class="flex flex-col gap-1">
                                <label class="block font-bold text-sm">Term</label>
                                <p-select [options]="terms" [(ngModel)]="catalogFilters.term" placeholder="All" [showClear]="true" (onChange)="loadCatalog()" fluid />
                            </div>
                            <div class="flex flex-col gap-1 justify-end">
                                <p-iconField iconPosition="left" class="w-full">
                                    <p-inputIcon styleClass="pi pi-search" />
                                    <input pInputText type="text" [(ngModel)]="catalogFilters.search" (input)="onCatalogSearch($event)" placeholder="Search..." class="w-full" />
                                </p-iconField>
                            </div>
                        </div>

                        <!-- Catalog Table -->
                        <div class="overflow-auto" style="max-height: 550px;">
                            <p-table [value]="catalogProducts" [loading]="loadingCatalog" [paginator]="true" [rows]="10" [responsiveLayout]="'scroll'" styleClass="p-datatable-striped">
                                <ng-template #header>
                                    <tr>
                                        <th style="min-width: 15rem">Product</th>
                                        <th>SKU</th>
                                        <th>Details</th>
                                        <th style="width: 3rem"></th>
                                    </tr>
                                </ng-template>
                                <ng-template #body let-product>
                                    <tr>
                                        <td>
                                            <span class="font-bold">{{ product.name }}</span>
                                        </td>
                                        <td>
                                            <span class="font-mono text-sm text-gray-500">{{ product.sku }}</span>
                                        </td>
                                        <td>
                                            <div class="flex flex-wrap gap-1">
                                                <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{{ product.segment || 'N/A' }}</span>
                                                <span class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold">{{ product.billing_cycle || 'N/A' }}</span>
                                                <span class="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded font-semibold">{{ product.term || 'N/A' }}</span>
                                            </div>
                                        </td>
                                        <td class="text-center">
                                            <p-button icon="pi pi-plus" [rounded]="true" [text]="true" (onClick)="addProductFromCatalog(product)" pTooltip="Add to Order" />
                                        </td>
                                    </tr>
                                </ng-template>
                                <ng-template #emptymessage>
                                    <tr>
                                        <td colspan="4" class="text-center p-8 text-gray-500 italic">No products match your filters.</td>
                                    </tr>
                                </ng-template>
                            </p-table>
                        </div>
                    </div>

                    <!-- Right Column: Selected Items (The Selection) -->
                    <div class="lg:col-span-4 flex flex-col gap-4 border-l border-gray-100 lg:pl-6">
                        <div class="flex items-center justify-between">
                            <h5 class="m-0 font-bold uppercase tracking-wider text-[10px] text-gray-500">Selected Items</h5>
                            <p-badge [value]="lineItems.length.toString()" severity="info" />
                        </div>

                        <div *ngIf="lineItems.length === 0" class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 text-gray-400">
                            <i class="pi pi-shopping-bag text-5xl mb-4 opacity-20"></i>
                            <span class="text-sm font-medium text-center">Your selection is empty</span>
                        </div>

                        <div class="flex flex-col gap-3 overflow-auto pr-2" style="max-height: 550px;">
                            <div *ngFor="let item of lineItems; let i = index" class="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all animate-fadein">
                                <div class="flex justify-between items-start mb-2">
                                    <div class="flex flex-col max-w-[80%]">
                                        <span class="font-bold text-sm">{{ item.selectedProduct?.name }}</span>
                                        <div class="flex gap-2 mt-1">
                                            <span class="text-xs text-gray-500">{{ item.selectedProduct?.sku }}</span>
                                        </div>
                                    </div>
                                    <p-button icon="pi pi-trash" [rounded]="true" [text]="true" severity="danger" (onClick)="removeLine(item)" size="small" />
                                </div>
                                
                                <div class="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                                    <div class="flex flex-col gap-1">
                                        <label class="block font-bold text-xs">Distributor</label>
                                        <p-select [options]="distributors" [(ngModel)]="item.disti_id" optionLabel="name" optionValue="id" placeholder="Select" appendTo="body" styleClass="w-full" fluid />
                                    </div>
                                    <div class="flex flex-col gap-1">
                                        <label class="block font-bold text-xs">Quantity</label>
                                        <input type="number" pInputText [(ngModel)]="item.quantity" min="1" class="w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="mt-auto pt-6 border-t border-gray-100 flex gap-2">
                            <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" [text]="true" (onClick)="prevStep()" class="flex-1" />
                            <p-button label="Next: Documents" icon="pi pi-arrow-right" iconPos="right" (onClick)="nextStep()" [disabled]="!isLinesValid()" class="flex-[2]" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Step 3: Documents & Final Review -->
            <div *ngIf="activeStep === 2" class="animate-fadein w-full py-4">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <!-- Left Column: Summary Recap -->
                    <div class="lg:col-span-8 flex flex-col gap-6">
                        <div class="flex items-center justify-between border-b pb-4">
                            <h5 class="m-0 font-bold uppercase tracking-wider text-[10px] text-gray-500">Order Summary Review</h5>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span class="block text-xs font-bold text-gray-400 uppercase mb-2">Customer</span>
                                <span class="text-lg font-bold text-gray-800">{{ getSelectedCustomerName() }}</span>
                            </div>
                            <div class="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span class="block text-xs font-bold text-gray-400 uppercase mb-2">Order Date</span>
                                <span class="text-lg font-bold text-gray-800">{{ orderInfo.order_date | date:'mediumDate' }}</span>
                            </div>
                        </div>

                        <div class="flex flex-col gap-3">
                            <span class="block text-xs font-bold text-gray-400 uppercase">Items to be Ordered</span>
                            <div class="overflow-hidden">
                                <p-table [value]="lineItems" styleClass="p-datatable-sm">
                                    <ng-template #header>
                                        <tr>
                                            <th>Product</th>
                                            <th>Distributor</th>
                                            <th style="width: 5rem">Qty</th>
                                        </tr>
                                    </ng-template>
                                    <ng-template #body let-item>
                                        <tr>
                                            <td>
                                                <div class="flex flex-col">
                                                    <span class="font-bold text-sm">{{ item.selectedProduct?.name }}</span>
                                                    <span class="text-xs text-gray-400">{{ item.selectedProduct?.sku }}</span>
                                                </div>
                                            </td>
                                            <td>{{ getDistributorName(item.disti_id) }}</td>
                                            <td class="font-bold">{{ item.quantity }}</td>
                                        </tr>
                                    </ng-template>
                                </p-table>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Document Uploads -->
                    <div class="lg:col-span-4 flex flex-col gap-4 border-l border-gray-100 lg:pl-6">
                        <h5 class="m-0 font-bold uppercase tracking-wider text-[10px] text-gray-500">Documents Required</h5>
                        
                        <div class="flex flex-col gap-6 mt-2">
                            <div class="flex flex-col gap-3 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <label class="block font-bold text-sm text-gray-600">Customer PO <span class="text-red-500">*</span></label>
                                <p-fileUpload mode="basic" chooseLabel="Select PO" (onSelect)="onLpoSelect($event)" accept=".pdf,image/*" [maxFileSize]="10000000" styleClass="w-full" />
                                <span class="text-xs text-green-600 font-medium truncate" *ngIf="lpoFile"><i class="pi pi-check"></i> {{ lpoFile.name }}</span>
                            </div>
                            
                            <div class="flex flex-col gap-3 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <label class="block font-bold text-sm text-gray-600">SO <span class="text-red-500">*</span></label>
                                <p-fileUpload mode="basic" chooseLabel="Select SO" (onSelect)="onSoSelect($event)" accept=".pdf,image/*" [maxFileSize]="10000000" styleClass="w-full" />
                                <span class="text-xs text-green-600 font-medium truncate" *ngIf="soFile"><i class="pi pi-check"></i> {{ soFile.name }}</span>
                            </div>
                        </div>

                        <div *ngIf="errorMessage" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative mt-4" role="alert">
                            <span class="block sm:inline text-xs font-bold">{{ errorMessage }}</span>
                        </div>

                        <div class="mt-auto pt-10 flex flex-col gap-3">
                            <p-button label="Back" icon="pi pi-arrow-left" severity="secondary" (onClick)="prevStep()" [text]="true" />
                            <p-button label="Confirm & Submit Order" icon="pi pi-check-circle" (onClick)="submitOrder()" [loading]="submitting" [disabled]="!lpoFile || !soFile" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
})
export class OrderCreatePage implements OnInit {
    activeStep = 0;
    submitting = false;
    minDate: Date = new Date();

    stepItems = [
        { label: 'Info' },
        { label: 'Items' },
        { label: 'Documents' }
    ];

    customers: Customer[] = [];
    filteredProducts: Product[] = []; 
    distributors: Distributor[] = [];

    // Catalog State
    loadingCatalog = false;
    catalogProducts: Product[] = [];
    catalogFilters: any = {
        segment: null,
        billing_cycle: null,
        term: null,
        search: ''
    };

    // Filter Options
    segments = ['Commercial', 'Nonprofit', 'Government', 'Education'];
    billingCycles = ['Monthly', 'Annual', 'Triennial', 'OneTime'];
    terms = ['1Month', '1Year', '3Years', 'Perpetual'];

    orderInfo: any = {
        customer_id: null,
        order_date: new Date(),
        notes: ''
    };

    lineItems: any[] = []; 

    lpoFile: File | null = null;
    soFile: File | null = null;
    errorMessage: string = '';
    createdOrderId: string | null = null;

    constructor(
        private customerService: CustomerService,
        private productService: ProductService,
        private distributorService: DistributorService,
        private orderService: OrderService,
        private orderLineService: OrderLineService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadInitialData();
    }

    loadInitialData() {
        this.customerService.getCustomers().subscribe(res => this.customers = res.customers);
        this.distributorService.getDistributors().subscribe(res => this.distributors = res.distis);
    }

    // Catalog Logic
    onCatalogSearch(event: any) {
        this.loadCatalog();
    }

    loadCatalog() {
        this.loadingCatalog = true;
        this.productService.getProducts({
            ...this.catalogFilters,
            limit: 50,
            status: 'Active'
        }).subscribe({
            next: (res) => {
                this.catalogProducts = res.products;
                this.loadingCatalog = false;
            },
            error: (err) => {
                console.error('Error loading catalog:', err);
                this.loadingCatalog = false;
            }
        });
    }

    addProductFromCatalog(product: Product) {
        this.lineItems.push({ 
            selectedProduct: product, 
            product_id: product.id, 
            disti_id: null, 
            quantity: 1 
        });
        
        this.messageService.add({ 
            severity: 'info', 
            summary: 'Added', 
            detail: `${product.name} added to selection`,
            life: 2000
        });
    }

    getSelectedCustomerName(): string {
        const customer = this.customers.find(c => c.id === this.orderInfo.customer_id);
        return customer ? customer.company_name : 'N/A';
    }

    getDistributorName(id: string): string {
        const disti = this.distributors.find(d => d.id === id);
        return disti ? disti.name : 'N/A';
    }

    nextStep() {
        this.activeStep++;
        if (this.activeStep === 1) {
            this.loadCatalog();
        }
    }

    prevStep() {
        this.activeStep--;
    }

    removeLine(item: any) {
        this.lineItems = this.lineItems.filter(i => i !== item);
    }

    isLinesValid() {
        return this.lineItems.length > 0 && this.lineItems.every(item => item.selectedProduct && item.disti_id && item.quantity > 0);
    }

    onLpoSelect(event: any) {
        this.lpoFile = event.files[0];
    }

    onSoSelect(event: any) {
        this.soFile = event.files[0];
    }

    async submitOrder() {
        this.submitting = true;
        this.errorMessage = '';
        
        try {
            const payload = {
                ...this.orderInfo,
                order_date: this.orderInfo.order_date.toISOString(),
                lineItems: this.lineItems.map(item => ({
                    product_id: item.selectedProduct.id,
                    disti_id: item.disti_id,
                    quantity: item.quantity
                }))
            };

            const formData = new FormData();
            formData.append('data', JSON.stringify(payload));
            
            if (this.lpoFile) formData.append('lpo', this.lpoFile);
            if (this.soFile) formData.append('so', this.soFile);

            const res = await lastValueFrom(this.orderService.createOrder(formData));

            if (res?.success) {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Order created successfully' });
                this.router.navigate(['/pages/order']);
            } else {
                throw new Error('Server responded with failure');
            }

        } catch (error: any) {
            console.error('Error creating order:', error);
            this.errorMessage = error?.error?.error || 'Failed to complete order. Please check your connection and try again.';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create order' });
        } finally {
            this.submitting = false;
        }
    }
}
