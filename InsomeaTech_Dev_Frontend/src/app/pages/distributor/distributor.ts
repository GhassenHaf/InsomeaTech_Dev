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
import { Distributor } from '../../models/distributor.model';
import { DistributorService } from '../../services/distributor.service';
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
    selector: 'app-distributor',
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
                <p-button severity="secondary" label="Delete" icon="pi pi-trash" outlined (onClick)="deleteSelectedDistributors()" [disabled]="!selectedDistributors || !selectedDistributors.length" *ngIf="isAdmin" />
                -->
            </ng-template>

            <ng-template #end>
                <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
            </ng-template>
        </p-toolbar>

        <p-table
            #dt
            [value]="distributors()"
            [rows]="10"
            [columns]="cols"
            [paginator]="true"
            [globalFilterFields]="['name', 'email_support', 'phone', 'status']"
            [tableStyle]="{ 'min-width': '75rem' }"
            [(selection)]="selectedDistributors"
            [rowHover]="true"
            dataKey="id"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} distributors"
            [showCurrentPageReport]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
        >
            <ng-template #caption>
                <div class="flex items-center justify-between">
                    <h5 class="m-0">Manage Distributors</h5>
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                    </p-iconfield>
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
                    <th pSortableColumn="email_support" style="min-width:14rem">
                        Support Email
                        <p-sortIcon field="email_support" />
                    </th>
                    <th pSortableColumn="phone" style="min-width:12rem">
                        Phone
                        <p-sortIcon field="phone" />
                    </th>
                    <th pSortableColumn="status" style="min-width: 10rem">
                        Status
                        <p-sortIcon field="status" />
                    </th>
                    <th style="min-width: 12rem" *ngIf="isAdmin">Actions</th>
                </tr>
            </ng-template>
            <ng-template #body let-disti>
                <tr>
                    <td style="width: 3rem" *ngIf="isAdmin">
                        <p-tableCheckbox [value]="disti" />
                    </td>
                    <td>
                        <span class="font-bold cursor-pointer hover:underline" (click)="viewDetails(disti)">{{ disti.name }}</span>
                    </td>
                    <td>{{ disti.email_support }}</td>
                    <td>{{ disti.phone }}</td>
                    <td>
                        <p-tag [value]="disti.status" [severity]="getSeverity(disti.status)" />
                    </td>
                    <td *ngIf="isAdmin">
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editDistributor(disti)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteDistributor(disti)" />
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="distributorDialog" [style]="{ width: '450px' }" header="Distributor Details" [modal]="true">
            <ng-template #content>
                <div class="flex flex-col gap-6">
                    <div>
                        <label for="name" class="block font-bold mb-3">Name</label>
                        <input type="text" pInputText id="name" [(ngModel)]="distributor.name" required autofocus fluid />
                        <small class="text-red-500" *ngIf="submitted && !distributor.name">Name is required.</small>
                    </div>
                    <div>
                        <label for="email_support" class="block font-bold mb-3">Support Email</label>
                        <input type="email" pInputText id="email_support" [(ngModel)]="distributor.email_support" required fluid />
                    </div>
                    <div>
                        <label for="phone" class="block font-bold mb-3">Phone</label>
                        <input type="text" pInputText id="phone" [(ngModel)]="distributor.phone" fluid />
                    </div>
                     <div>
                        <label for="partner_link" class="block font-bold mb-3">Partner Link</label>
                        <input type="text" pInputText id="partner_link" [(ngModel)]="distributor.partner_link" fluid />
                    </div>
                    <div>
                        <label for="notes" class="block font-bold mb-3">Notes</label>
                        <textarea id="notes" pTextarea [(ngModel)]="distributor.notes" rows="3" fluid></textarea>
                    </div>

                    <div>
                        <label for="status" class="block font-bold mb-3">Status</label>
                        <p-select [(ngModel)]="distributor.status" inputId="status" [options]="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status" appendTo="body" fluid />
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                <p-button label="Save" icon="pi pi-check" (click)="saveDistributor()" />
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="distributorDetailsDialog" [style]="{ width: '450px' }" [header]="'Details: ' + (viewDistributor?.name || '')" [modal]="true" styleClass="p-fluid">
            <ng-template #content>
                 <div class="flex flex-col gap-4" *ngIf="viewDistributor">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold block mb-1">Name</label>
                            <span>{{ viewDistributor.name }}</span>
                        </div>
                        <div>
                             <label class="font-bold block mb-1">Status</label>
                             <p-tag [value]="viewDistributor.status" [severity]="getSeverity(viewDistributor.status!)" />
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Email</label>
                            <span>{{ viewDistributor.email_support }}</span>
                        </div>
                         <div>
                            <label class="font-bold block mb-1">Phone</label>
                            <span>{{ viewDistributor.phone }}</span>
                        </div>
                    </div>
                    <div>
                        <label class="font-bold block mb-1">Partner Link</label>
                        <div class="flex items-center gap-2" *ngIf="viewDistributor.partner_link">
                            <a [href]="viewDistributor.partner_link" target="_blank" class="text-primary hover:underline break-all">{{ viewDistributor.partner_link }}</a>
                            <p-button icon="pi pi-copy" [rounded]="true" [text]="true" severity="secondary" (onClick)="copyToClipboard(viewDistributor.partner_link)" pTooltip="Copy Link" />
                        </div>
                         <span *ngIf="!viewDistributor.partner_link">-</span>
                    </div>
                     <div *ngIf="viewDistributor.notes">
                        <label class="font-bold block mb-1">Notes</label>
                        <p class="bg-gray-100 p-2 rounded">{{ viewDistributor.notes }}</p>
                    </div>
                </div>
            </ng-template>
             <ng-template #footer>
                <p-button label="Close" icon="pi pi-times" text (click)="distributorDetailsDialog = false" />
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [DistributorService]
})
export class DistributorPage implements OnInit {
    distributorDialog: boolean = false;
    distributorDetailsDialog: boolean = false;

