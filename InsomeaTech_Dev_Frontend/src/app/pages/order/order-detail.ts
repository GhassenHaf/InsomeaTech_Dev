import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { OrderService } from '../../services/order.service';
import { OrderLineService } from '../../services/order-line.service';
import { AuthService } from '../../services/auth.service';
import { Order } from '../../models/order.model';
import { OrderLine } from '../../models/order-line.model';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-order-detail',
    standalone: true,
    imports: [
        CommonModule,
        RouterModule,
        ButtonModule,
        TableModule,
        TagModule,
        DatePickerModule,
        SelectModule,
        DialogModule,
        InputTextModule,
        FileUploadModule,
        FormsModule
    ],
    template: `
        <div class="flex flex-col gap-6">
            <div class="card">
                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center gap-2">
                        <p-button icon="pi pi-arrow-left" [rounded]="true" [text]="true" severity="secondary" routerLink="/pages/order" />
                        <span class="text-900 font-bold text-xl">Order {{ order?.order_number }}</span>
                        
                        <p-tag [value]="order?.status_order" [severity]="getOrderSeverity(order?.status_order || '')" />

                         <p-button 
                            *ngIf="canCancel" 
                            label="Cancel Order" 
                            icon="pi pi-times-circle" 
                            severity="danger" 
                            [outlined]="true" 
                            (onClick)="openCancelDialog()" 
                            class="ml-2"
                        />
                    </div>
                    <div class="flex gap-2">
                         <p-button label="Download Customer PO" icon="pi pi-download" severity="info" *ngIf="order?.lpo_url" (onClick)="downloadFile('lpo')" />
                         <p-button label="Download SO" icon="pi pi-download" severity="info" *ngIf="order?.so_url" (onClick)="downloadFile('so')" />
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label class="block font-bold mb-1">Customer</label>
                        <span>{{ order?.customer_name }}</span>
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Order Date</label>
                        <span>{{ order?.order_date | date:'mediumDate' }}</span>
                    </div>
                    <div>
                        <label class="block font-bold mb-1">Sales Person</label>
                        <span>{{ order?.sales_person_name }}</span>
                    </div>
                </div>
                <div class="mt-4" *ngIf="order?.notes">
                    <label class="block font-bold mb-1">Notes</label>
                    <p class="bg-gray-100 p-2 rounded">{{ order?.notes }}</p>
                </div>
            </div>

            <!-- Finance Section -->
            <div class="card" *ngIf="canSeeFinanceSection">
                <div class="flex items-center justify-between mb-2">
                    <span class="block text-900 font-bold text-lg">Finance Details</span>
                    
                    <p-button *ngIf="needsFinanceApproval && isFinanceOrAdmin" 
                              label="Approve Order" 
                              icon="pi pi-check-square" 
                              severity="success" 
                              (onClick)="openFinanceDialog()" />
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4" *ngIf="order?.po_number">
                     <div>
                        <label class="block font-bold mb-1">PO Number</label>
                        <span class="text-lg">{{ order?.po_number }}</span>
                    </div>
                    <div *ngIf="order?.disti_po_url">
                         <label class="block font-bold mb-1">Distributor PO</label>
                         <p-button label="Download Disti PO" icon="pi pi-download" [text]="true" (onClick)="downloadFile('disti_po')" />
                    </div>
                </div>
                <div *ngIf="!order?.po_number && !needsFinanceApproval" class="text-gray-500 italic">
                    No finance details available.
                </div>
            </div>

            <!-- Provisioning Action -->
            <div class="card bg-blue-50 border-blue-200 border" *ngIf="canStartProvisioning">
                 <div class="flex items-center justify-between">
                    <div>
                        <span class="block font-bold text-lg text-blue-900">Provisioning Ready</span>
                        <span class="text-blue-700">Finance has approved this order. You can now start the provisioning process.</span>
                    </div>
                    <p-button label="Start Provisioning" icon="pi pi-cog" (onClick)="startProvisioning()" />
                 </div>
            </div>

            <div class="card">
                <span class="block text-900 font-bold text-lg mb-4">Order Items</span>
                <p-table [value]="orderLines()" [rowHover]="true">
                    <ng-template #header>
                        <tr>
                            <th>Product</th>
                            <th>Segment</th>
                            <th>Distributor</th>
                            <th>Billing Cycle</th>
                            <th>Term</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Activated Date</th>
                            <th>Activated By</th>
                            <th style="min-width: 14rem">Expiration Date</th>
                            <th *ngIf="canProvisionItems">Action</th>
                        </tr>
                    </ng-template>
                    <ng-template #body let-line>
                        <tr>
                            <td>
                                <div class="flex flex-col">
                                    <span class="font-bold">{{ line.product_name }}</span>
                                    <span class="text-sm text-gray-500">{{ line.product_sku }}</span>
                                </div>
                            </td>
                            <td>{{ line.segment }}</td>
                            <td>{{ line.disti_name }}</td>
                            <td>{{ line.billing_cycle }}</td>
                            <td>{{ line.term }}</td>
                            <td>{{ line.quantity }}</td>
                            <td>
                                <p-tag [value]="line.status" [severity]="getLineSeverity(line.status)" />
                            </td>
                            <td>
                                <span *ngIf="line.status === 'Activated'">{{ line.activated_date | date:'mediumDate' }}</span>
                            </td>
                            <td>
                                <span *ngIf="line.status === 'Activated'">{{ line.activated_by_name }}</span>
                            </td>
                            <td>
                                <p-datepicker *ngIf="canProvisionItems && line.status !== 'Activated'" [(ngModel)]="line.expiration_date" [showIcon]="true" (onBlur)="updateLineDate(line)" appendTo="body" fluid />
                                <span *ngIf="!canProvisionItems || line.status === 'Activated'">{{ line.expiration_date | date:'mediumDate' }}</span>
                            </td>
                            <td *ngIf="canProvisionItems">
                                <p-button label="Activate" icon="pi pi-check" 
                                          *ngIf="line.status !== 'Activated'" 
                                          [disabled]="!line.expiration_date" 
                                          (onClick)="activateLine(line)" />
                                <span *ngIf="line.status === 'Activated'" class="text-green-600 font-bold">
                                    <i class="pi pi-check-circle"></i> Activated
                                </span>
                            </td>
                        </tr>
                    </ng-template>
                </p-table>
            </div>
        </div>

        <!-- Finance Approval Dialog -->
        <p-dialog header="Finance Approval" [(visible)]="financeDialogVisible" [modal]="true" [style]="{width: '450px'}" [draggable]="false" [resizable]="false">
            <div class="flex flex-col gap-4">
                <p>Please enter the PO Number and optionally upload the Distributor PO file to approve this order.</p>
                
                <div class="flex flex-col gap-2">
                    <label for="poNumber" class="font-bold">PO Number <span class="text-red-500">*</span></label>
                    <input pInputText id="poNumber" [(ngModel)]="poNumber" placeholder="Enter PO Number" />
                </div>

                <div class="flex flex-col gap-2">
                    <label class="font-bold">Distributor PO File (Optional)</label>
                    <p-fileupload mode="basic" chooseLabel="Select File" accept="image/*,application/pdf" maxFileSize="10000000" (onSelect)="onFinanceFileSelect($event)"></p-fileupload>
                    <small *ngIf="financeFile" class="text-green-600">{{ financeFile.name }} selected</small>
                </div>
            </div>
            <ng-template pTemplate="footer">
                <p-button label="Cancel" icon="pi pi-times" [text]="true" (onClick)="financeDialogVisible = false" />
                <p-button label="Approve & Send" icon="pi pi-check" severity="success" [disabled]="!poNumber" [loading]="financeLoading" (onClick)="submitFinanceApproval()" />
            </ng-template>
        </p-dialog>

        <!-- Cancellation Dialog -->
        <p-dialog header="Cancel Order" [(visible)]="cancelDialogVisible" [modal]="true" [style]="{width: '450px'}" [draggable]="false" [resizable]="false">
            <div class="flex flex-col gap-4">
                <p class="text-red-600 font-bold">Warning: This action cannot be undone.</p>
                <p>Please provide a reason for cancelling this order.</p>
                
                <div class="flex flex-col gap-2">
                    <label for="cancelReason" class="font-bold">Cancellation Reason <span class="text-red-500">*</span></label>
                    <textarea pInputTextarea id="cancelReason" [(ngModel)]="cancelReason" rows="3" placeholder="Enter reason..." class="w-full border p-2 rounded"></textarea>
                </div>
            </div>
            <ng-template pTemplate="footer">
                <p-button label="Close" icon="pi pi-times" [text]="true" (onClick)="cancelDialogVisible = false" />
                <p-button label="Confirm Cancel" icon="pi pi-trash" severity="danger" [disabled]="!cancelReason" [loading]="cancelLoading" (onClick)="submitCancel()" />
            </ng-template>
        </p-dialog>
    `
})
export class OrderDetailPage implements OnInit {
    order: Order | null = null;
    orderLines = signal<OrderLine[]>([]);

