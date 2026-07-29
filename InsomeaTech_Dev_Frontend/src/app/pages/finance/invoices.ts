import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ZohoInvoice } from '../../models/zoho-invoice.model';
import { ZohoInvoiceService } from '../../services/zoho-invoice.service';

@Component({
    selector: 'app-invoices',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TableModule,
        ButtonModule,
        RippleModule,
        ToastModule,
        ToolbarModule,
        InputTextModule,
        DialogModule,
        TagModule,
        IconFieldModule,
        InputIconModule,
        TooltipModule
    ],
    template: `
        <div class="card">
            <p-toast />
            <p-toolbar styleClass="mb-6">
                <ng-template #start>
                    <p-button label="Manual Invoice" icon="pi pi-plus" severity="secondary" (onClick)="loadInvoices()" />
                </ng-template>

                <ng-template #end>
                    <p-button label="Export" icon="pi pi-upload" severity="secondary" (onClick)="dt.exportCSV()" />
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="invoices()"
                [rows]="10"
                [paginator]="true"
                [globalFilterFields]="['zoho_invoice_id', 'zoho_invoice_number', 'ttn_ref', 'status']"
                [tableStyle]="{ 'min-width': '75rem' }"
                [rowHover]="true"
                dataKey="id"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} invoices"
                [showCurrentPageReport]="true"
                [rowsPerPageOptions]="[10, 20, 30]"
            >
                <ng-template #caption>
                    <div class="flex items-center justify-between">
                        <h5 class="m-0">Zoho Invoices</h5>
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                        </p-iconfield>
                    </div>
                </ng-template>
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="zoho_invoice_id">
                            Zoho Invoice ID
                            <p-sortIcon field="zoho_invoice_id" />
                        </th>
                        <th pSortableColumn="zoho_invoice_number">
                            Invoice Number
                            <p-sortIcon field="zoho_invoice_number" />
                        </th>
                        <th>Zoho JSON</th>
                        <th pSortableColumn="ttn_ref">
                            TTN Ref
                            <p-sortIcon field="ttn_ref" />
                        </th>
                        <th pSortableColumn="status">
                            Status
                            <p-sortIcon field="status" />
                        </th>
                        <th pSortableColumn="created_at">
                            Created Date
                            <p-sortIcon field="created_at" />
                        </th>
                        <th>Actions</th>
                    </tr>
                </ng-template>
                <ng-template #body let-invoice>
                    <tr>
                        <td>{{ invoice.zoho_invoice_id }}</td>
                        <td>{{ invoice.zoho_invoice_number }}</td>
                        <td>
                            <p-button 
                                icon="pi pi-code" 
                                [rounded]="true" 
                                [outlined]="true" 
                                severity="info" 
                                (click)="showJson(invoice)" 
                                pTooltip="View Zoho JSON" 
                                tooltipPosition="top" 
                            />
                        </td>
                        <td>{{ invoice.ttn_ref }}</td>
                        <td>
                            <p-tag [value]="invoice.status" [severity]="getSeverity(invoice.status)" />
                        </td>
                                                <td>{{ invoice.created_at | date:'medium' }}</td>
                                                <td>
                                                    <div class="flex gap-2">
                                                        <p-button 
                                                            *ngIf="invoice.status === 'ReceivedZoho'"
                                                            icon="pi pi-cog" 
                                                            [rounded]="true" 
                                                            [outlined]="true" 
                                                            severity="warn" 
                                                            (click)="convertToXML(invoice)" 
                                                            pTooltip="Convert to XML" 
                                                            tooltipPosition="top" 
                                                        />
                                                        <p-button 
                                                            *ngIf="invoice.status === 'XmlConverted'"
                                                            icon="pi pi-pencil" 
                                                            [rounded]="true" 
                                                            [outlined]="true" 
                                                            severity="secondary" 
                                                            (click)="signXML(invoice)" 
                                                            pTooltip="Sign XML" 
                                                            tooltipPosition="top" 
                                                        />
                                                        <p-button 
                                                            *ngIf="invoice.status === 'XmlSigned'"
                                                            icon="pi pi-send" 
                                                            [rounded]="true" 
                                                            [outlined]="true" 
                                                            severity="contrast" 
                                                            (click)="submitToTTN(invoice)" 
                                                            pTooltip="Submit to TTN" 
                                                            tooltipPosition="top" 
                                                        />
                                                        <p-button 
                                                            *ngIf="invoice.status === 'SentToTttn' || invoice.status === 'TTNApproved'"
                                                            icon="pi pi-search" 
                                                            [rounded]="true" 
                                                            [outlined]="true" 
                                                            severity="info" 
                                                            (click)="consultTTN(invoice)" 
                                                            pTooltip="Consult TTN Status" 
                                                            tooltipPosition="top" 
                                                        />
                                                        <p-button 
                                                            icon="pi pi-exclamation-circle" 
                                                            [rounded]="true" 
                                                            [outlined]="true" 
                                                            severity="danger" 
                                                            (click)="showErrors(invoice)" 
                                                            pTooltip="View Logs/Errors" 
                                                            tooltipPosition="top" 
                                                        />
                                                    </div>
                                                </td>                    </tr>
                </ng-template>
            </p-table>
        </div>

        <p-dialog [(visible)]="jsonDialog" [header]="'Zoho JSON: ' + selectedInvoiceNumber" [modal]="true" [style]="{ width: '70vw' }" [maximizable]="true">
            <pre class="bg-gray-100 p-4 rounded overflow-auto max-h-96"><code>{{ selectedJson | json }}</code></pre>
            <ng-template #footer>
                <p-button label="Close" icon="pi pi-times" text (click)="jsonDialog = false" />
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="errorDialog" [header]="'Invoice Logs: ' + selectedInvoiceNumber" [modal]="true" [style]="{ width: '70vw' }" [maximizable]="true">
            <pre class="bg-gray-100 p-4 rounded overflow-auto max-h-96"><code>{{ selectedErrors | json }}</code></pre>
            <ng-template #footer>
                <p-button label="Close" icon="pi pi-times" text (click)="errorDialog = false" />
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="pinDialog" header="Enter Token PIN" [modal]="true" [style]="{ width: '300px' }">
            <div class="flex flex-col gap-4">
                <label for="pin" class="font-bold">PIN</label>
                <input pInputText type="password" id="pin" [(ngModel)]="tokenPin" placeholder="Enter Token PIN" (keyup.enter)="submitSignXML()" />
            </div>
            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="pinDialog = false" />
                <p-button label="Sign" icon="pi pi-check" [loading]="signing" (click)="submitSignXML()" />
            </ng-template>
        </p-dialog>
    `,
    providers: [ZohoInvoiceService, MessageService]
})
export class InvoicesPage implements OnInit {
    invoices = signal<ZohoInvoice[]>([]);
    jsonDialog: boolean = false;
    selectedJson: any = null;
    selectedInvoiceNumber: string = '';

