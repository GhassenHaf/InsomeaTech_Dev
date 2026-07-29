import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Product } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { AuthService } from '../../services/auth.service';

interface Column {
    field: string;
    header: string;
    customExportHeader?: string;
}

interface ExportColumn {
    title: string;
    dataKey: string;
}

@Component({
    selector: 'app-product',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        TextareaModule,
        SelectModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule,
        ConfirmDialogModule
    ],
    template: `
        <p-toolbar styleClass="mb-6">
            <ng-template #start>
                <p-button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" *ngIf="isAdmin" />
                <!--
                <p-button severity="secondary" label="Delete" icon="pi pi-trash" outlined (onClick)="deleteSelectedProducts()" [disabled]="!selectedProducts || !selectedProducts.length" *ngIf="isAdmin" />
                -->

            </ng-template>

            <ng-template #end>
                <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
            </ng-template>
        </p-toolbar>

        <p-table
            #dt
            [value]="products()"
            [rows]="10"
            [columns]="cols"
            [paginator]="true"
            [globalFilterFields]="['name', 'sku', 'category', 'status', 'billing_cycle', 'term', 'segment']"
            [tableStyle]="{ 'min-width': '75rem' }"
            [(selection)]="selectedProducts"
            [rowHover]="true"
            dataKey="id"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} products"
            [showCurrentPageReport]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
        >
            <ng-template #caption>
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h5 class="m-0">Manage Products</h5>
                    <div class="flex flex-col md:flex-row gap-2">
                        <p-select [options]="cycles" placeholder="Filter by Billing" (onChange)="dt.filter($event.value, 'billing_cycle', 'equals')" styleClass="w-full md:w-40" [showClear]="true" appendTo="body" />
                        <p-select [options]="terms" placeholder="Filter by Term" (onChange)="dt.filter($event.value, 'term', 'equals')" styleClass="w-full md:w-40" [showClear]="true" appendTo="body" />
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                        </p-iconfield>
                    </div>
                </div>
            </ng-template>
            <ng-template #header>
                <tr>
                    <th style="width: 3rem" *ngIf="isAdmin">
                        <p-tableHeaderCheckbox />
                    </th>
                    <th pSortableColumn="name" style="min-width:14rem">
                        Name
                        <p-sortIcon field="name" />
                    </th>
                    <th pSortableColumn="sku" style="min-width:10rem">
                        SKU
                        <p-sortIcon field="sku" />
                    </th>
                    <th pSortableColumn="category" style="min-width:10rem">
                        Category
                        <p-sortIcon field="category" />
                    </th>
                    <th pSortableColumn="list_price" style="min-width:10rem">
                        List Price
                        <p-sortIcon field="list_price" />
                    </th>
                    <th pSortableColumn="segment" style="min-width:10rem">
                        Segment
                        <p-sortIcon field="segment" />
                    </th>
                    <th pSortableColumn="billing_cycle" style="min-width:10rem">
                        Billing Cycle
                        <p-sortIcon field="billing_cycle" />
                    </th>
                     <th pSortableColumn="term" style="min-width:10rem">
                        Term
                        <p-sortIcon field="term" />
                    </th>
                    <th pSortableColumn="status" style="min-width: 10rem">
                        Status
                        <p-sortIcon field="status" />
                    </th>
                    <th style="min-width: 12rem" *ngIf="isAdmin">Actions</th>
                </tr>
            </ng-template>
            <ng-template #body let-product>
                <tr>
                    <td style="width: 3rem" *ngIf="isAdmin">
                        <p-tableCheckbox [value]="product" />
                    </td>
                    <td>{{ product.name }}</td>
                    <td>{{ product.sku }}</td>
                    <td>{{ product.category }}</td>
                    <td>{{ product.list_price | currency:'USD' }}</td>
                    <td>{{ product.segment }}</td>
                    <td>{{ product.billing_cycle }}</td>
                    <td>{{ product.term }}</td>
                    <td>
                        <p-tag [value]="product.status" [severity]="getSeverity(product.status)" />
                    </td>
                    <td *ngIf="isAdmin">
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editProduct(product)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteProduct(product)" />
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="productDialog" [style]="{ width: '450px' }" header="Product Details" [modal]="true">
            <ng-template #content>
                <div class="flex flex-col gap-6">
                    <div>
                        <label for="name" class="block font-bold mb-3">Name</label>
                        <input type="text" pInputText id="name" [(ngModel)]="product.name" required autofocus fluid />
                        <small class="text-red-500" *ngIf="submitted && !product.name">Name is required.</small>
                    </div>
                    <div>
                        <label for="sku" class="block font-bold mb-3">SKU</label>
                        <input type="text" pInputText id="sku" [(ngModel)]="product.sku" required fluid />
                         <small class="text-red-500" *ngIf="submitted && !product.sku">SKU is required.</small>
                    </div>
                    <div>
                        <label for="description" class="block font-bold mb-3">Description</label>
                        <textarea id="description" pTextarea [(ngModel)]="product.description" rows="3" fluid></textarea>
                    </div>
                     <div>
                        <label for="category" class="block font-bold mb-3">Category</label>
                        <p-select [(ngModel)]="product.category" inputId="category" [options]="categories" optionLabel="label" optionValue="value" placeholder="Select a Category" appendTo="body" fluid />
                        <small class="text-red-500" *ngIf="submitted && !product.category">Category is required.</small>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="list_price" class="block font-bold mb-3">List Price</label>
                            <input type="number" placeholder="22.8" pInputText id="list_price" [(ngModel)]="product.list_price" fluid />
                        </div>
                        <div>
                            <label for="segment" class="block font-bold mb-3">Segment</label>
                            <p-select [(ngModel)]="product.segment" inputId="segment" [options]="segments" optionLabel="label" optionValue="value" placeholder="Select Segment" appendTo="body" fluid />
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="billing_cycle" class="block font-bold mb-3">Billing Cycle</label>
                            <p-select [(ngModel)]="product.billing_cycle" inputId="billing_cycle" [options]="cycles" optionLabel="label" optionValue="value" placeholder="Select Cycle" appendTo="body" fluid />
                        </div>
                        <div>
                            <label for="term" class="block font-bold mb-3">Term</label>
                            <p-select [(ngModel)]="product.term" inputId="term" [options]="terms" optionLabel="label" optionValue="value" placeholder="Select Term" appendTo="body" fluid />
                        </div>
                    </div>

                    <div>
                        <label for="status" class="block font-bold mb-3">Status</label>
                        <p-select [(ngModel)]="product.status" inputId="status" [options]="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status" appendTo="body" fluid />
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                <p-button label="Save" icon="pi pi-check" (click)="saveProduct()" />
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [ProductService]
})
export class ProductPage implements OnInit {
    productDialog: boolean = false;

    products = signal<Product[]>([]);

    product: Partial<Product> = {};

    selectedProducts!: Product[] | null;

    submitted: boolean = false;

    statuses!: any[];
    cycles!: any[];
    terms!: any[];
    categories!: any[];
    segments!: any[];

    @ViewChild('dt') dt!: Table;

    exportColumns!: ExportColumn[];

    cols!: Column[];

    constructor(
        private productService: ProductService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService
    ) {}

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadProducts();

        this.statuses = [
            { label: 'Active', value: 'Active' },
            { label: 'Discontinued', value: 'Discontinued' }
        ];

        this.cycles = [
            { label: 'Monthly', value: 'Monthly' },
            { label: 'Annual', value: 'Annual' },
            { label: 'Triennial', value: 'Triennial' },
            { label: 'OneTime', value: 'OneTime' }
        ];

        this.terms = [
            { label: '1 Month', value: '1Month' },
            { label: '1 Year', value: '1Year' },
            { label: '3 Years', value: '3Years' },
            { label: 'Perpetual', value: 'Perpetual' }
        ];

        this.categories = [
            { label: 'License-based services', value: 'License-based services' },
            { label: 'Software', value: 'Software' },
            { label: 'Azure', value: 'Azure' },
            { label: 'Azure Reservation', value: 'Azure Reservation' }
        ];

        this.segments = [
            { label: 'Commercial', value: 'Commercial' },
            { label: 'NonProfit', value: 'NonProfit' },
            { label: 'Education', value: 'Education' }
        ];

        this.cols = [
            { field: 'name', header: 'Name' },
            { field: 'sku', header: 'SKU' },
            { field: 'category', header: 'Category' },
            { field: 'list_price', header: 'List Price' },
            { field: 'segment', header: 'Segment' },
            { field: 'billing_cycle', header: 'Billing Cycle' },
            { field: 'term', header: 'Term' },
            { field: 'status', header: 'Status' }
        ];

        this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    }

    get isAdmin() {
        return this.authService.hasRole('Admin');
    }

    loadProducts() {
        this.productService.getProducts().subscribe((response) => {
            if (response.success) {
                this.products.set(response.products);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    openNew() {
        this.product = {};
        this.submitted = false;
        this.productDialog = true;
    }

    editProduct(product: Product) {
        this.product = { ...product };
        this.productDialog = true;
    }

    deleteSelectedProducts() {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected products?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                // Naive bulk delete simulation/loop
                if (this.selectedProducts) {
                    this.products.set(this.products().filter((val) => !this.selectedProducts?.includes(val)));
                    this.selectedProducts = null;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Products Deleted',
                        life: 3000
                    });
                }
            }
        });
    }

    hideDialog() {
        this.productDialog = false;
        this.submitted = false;
    }

    deleteProduct(product: Product) {
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + product.name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.productService.deleteProduct(product.id!).subscribe({
                    next: (res) => {
                        if (res.success) {
                            this.products.set(this.products().filter((val) => val.id !== product.id));
                            this.product = {};
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Product Deleted',
                                life: 3000
                            });
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete product',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to delete product',
                            life: 3000
                        });
                    }
                });
            }
        });
    }

    getSeverity(status: string) {
        switch (status) {
            case 'Active':
                return 'success';
            case 'Discontinued':
                return 'danger';
            default:
                return 'info';
        }
    }

    saveProduct() {
        this.submitted = true;

        if (this.product.name?.trim() && this.product.sku?.trim() && this.product.category) {
            if (this.product.id) {
                this.productService.updateProduct(this.product.id, this.product).subscribe({
                    next: (res) => {
                        if (res.success) {
                            const _products = this.products();
                            const index = _products.findIndex((p) => p.id === this.product.id);
                            _products[index] = res.product;
                            this.products.set([..._products]);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Product Updated',
                                life: 3000
                            });
                            this.productDialog = false;
                            this.product = {};
                        } else {
                             this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to update product',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to update product',
                            life: 3000
                        });
                    }
                });
            } else {
                this.productService.createProduct(this.product).subscribe({
                    next: (res) => {
                        if (res.success) {
                            this.products.set([...this.products(), res.product]);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Product Created',
                                life: 3000
                            });
                            this.productDialog = false;
                            this.product = {};
                        } else {
                             this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to create product',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to create product',
                            life: 3000
                        });
                    }
                });
            }
        }
    }
}