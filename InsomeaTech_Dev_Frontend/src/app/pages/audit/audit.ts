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
import { AuditLog } from '../../models/audit-log.model';
import { AuditService } from '../../services/audit.service';
import { DialogModule } from 'primeng/dialog';

@Component({
    selector: 'app-audit',
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
        DialogModule
    ],
    template: `
        <div class="card">
            <p-toolbar styleClass="mb-4">
                <ng-template #start>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-history text-2xl"></i>
                        <span class="font-bold text-xl">Audit Logs</span>
                    </div>
                </ng-template>
                <ng-template #end>
                    <p-button label="Refresh" icon="pi pi-refresh" severity="secondary" (onClick)="loadAuditLogs()" />
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="auditLogs()"
                [rows]="10"
                [paginator]="true"
                [globalFilterFields]="['entity_type', 'action', 'user_name', 'entity_id', 'ip_address']"
                [tableStyle]="{ 'min-width': '75rem' }"
                [rowHover]="true"
                dataKey="id"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
                [showCurrentPageReport]="true"
                [rowsPerPageOptions]="[10, 20, 50]"
            >
                <ng-template #caption>
                    <div class="flex items-center justify-between">
                        <span class="p-input-icon-left">
                           
                        </span>
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                        </p-iconfield>
                    </div>
                </ng-template>
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="timestamp" style="min-width:12rem">
                            Date/Time
                            <p-sortIcon field="timestamp" />
                        </th>
                        <th pSortableColumn="entity_type" style="min-width:10rem">
                            Entity Type
                            <p-sortIcon field="entity_type" />
                        </th>
                        <th pSortableColumn="entity_id" style="min-width:10rem">
                            Entity ID
                            <p-sortIcon field="entity_id" />
                        </th>
                        <th pSortableColumn="action" style="min-width:10rem">
                            Action
                            <p-sortIcon field="action" />
                        </th>
                        <th pSortableColumn="user_name" style="min-width:12rem">
                            User
                            <p-sortIcon field="user_name" />
                        </th>
                         <th pSortableColumn="ip_address" style="min-width:10rem">
                            IP Address
                            <p-sortIcon field="ip_address" />
                        </th>
                        <th style="min-width: 6rem">Details</th>
                    </tr>
                </ng-template>
                <ng-template #body let-log>
                    <tr>
                        <td>{{ log.timestamp | date:'medium' }}</td>
                        <td>{{ log.entity_type }}</td>
                        <td>{{ log.entity_id }}</td>
                        <td>
                            <span [class]="'badge-status-' + log.action.toLowerCase()">{{ log.action }}</span>
                        </td>
                        <td>{{ log.user_name || log.user_id }}</td>
                        <td>{{ log.ip_address }}</td>
                        <td>
                            <p-button icon="pi pi-eye" [rounded]="true" [text]="true" (click)="viewDetails(log)" />
                        </td>
                    </tr>
                </ng-template>
            </p-table>

            <p-dialog [(visible)]="logDialog" [style]="{ width: '600px' }" header="Audit Log Details" [modal]="true" styleClass="p-fluid">
                <ng-template #content>
                    <div class="flex flex-col gap-4" *ngIf="selectedLog">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="font-bold block mb-1">Entity Type</label>
                                <span>{{ selectedLog.entity_type }}</span>
                            </div>
                            <div>
                                <label class="font-bold block mb-1">Action</label>
                                <span>{{ selectedLog.action }}</span>
                            </div>
                            <div>
                                <label class="font-bold block mb-1">User</label>
                                <span>{{ selectedLog.user_name || selectedLog.user_id }}</span>
                            </div>
                             <div>
                                <label class="font-bold block mb-1">Date</label>
                                <span>{{ selectedLog.timestamp | date:'medium' }}</span>
                            </div>
                        </div>
                        
                        <div *ngIf="selectedLog.changes">
                            <label class="font-bold block mb-2">Changes</label>
                            <div class="bg-gray-100 p-3 rounded overflow-auto max-h-60">
                                <pre class="m-0 text-sm">{{ selectedLog.changes | json }}</pre>
                            </div>
                        </div>
                    </div>
                </ng-template>
                <ng-template #footer>
                    <p-button label="Close" icon="pi pi-times" text (click)="hideDialog()" />
                </ng-template>
            </p-dialog>
        </div>
    `,
    styles: [`
        .badge-status-create { color: green; font-weight: bold; }
        .badge-status-update { color: orange; font-weight: bold; }
        .badge-status-delete { color: red; font-weight: bold; }
        .badge-status-login { color: blue; font-weight: bold; }
    `]
})
export class AuditPage implements OnInit {
    auditLogs = signal<AuditLog[]>([]);
    selectedLog: AuditLog | null = null;
    logDialog: boolean = false;

    @ViewChild('dt') dt!: Table;

    constructor(private auditService: AuditService) {}

    ngOnInit() {
        this.loadAuditLogs();
    }

    loadAuditLogs() {
        this.auditService.getAuditLogs().subscribe((response) => {
            if (response.success) {
                this.auditLogs.set(response.auditLogs);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    viewDetails(log: AuditLog) {
        this.selectedLog = log;
        this.logDialog = true;
    }

    hideDialog() {
        this.logDialog = false;
        this.selectedLog = null;
    }
}