    errorDialog: boolean = false;
    selectedErrors: any = null;

    pinDialog: boolean = false;
    tokenPin: string = '';
    signing: boolean = false;
    currentInvoiceToSign: ZohoInvoice | null = null;

    @ViewChild('dt') dt!: Table;

    constructor(
        private zohoInvoiceService: ZohoInvoiceService,
        private messageService: MessageService
    ) {}

    ngOnInit() {
        this.loadInvoices();
    }

    loadInvoices() {
        this.zohoInvoiceService.getInvoices().subscribe({
            next: (response) => {
                if (response.success) {
                    this.invoices.set(response.data);
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Failed to load invoices',
                    life: 3000
                });
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    showJson(invoice: ZohoInvoice) {
        this.selectedJson = invoice.json_zoho;
        this.selectedInvoiceNumber = invoice.zoho_invoice_number || invoice.id;
        this.jsonDialog = true;
    }

    showErrors(invoice: ZohoInvoice) {
        this.selectedErrors = invoice.errors;
        this.selectedInvoiceNumber = invoice.zoho_invoice_number || invoice.id;
        this.errorDialog = true;
    }

    convertToXML(invoice: ZohoInvoice) {
        this.zohoInvoiceService.convertToXML(invoice.id).subscribe({
            next: (response) => {
                if (response.success) {
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: response.message,
                        life: 3000
                    });
                    this.loadInvoices(); // Refresh list
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'Failed to convert invoice',
                    life: 3000
                });
            }
        });
    }