    // Finance Dialog State
    financeDialogVisible = false;
    poNumber = '';
    financeFile: File | null = null;
    financeLoading = false;

    // Cancel Dialog State
    cancelDialogVisible = false;
    cancelReason = '';
    cancelLoading = false;

    constructor(
        private route: ActivatedRoute,
        private orderService: OrderService,
        private orderLineService: OrderLineService,
        private authService: AuthService,
        private messageService: MessageService,
        private router: Router
    ) {}

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadOrder(id);
        }
    }

    // --- Role & Status Helpers ---

    get userRole() {
        return this.authService.getUserRole();
    }

    get isFinanceOrAdmin() {
        return this.userRole === 'Finance' || this.userRole === 'Admin';
    }

    get isTechOrAdmin() {
        return this.userRole === 'Technical' || this.userRole === 'Admin';
    }

    get needsFinanceApproval() {
        return this.order?.status_order === 'WaitingForFinanceApproval';
    }

    get canSeeFinanceSection() {
        // Show if approved (has PO data) OR if waiting approval (and user is relevant)
        return !!this.order?.po_number || this.needsFinanceApproval;
    }

    get canStartProvisioning() {
        return this.order?.status_order === 'ToBeProvisioned' && this.isTechOrAdmin;
    }

    get canProvisionItems() {
        // Only allow activating items if provisioning has started
        return (this.order?.status_order === 'UnderProcessing' || this.order?.status_order === 'DistiProcessing') && this.isTechOrAdmin;
    }

    get canCancel() {
        if (!this.order || this.order.status_order === 'Done' || this.order.status_order === 'Cancelled') return false;
        
        if (this.userRole === 'Admin') return true;
        
        if (this.userRole === 'Finance' && this.order.status_order === 'WaitingForFinanceApproval') return true;
        
        return false;
    }

    // --- Data Loading ---

    loadOrder(id: string) {
        this.orderService.getOrder(id).subscribe(res => {
            if (res.success) {
                this.order = res.order;
                this.loadOrderLines(id);
            }
        });
    }

    loadOrderLines(orderId: string) {
        this.orderLineService.getOrderLines(orderId).subscribe(res => {
            if (res.success) {
                const lines = res.orderLines.map(line => ({
                    ...line,
                    expiration_date: line.expiration_date ? new Date(line.expiration_date) : this.calculateDefaultExp(line)
                })) as any[];
                this.orderLines.set(lines);
            }
        });
    }

    calculateDefaultExp(line: OrderLine): Date {
        if (!this.order?.order_date) return new Date();
        const orderDate = new Date(this.order.order_date);
        
        switch (line.term) {
            case '1Year':
                orderDate.setFullYear(orderDate.getFullYear() + 1);
                break;
            case '1Month':
                orderDate.setMonth(orderDate.getMonth() + 1);
                break;
            case '3Years':
                orderDate.setFullYear(orderDate.getFullYear() + 3);
                break;
            case 'Perpetual':
                orderDate.setFullYear(orderDate.getFullYear() + 100);
                break;
            default:
                if (line.term === 'Annual') orderDate.setFullYear(orderDate.getFullYear() + 1);
                else if (line.term === 'Monthly') orderDate.setMonth(orderDate.getMonth() + 1);
                else if (line.term === 'Triennial') orderDate.setFullYear(orderDate.getFullYear() + 3);
                else orderDate.setFullYear(orderDate.getFullYear() + 1); 
                break;
        }
        return orderDate;
    }

    // --- Actions ---

    openFinanceDialog() {
        this.poNumber = '';
        this.financeFile = null;
        this.financeDialogVisible = true;
    }

    onFinanceFileSelect(event: any) {
        if (event.files && event.files.length > 0) {
            this.financeFile = event.files[0];
        }
    }

    submitFinanceApproval() {
        if (!this.order || !this.poNumber) return;

        this.financeLoading = true;
        this.orderService.financeApprove(this.order.id, this.poNumber, this.financeFile || undefined).subscribe({
            next: (res) => {
                if (res.success) {
                    this.messageService.add({ severity: 'success', summary: 'Approved', detail: 'Order approved and sent to provisioning' });
                    this.financeDialogVisible = false;
                    this.loadOrder(this.order!.id); // Reload to update UI
                }
                this.financeLoading = false;
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to approve order' });
                this.financeLoading = false;
            }
        });
    }

    startProvisioning() {
        if (!this.order) return;

        this.orderService.startProvisioning(this.order.id).subscribe({
            next: (res) => {
                if (res.success) {
                    this.messageService.add({ severity: 'success', summary: 'Started', detail: 'Provisioning process started' });
                    this.loadOrder(this.order!.id);
                }
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to start provisioning' });
            }
        });
    }

    openCancelDialog() {
        this.cancelReason = '';
        this.cancelDialogVisible = true;
    }

    submitCancel() {
        if (!this.order || !this.cancelReason) return;

        this.cancelLoading = true;
        this.orderService.cancelOrder(this.order.id, this.cancelReason).subscribe({
            next: (res) => {
                if (res.success) {
                    this.messageService.add({ severity: 'success', summary: 'Cancelled', detail: 'Order has been cancelled' });
                    this.cancelDialogVisible = false;
                    this.loadOrder(this.order!.id);
                }
                this.cancelLoading = false;
            },
            error: (err) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: err.error?.error || 'Failed to cancel order' });
                this.cancelLoading = false;
            }
        });
    }

    updateLineDate(line: any) {
        if (line.expiration_date) {
            this.orderLineService.updateOrderLine(line.id, { 
                expiration_date: line.expiration_date instanceof Date ? line.expiration_date.toISOString() : line.expiration_date 
            }).subscribe();
        }
    }

    activateLine(line: any) {
        const dateStr = line.expiration_date instanceof Date ? line.expiration_date.toISOString() : line.expiration_date;
        
        this.orderLineService.updateOrderLine(line.id, { expiration_date: dateStr }).subscribe(() => {
            this.orderLineService.activate(line.id).subscribe(res => {
                if (res.success) {
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Product activated' });
                    line.status = 'Activated';
                    if (res.orderLine) {
                        line.activated_date = res.orderLine.activated_date;
                        line.activated_by_name = 'You'; // Optimistic update
                    }
                    this.checkOrderCompletion();
                }
            });
        });
    }

    checkOrderCompletion() {
        const allActivated = this.orderLines().every(l => l.status === 'Activated');
        if (allActivated && this.order && this.order.status_order !== 'Done') {
            this.orderService.updateStatus(this.order.id, 'Done').subscribe(() => {
                if (this.order) this.order.status_order = 'Done';
            });
        }
    }

    downloadFile(type: 'lpo' | 'so' | 'proof_tech' | 'disti_po') {
        if (!this.order) return;
        this.orderService.downloadFile(this.order.id, type as any).subscribe(res => {
            if (res.success && res.fileUrl) {
                window.open(res.fileUrl, '_blank');
            }
        });
    }

    getOrderSeverity(status: string) {
        switch (status) {
            case 'Done': return 'success';
            case 'UnderProcessing': return 'info';
            case 'ToBeProvisioned': return 'info';
            case 'WaitingForFinanceApproval': return 'warn';
            case 'Cancelled': return 'danger';
            default: return 'secondary';
        }
    }

    getLineSeverity(status: string) {
        switch (status) {
            case 'Activated': return 'success';
            case 'UnderProcessing': return 'info';
            case 'Pending': return 'warn';
            case 'Cancelled': return 'danger';
            default: return 'info';
        }
    }
}