    distributors = signal<Distributor[]>([]);

    distributor: Partial<Distributor> = {};
    viewDistributor: Distributor | null = null;

    selectedDistributors!: Distributor[] | null;

    submitted: boolean = false;

    statuses!: any[];

    @ViewChild('dt') dt!: Table;

    exportColumns!: ExportColumn[];

    cols!: Column[];

    constructor(
        private distributorService: DistributorService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService
    ) {}

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadDistributors();

        this.statuses = [
            { label: 'Active', value: 'Active' },
            { label: 'Inactive', value: 'Inactive' }
        ];

        this.cols = [
            { field: 'name', header: 'Name' },
            { field: 'email_support', header: 'Email' },
            { field: 'phone', header: 'Phone' },
            { field: 'status', header: 'Status' }
        ];

        this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    }

    get isAdmin() {
        return this.authService.hasRole('Admin');
    }

    loadDistributors() {
        this.distributorService.getDistributors().subscribe((response) => {
            if (response.success) {
                this.distributors.set(response.distis);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    copyToClipboard(text: string) {
        navigator.clipboard.writeText(text).then(() => {
            this.messageService.add({ severity: 'success', summary: 'Copied', detail: 'Link copied to clipboard', life: 2000 });
        });
    }

    openNew() {
        this.distributor = {};
        this.submitted = false;
        this.distributorDialog = true;
    }

    editDistributor(disti: Distributor) {
        this.distributor = { ...disti };
        this.distributorDialog = true;
    }

    viewDetails(disti: Distributor) {
        this.viewDistributor = disti;
        this.distributorDetailsDialog = true;
    }

    deleteSelectedDistributors() {
        if(!this.isAdmin) return;
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected distributors?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                if (this.selectedDistributors) {
                    this.distributors.set(this.distributors().filter((val) => !this.selectedDistributors?.includes(val)));
                    this.selectedDistributors = null;
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Distributors Deleted',
                        life: 3000
                    });
                }
            }
        });
    }

    hideDialog() {
        this.distributorDialog = false;
        this.submitted = false;
    }

    deleteDistributor(disti: Distributor) {
        if(!this.isAdmin) {
             this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Delete is restricted to Admins only.',
                life: 3000
            });
            return;
        }
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete ' + disti.name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.distributorService.deleteDistributor(disti.id).subscribe({
                    next: (res) => {
                        if (res.success) {
                            this.distributors.set(this.distributors().filter((val) => val.id !== disti.id));
                            this.distributor = {};
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Distributor Deleted',
                                life: 3000
                            });
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete distributor',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to delete distributor',
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
            case 'Inactive':
                return 'danger';
            default:
                return 'info';
        }
    }

    saveDistributor() {
        this.submitted = true;

        if (this.distributor.name?.trim()) {
            if (this.distributor.id) {
                this.distributorService.updateDistributor(this.distributor.id, this.distributor).subscribe({
                    next: (res) => {
                        if (res.success) {
                            const _distributors = this.distributors();
                            const index = _distributors.findIndex(d => d.id === this.distributor.id);
                            _distributors[index] = res.disti;
                            this.distributors.set([..._distributors]);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Distributor Updated',
                                life: 3000
                            });
                            this.distributorDialog = false;
                            this.distributor = {};
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to update distributor',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to update distributor',
                            life: 3000
                        });
                    }
                });
            } else {
                this.distributorService.createDistributor(this.distributor).subscribe({
                    next: (res) => {
                        if (res.success) {
                            this.distributors.set([...this.distributors(), res.disti]);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Distributor Created',
                                life: 3000
                            });
                            this.distributorDialog = false;
                            this.distributor = {};
                        } else {
                             this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to create distributor',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to create distributor',
                            life: 3000
                        });
                    }
                });
            }
        }
    }
}