    signXML(invoice: ZohoInvoice) {
        this.currentInvoiceToSign = invoice;
        this.tokenPin = '';
        this.pinDialog = true;
    }

    submitSignXML() {
        if (!this.tokenPin) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Warning',
                detail: 'Please enter your token PIN',
                life: 3000
            });
            return;
        }

        if (!this.currentInvoiceToSign) return;

        this.signing = true;

        // Step 1: Get unsigned XML (Base64) from backend
        this.zohoInvoiceService.getUnsignedXML(this.currentInvoiceToSign.id).subscribe({
            next: (res) => {
                if (res.success && res.xml_base64) {
                    // Step 2: Call the Local Agent from the Browser
                    this.zohoInvoiceService.signWithLocalAgent(res.xml_base64, this.tokenPin).subscribe({
                        next: (agentRes) => {
                            if (agentRes.signedXml) {
                                // Step 3: Send signed XML back to backend to save
                                if (!this.currentInvoiceToSign) return;
                                this.zohoInvoiceService.saveSignedXML(this.currentInvoiceToSign.id, agentRes.signedXml).subscribe({
                                    next: (finalRes) => {
                                        this.signing = false;
                                        if (finalRes.success) {
                                            this.messageService.add({
                                                severity: 'success',
                                                summary: 'Successful',
                                                detail: finalRes.message,
                                                life: 3000
                                            });
                                            this.pinDialog = false;
                                            this.loadInvoices();
                                        }
                                    },
                                    error: (err) => {
                                        this.signing = false;
                                        this.messageService.add({
                                            severity: 'error',
                                            summary: 'Error',
                                            detail: err.error?.error || 'Failed to save signed XML on server',
                                            life: 3000
                                        });
                                    }
                                });
                            } else {
                                this.signing = false;
                                this.messageService.add({
                                    severity: 'error',
                                    summary: 'Error',
                                    detail: 'Local agent returned no signed XML',
                                    life: 3000
                                });
                            }
                        },
                        error: (err) => {
                            this.signing = false;
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Signing Agent Error',
                                detail: 'Could not connect to local signing agent or PIN is incorrect. Ensure the agent is running at http://localhost:7797',
                                life: 5000
                            });
                        }
                    });
                } else {
                    this.signing = false;
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'Failed to retrieve XML for signing',
                        life: 3000
                    });
                }
            },
            error: (err) => {
                this.signing = false;
                this.messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: err.error?.error || 'Failed to fetch unsigned XML from server',
                    life: 3000
                });
            }
        });
    }

    submitToTTN(invoice: ZohoInvoice) {
        if (!invoice.xml_with_sign) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invoice has no signed XML to submit',
                life: 3000
            });
            return;
        }

        this.messageService.add({ severity: 'info', summary: 'Processing', detail: 'Fetching TTN config...', life: 1000 });

        // Step 1: Fetch Dynamic TTN Config (arg0, arg1, arg2)
        this.zohoInvoiceService.getTTNConfig().subscribe({
            next: (configRes) => {
                if (configRes.success) {
                    const { arg0, arg1, arg2 } = configRes.config;

                    // Step 2: Prepare Base64 XML (arg3) - Safe UTF-8 encoding
                    const arg3 = btoa(unescape(encodeURIComponent(invoice.xml_with_sign || '')));

                    this.messageService.add({ severity: 'info', summary: 'Processing', detail: 'Submitting to TTN via local agent...', life: 2000 });
                    console.log('TTN Config:', { arg0, arg1, arg2 });

                    // Step 3: Call Local Agent with 4 arguments
                    this.zohoInvoiceService.submitToLocalAgent(arg0, arg1, arg2, arg3).subscribe({
                        next: (xmlResponse: string) => {
                            // XML check: Success if S:Fault is NOT present
                            const isActuallySuccessful = !xmlResponse.includes('S:Fault');

                            this.zohoInvoiceService.updateTtnSubmit(invoice.id, { 
                                success: isActuallySuccessful, 
                                agentResponse: xmlResponse 
                            }).subscribe({
                                next: (finalRes) => {
                                    if (finalRes.success) {
                                        this.messageService.add({
                                            severity: isActuallySuccessful ? 'success' : 'error',
                                            summary: isActuallySuccessful ? 'Successful' : 'Portal Rejected',
                                            detail: isActuallySuccessful ? 'Invoice submitted successfully' : 'Portal returned a fault (S:Fault)',
                                            life: 5000
                                        });
                                        this.loadInvoices();
                                    }
                                },
                                error: (err) => {
                                    this.messageService.add({
                                        severity: 'error',
                                        summary: 'Backend Error',
                                        detail: 'Failed to record submission attempt on server',
                                        life: 5000
                                    });
                                }
                            });
                        },
                        error: (err) => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Agent Connection Error',
                                detail: 'The local agent failed to respond. Ensure it is running at localhost:7797',
                                life: 5000
                            });
                        }
                    });
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Config Error',
                    detail: 'Failed to fetch TTN configuration from backend',
                    life: 3000
                });
            }
        });
    }

    consultTTN(invoice: ZohoInvoice) {
        if (!invoice.zoho_invoice_number) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invoice has no number to consult',
                life: 3000
            });
            return;
        }

        this.messageService.add({ severity: 'info', summary: 'Processing', detail: 'Fetching TTN config...', life: 1000 });

        // Step 1: Fetch Dynamic TTN Config
        this.zohoInvoiceService.getTTNConfig().subscribe({
            next: (configRes) => {
                if (configRes.success) {
                    const { arg0, arg1, arg2 } = configRes.config;

                    this.messageService.add({ severity: 'info', summary: 'Processing', detail: 'Consulting TTN status via local agent...', life: 2000 });

                    // Step 2: Call Local Agent to Consult
                    this.zohoInvoiceService.consultLocalAgent(arg0, arg1, arg2, invoice.zoho_invoice_number || '').subscribe({
                        next: (xmlResponse: string) => {
                            // Step 3: Parse XML for generatedRef and xmlContent
                            // Simple extraction using regex or string splits
                            const generatedRefMatch = xmlResponse.match(/<generatedRef>(.*?)<\/generatedRef>/);
                            const xmlContentMatch = xmlResponse.match(/<xmlContent>(.*?)<\/xmlContent>/);

                            const ttn_ref = generatedRefMatch ? generatedRefMatch[1] : null;
                            const ttn_code = xmlContentMatch ? xmlContentMatch[1] : null;
                            const isActuallySuccessful = !!(ttn_ref && ttn_code);

                            // Step 4: Record result on Backend
                            this.zohoInvoiceService.updateTtnConsult(invoice.id, {
                                success: isActuallySuccessful,
                                ttn_ref: ttn_ref || undefined,
                                ttn_code: ttn_code || undefined,
                                agentResponse: xmlResponse
                            }).subscribe({
                                next: (finalRes) => {
                                    if (finalRes.success) {
                                        this.messageService.add({
                                            severity: isActuallySuccessful ? 'success' : 'warn',
                                            summary: isActuallySuccessful ? 'Consultation Complete' : 'Still Pending',
                                            detail: isActuallySuccessful ? 'Invoice Approved and TTN identifiers saved' : 'Invoice not yet processed or approved (logged)',
                                            life: 5000
                                        });
                                        this.loadInvoices();
                                    }
                                },
                                error: (err) => {
                                    this.messageService.add({
                                        severity: 'error',
                                        summary: 'Backend Error',
                                        detail: 'Failed to update consultation results on server',
                                        life: 5000
                                    });
                                }
                            });
                        },
                        error: (err) => {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Agent Connection Error',
                                detail: 'The local agent failed to respond. Ensure it is running at localhost:7797',
                                life: 5000
                            });
                        }
                    });
                }
            },
            error: (err) => {
                this.messageService.add({
                    severity: 'error',
                    summary: 'Config Error',
                    detail: 'Failed to fetch TTN configuration from backend',
                    life: 3000
                });
            }
        });
    }

    getSeverity(status: string) {
        switch (status) {
            case 'TTNApproved':
                return 'success';
            case 'ReceivedZoho':
                return 'info';
            case 'XmlConverted':
                return 'warn';
            case 'XmlSigned':
                return 'secondary';
            case 'SentToTttn':
                return 'contrast';
            case 'Error':
                return 'danger';
            default:
                return 'info';
        }
    }
}
