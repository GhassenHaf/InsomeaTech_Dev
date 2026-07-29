import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table, TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-user',
    standalone: true,
    imports: [
        CommonModule,
        TableModule,
        FormsModule,
        ButtonModule,
        RippleModule,
        ToolbarModule,
        InputTextModule,
        SelectModule,
        DialogModule,
        TagModule,
        InputIconModule,
        IconFieldModule
    ],
    template: `
        <div class="card">
            <p-toolbar styleClass="mb-6">
                <ng-template #start>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-user-edit text-2xl"></i>
                        <span class="font-bold text-xl">User Management</span>
                    </div>
                </ng-template>
                <ng-template #end>
                    <p-button label="Refresh" icon="pi pi-refresh" severity="secondary" (onClick)="loadUsers()" />
                </ng-template>
            </p-toolbar>

            <p-table
                #dt
                [value]="users()"
                [rows]="10"
                [paginator]="true"
                [globalFilterFields]="['name', 'email', 'role', 'status']"
                [tableStyle]="{ 'min-width': '75rem' }"
                [rowHover]="true"
                dataKey="id"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} users"
                [showCurrentPageReport]="true"
                [rowsPerPageOptions]="[10, 20, 30]"
            >
                <ng-template #caption>
                    <div class="flex items-center justify-between">
                        <h5 class="m-0">Manage Permissions</h5>
                        <p-iconfield>
                            <p-inputicon styleClass="pi pi-search" />
                            <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                        </p-iconfield>
                    </div>
                </ng-template>
                <ng-template #header>
                    <tr>
                        <th pSortableColumn="name" style="min-width:14rem">
                            Name
                            <p-sortIcon field="name" />
                        </th>
                        <th pSortableColumn="email" style="min-width:14rem">
                            Email
                            <p-sortIcon field="email" />
                        </th>
                        <th pSortableColumn="role" style="min-width:10rem">
                            Role
                            <p-sortIcon field="role" />
                        </th>
                        <th pSortableColumn="status" style="min-width: 10rem">
                            Status
                            <p-sortIcon field="status" />
                        </th>
                        <th style="min-width: 8rem">Actions</th>
                    </tr>
                </ng-template>
                <ng-template #body let-user>
                    <tr>
                        <td>{{ user.name }}</td>
                        <td>{{ user.email }}</td>
                        <td>
                            <p-tag [value]="user.role" [severity]="getRoleSeverity(user.role)" />
                        </td>
                        <td>
                            <p-tag [value]="user.status" [severity]="getStatusSeverity(user.status)" />
                        </td>
                        <td>
                            <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editUser(user)" />
                        </td>
                    </tr>
                </ng-template>
            </p-table>

            <p-dialog [(visible)]="userDialog" [style]="{ width: '450px' }" header="User Permissions" [modal]="true" styleClass="p-fluid">
                <ng-template #content>
                    <div class="flex flex-col gap-6">
                        <div>
                            <label class="block font-bold mb-3">Name</label>
                            <input type="text" pInputText [value]="user.name" disabled />
                        </div>
                        <div>
                            <label class="block font-bold mb-3">Email</label>
                            <input type="text" pInputText [value]="user.email" disabled />
                        </div>
                        
                        <div>
                            <label for="role" class="block font-bold mb-3">Role</label>
                            <p-select [(ngModel)]="user.role" inputId="role" [disabled]="!isAdmin()" [options]="roles" optionLabel="label" optionValue="value" placeholder="Select a Role" appendTo="body" fluid />
                        </div>

                        <div>
                            <label for="status" class="block font-bold mb-3">Status</label>
                            <p-select [(ngModel)]="user.status" inputId="status" [options]="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status" appendTo="body" fluid />
                        </div>
                    </div>
                </ng-template>

                <ng-template #footer>
                    <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                    <p-button label="Save" icon="pi pi-check" (click)="saveUser()" />
                </ng-template>
            </p-dialog>
        </div>
    `
})
export class UserPage implements OnInit {
    userDialog: boolean = false;
    users = signal<User[]>([]);
    user: Partial<User> = {};
    submitted: boolean = false;

    roles = [
        { label: 'Sales', value: 'Sales' },
        { label: 'Technical', value: 'Technical' },
        { label: 'Finance', value: 'Finance' },
        { label: 'Admin', value: 'Admin' }
    ];

    statuses = [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' }
    ];

    @ViewChild('dt') dt!: Table;

    constructor(
        private userService: UserService,
        private messageService: MessageService,
        private authService: AuthService
    ) {}

    isAdmin(): boolean {
        return this.authService.hasRole('Admin');
    }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.userService.getUsers().subscribe((response) => {
            if (response.success) {
                this.users.set(response.data);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    editUser(user: User) {
        this.user = { ...user };
        this.userDialog = true;
    }

    hideDialog() {
        this.userDialog = false;
        this.submitted = false;
    }

    getRoleSeverity(role: string) {
        switch (role) {
            case 'Admin':
                return 'danger';
            case 'Technical':
                return 'info';
            case 'Sales':
                return 'success';
            case 'Finance':
                return 'warn';
            default:
                return 'secondary';
        }
    }

    getStatusSeverity(status: string) {
        switch (status) {
            case 'Active':
                return 'success';
            case 'Inactive':
                return 'danger';
            default:
                return 'secondary';
        }
    }

    saveUser() {
        this.submitted = true;

        if (this.user.id && this.user.role && this.user.status) {
            this.userService.updateUser(this.user.id, this.user).subscribe(res => {
                if (res.success) {
                    const _users = this.users();
                    const index = _users.findIndex(u => u.id === this.user.id);
                    _users[index] = res.data;
                    this.users.set([..._users]);
                    
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'User Updated',
                        life: 3000
                    });
                    this.userDialog = false;
                    this.user = {};
                }
            });
        }
    }
}
