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
import { TooltipModule } from 'primeng/tooltip';
import { Customer } from '../../models/customer.model';
import { User } from '../../models/user.model';
import { CustomerService } from '../../services/customer.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Router } from '@angular/router';

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
    selector: 'app-customer',
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
        ConfirmDialogModule,
        TooltipModule
    ],
    template: `
        <p-toolbar styleClass="mb-6">
            <ng-template #start>
                <p-button label="New" icon="pi pi-plus" severity="secondary" class="mr-2" (onClick)="openNew()" />
            </ng-template>

            <ng-template #end>
                <p-button *ngIf="isAdmin" label="Export" icon="pi pi-upload" severity="secondary" (onClick)="exportCSV()" />
            </ng-template>
        </p-toolbar>

        <p-table
            #dt
            [value]="customers()"
            [rows]="10"
            [columns]="cols"
            [paginator]="true"
            [globalFilterFields]="['company_name', 'tenant_id', 'onmicrosoft_domain', 'status', 'sales_person_name', 'country']"
            [tableStyle]="{ 'min-width': '75rem' }"
            [(selection)]="selectedCustomers"
            [rowHover]="true"
            dataKey="id"
            currentPageReportTemplate="Showing {first} to {last} of {totalRecords} customers"
            [showCurrentPageReport]="true"
            [rowsPerPageOptions]="[10, 20, 30]"
        >
            <ng-template #caption>
                <div class="flex items-center justify-between">
                    <h5 class="m-0">Manage Customers</h5>
                    <p-iconfield>
                        <p-inputicon styleClass="pi pi-search" />
                        <input pInputText type="text" (input)="onGlobalFilter(dt, $event)" placeholder="Search..." />
                    </p-iconfield>
                </div>
            </ng-template>
            <ng-template #header>
                <tr>
                    <th style="width: 3rem">
                        <p-tableHeaderCheckbox />
                    </th>
                    <th pSortableColumn="company_name" style="min-width:14rem">
                        Company Name
                        <p-sortIcon field="company_name" />
                    </th>
                     <th pSortableColumn="tenant_id" style="min-width:12rem">
                        Tenant ID
                        <p-sortIcon field="tenant_id" />
                    </th>
                    <th pSortableColumn="country" style="min-width:10rem">
                        Country
                        <p-sortIcon field="country" />
                    </th>
                    <th pSortableColumn="sales_person_name" style="min-width:12rem">
                        Sales Rep
                        <p-sortIcon field="sales_person_name" />
                    </th>
                    <th pSortableColumn="status" style="min-width: 10rem">
                        Status
                        <p-sortIcon field="status" />
                    </th>
                    <th style="min-width: 12rem">Actions</th>
                </tr>
            </ng-template>
            <ng-template #body let-customer>
                <tr>
                    <td style="width: 3rem">
                        <p-tableCheckbox [value]="customer" />
                    </td>
                    <td>
                        <span class="font-bold cursor-pointer hover:underline" (click)="viewDetails(customer)">{{ customer.company_name }}</span>
                    </td>
                    <td>{{ customer.tenant_id }}</td>
                    <td>{{ customer.country }}</td>
                    <td>{{ customer.sales_person_name }}</td>
                    <td>
                        <p-tag [value]="customer.status" [severity]="getSeverity(customer.status)" />
                    </td>
                    <td>
                        <p-button icon="pi pi-box" class="mr-2" [rounded]="true" [outlined]="true" severity="info" (click)="viewProducts(customer)" pTooltip="View Products" tooltipPosition="top" />
                        <p-button icon="pi pi-pencil" class="mr-2" [rounded]="true" [outlined]="true" (click)="editCustomer(customer)" />
                        <p-button icon="pi pi-trash" severity="danger" [rounded]="true" [outlined]="true" (click)="deleteCustomer(customer)" />
                    </td>
                </tr>
            </ng-template>
        </p-table>

        <p-dialog [(visible)]="customerDialog" [style]="{ width: '450px' }" header="Customer Details" [modal]="true">
            <ng-template #content>
                <div class="flex flex-col gap-6">
                    <div>
                        <label for="company_name" class="block font-bold mb-3">Company Name</label>
                        <input type="text" pInputText id="company_name" [(ngModel)]="customer.company_name" required autofocus fluid />
                        <small class="text-red-500" *ngIf="submitted && !customer.company_name">Company Name is required.</small>
                    </div>
                    <div>
                        <label for="email" class="block font-bold mb-3">Email</label>
                        <input type="email" pInputText id="email" [(ngModel)]="customer.email" required fluid />
                        <small class="text-red-500" *ngIf="submitted && !customer.email">Email is required.</small>
                    </div>
                    <div>
                        <label for="country" class="block font-bold mb-3">Country</label>
                        <p-select [(ngModel)]="customer.country" inputId="country" [options]="countries" optionLabel="name" optionValue="name" [filter]="true" filterBy="name" placeholder="Select Country" appendTo="body" fluid />
                    </div>
                    <div>
                        <label for="sales_person_id" class="block font-bold mb-3">Sales Person</label>
                        <p-select [(ngModel)]="customer.sales_person_id" inputId="sales_person_id" [options]="salesPersons()" optionLabel="name" optionValue="id" placeholder="Select Sales Rep" appendTo="body" fluid />
                    </div>
                     <div>
                        <label for="tenant_id" class="block font-bold mb-3">Tenant ID</label>
                        <input type="text" pInputText id="tenant_id" [(ngModel)]="customer.tenant_id" fluid />
                    </div>
                     <div>
                        <label for="onmicrosoft_domain" class="block font-bold mb-3">OnMicrosoft Domain</label>
                        <input type="text" pInputText id="onmicrosoft_domain" [(ngModel)]="customer.onmicrosoft_domain" fluid />
                    </div>
                    <div>
                        <label for="contact_person" class="block font-bold mb-3">Contact Person</label>
                        <input type="text" pInputText id="contact_person" [(ngModel)]="customer.contact_person" fluid />
                    </div>
                     <div>
                        <label for="phone" class="block font-bold mb-3">Phone</label>
                        <input type="text" pInputText id="phone" [(ngModel)]="customer.phone" fluid />
                    </div>

                    <div>
                        <label for="status" class="block font-bold mb-3">Status</label>
                        <p-select [(ngModel)]="customer.status" inputId="status" [options]="statuses" optionLabel="label" optionValue="value" placeholder="Select a Status" appendTo="body" fluid />
                    </div>
                </div>
            </ng-template>

            <ng-template #footer>
                <p-button label="Cancel" icon="pi pi-times" text (click)="hideDialog()" />
                <p-button label="Save" icon="pi pi-check" (click)="saveCustomer()" />
            </ng-template>
        </p-dialog>

        <p-dialog [(visible)]="customerDetailsDialog" [header]="'Details: ' + (viewCustomer?.company_name || '')" [modal]="true" styleClass="p-fluid">
            <ng-template #content>
                 <div class="flex flex-col gap-4" *ngIf="viewCustomer">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="font-bold block mb-1">Company Name</label>
                            <span>{{ viewCustomer.company_name }}</span>
                        </div>
                        <div>
                             <label class="font-bold block mb-1">Tenant ID</label>
                            <span>{{ viewCustomer.tenant_id }}</span>
                        </div>
                        <div>
                             <label class="font-bold block mb-1">Country</label>
                            <span>{{ viewCustomer.country || 'Not specified' }}</span>
                        </div>
                        <div>
                             <label class="font-bold block mb-1">OnMicrosoft Domain</label>
                            <span>{{ viewCustomer.onmicrosoft_domain }}</span>
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Email</label>
                            <span>{{ viewCustomer.email }}</span>
                        </div>
                         <div>
                            <label class="font-bold block mb-1">Phone</label>
                            <span>{{ viewCustomer.phone }}</span>
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Contact Person</label>
                            <span>{{ viewCustomer.contact_person }}</span>
                        </div>
                         <div>
                            <label class="font-bold block mb-1">Status</label>
                             <p-tag [value]="viewCustomer.status" [severity]="getSeverity(viewCustomer.status!)" />
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Sales Person</label>
                            <span>{{ viewCustomer.sales_person_name || 'Not assigned' }}</span>
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Created By</label>
                            <span>{{ viewCustomer.created_by }}</span>
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Source</label>
                            <span>{{ viewCustomer.source }}</span>
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Created Date</label>
                            <span>{{ viewCustomer.created_date | date:'medium' }}</span>
                        </div>
                        <div>
                            <label class="font-bold block mb-1">Updated At</label>
                            <span>{{ viewCustomer.updated_at | date:'medium' }}</span>
                        </div>
                    </div>
                </div>
            </ng-template>
        </p-dialog>

        <p-confirmdialog [style]="{ width: '450px' }" />
    `,
    providers: [CustomerService]
})
export class CustomerPage implements OnInit {
    customerDialog: boolean = false;
    customerDetailsDialog: boolean = false;

    customers = signal<Customer[]>([]);
    salesPersons = signal<User[]>([]);

    customer: Partial<Customer> = {};
    viewCustomer: Customer | null = null;

    selectedCustomers!: Customer[] | null;

    submitted: boolean = false;

    statuses!: any[];
    countries!: any[];

    @ViewChild('dt') dt!: Table;

    exportColumns!: ExportColumn[];

    cols!: Column[];

    constructor(
        private customerService: CustomerService,
        private userService: UserService,
        private messageService: MessageService,
        private confirmationService: ConfirmationService,
        private authService: AuthService,
        private router: Router
    ) {}

    exportCSV() {
        this.dt.exportCSV();
    }

    ngOnInit() {
        this.loadCustomers();
        this.loadSalesPersons();

        this.statuses = [
            { label: 'Active', value: 'Active' },
            { label: 'Inactive', value: 'Inactive' }
        ];

        this.countries = [
            { name: 'Afghanistan', code: 'AF' },
            { name: 'Åland Islands', code: 'AX' },
            { name: 'Albania', code: 'AL' },
            { name: 'Algeria', code: 'DZ' },
            { name: 'American Samoa', code: 'AS' },
            { name: 'Andorra', code: 'AD' },
            { name: 'Angola', code: 'AO' },
            { name: 'Anguilla', code: 'AI' },
            { name: 'Antarctica', code: 'AQ' },
            { name: 'Antigua and Barbuda', code: 'AG' },
            { name: 'Argentina', code: 'AR' },
            { name: 'Armenia', code: 'AM' },
            { name: 'Aruba', code: 'AW' },
            { name: 'Australia', code: 'AU' },
            { name: 'Austria', code: 'AT' },
            { name: 'Azerbaijan', code: 'AZ' },
            { name: 'Bahamas', code: 'BS' },
            { name: 'Bahrain', code: 'BH' },
            { name: 'Bangladesh', code: 'BD' },
            { name: 'Barbados', code: 'BB' },
            { name: 'Belarus', code: 'BY' },
            { name: 'Belgium', code: 'BE' },
            { name: 'Belize', code: 'BZ' },
            { name: 'Benin', code: 'BJ' },
            { name: 'Bermuda', code: 'BM' },
            { name: 'Bhutan', code: 'BT' },
            { name: 'Bolivia', code: 'BO' },
            { name: 'Bosnia and Herzegovina', code: 'BA' },
            { name: 'Botswana', code: 'BW' },
            { name: 'Bouvet Island', code: 'BV' },
            { name: 'Brazil', code: 'BR' },
            { name: 'British Indian Ocean Territory', code: 'IO' },
            { name: 'Brunei Darussalam', code: 'BN' },
            { name: 'Bulgaria', code: 'BG' },
            { name: 'Burkina Faso', code: 'BF' },
            { name: 'Burundi', code: 'BI' },
            { name: 'Cambodia', code: 'KH' },
            { name: 'Cameroon', code: 'CM' },
            { name: 'Canada', code: 'CA' },
            { name: 'Cape Verde', code: 'CV' },
            { name: 'Cayman Islands', code: 'KY' },
            { name: 'Central African Republic', code: 'CF' },
            { name: 'Chad', code: 'TD' },
            { name: 'Chile', code: 'CL' },
            { name: 'China', code: 'CN' },
            { name: 'Christmas Island', code: 'CX' },
            { name: 'Cocos (Keeling) Islands', code: 'CC' },
            { name: 'Colombia', code: 'CO' },
            { name: 'Comoros', code: 'KM' },
            { name: 'Congo', code: 'CG' },
            { name: 'Congo, The Democratic Republic of the', code: 'CD' },
            { name: 'Cook Islands', code: 'CK' },
            { name: 'Costa Rica', code: 'CR' },
            { name: 'Cote D\'Ivoire', code: 'CI' },
            { name: 'Croatia', code: 'HR' },
            { name: 'Cuba', code: 'CU' },
            { name: 'Cyprus', code: 'CY' },
            { name: 'Czech Republic', code: 'CZ' },
            { name: 'Denmark', code: 'DK' },
            { name: 'Djibouti', code: 'DJ' },
            { name: 'Dominica', code: 'DM' },
            { name: 'Dominican Republic', code: 'DO' },
            { name: 'Ecuador', code: 'EC' },
            { name: 'Egypt', code: 'EG' },
            { name: 'El Salvador', code: 'SV' },
            { name: 'Equatorial Guinea', code: 'GQ' },
            { name: 'Eritrea', code: 'ER' },
            { name: 'Estonia', code: 'EE' },
            { name: 'Ethiopia', code: 'ET' },
            { name: 'Falkland Islands (Malvinas)', code: 'FK' },
            { name: 'Faroe Islands', code: 'FO' },
            { name: 'Fiji', code: 'FJ' },
            { name: 'Finland', code: 'FI' },
            { name: 'France', code: 'FR' },
            { name: 'French Guiana', code: 'GF' },
            { name: 'French Polynesia', code: 'PF' },
            { name: 'French Southern Territories', code: 'TF' },
            { name: 'Gabon', code: 'GA' },
            { name: 'Gambia', code: 'GM' },
            { name: 'Georgia', code: 'GE' },
            { name: 'Germany', code: 'DE' },
            { name: 'Ghana', code: 'GH' },
            { name: 'Gibraltar', code: 'GI' },
            { name: 'Greece', code: 'GR' },
            { name: 'Greenland', code: 'GL' },
            { name: 'Grenada', code: 'GD' },
            { name: 'Guadeloupe', code: 'GP' },
            { name: 'Guam', code: 'GU' },
            { name: 'Guatemala', code: 'GT' },
            { name: 'Guernsey', code: 'GG' },
            { name: 'Guinea', code: 'GN' },
            { name: 'Guinea-Bissau', code: 'GW' },
            { name: 'Guyana', code: 'GY' },
            { name: 'Haiti', code: 'HT' },
            { name: 'Heard Island and Mcdonald Islands', code: 'HM' },
            { name: 'Holy See (Vatican City State)', code: 'VA' },
            { name: 'Honduras', code: 'HN' },
            { name: 'Hong Kong', code: 'HK' },
            { name: 'Hungary', code: 'HU' },
            { name: 'Iceland', code: 'IS' },
            { name: 'India', code: 'IN' },
            { name: 'Indonesia', code: 'ID' },
            { name: 'Iran, Islamic Republic Of', code: 'IR' },
            { name: 'Iraq', code: 'IQ' },
            { name: 'Ireland', code: 'IE' },
            { name: 'Isle of Man', code: 'IM' },
            { name: 'Israel', code: 'IL' },
            { name: 'Italy', code: 'IT' },
            { name: 'Jamaica', code: 'JM' },
            { name: 'Japan', code: 'JP' },
            { name: 'Jersey', code: 'JE' },
            { name: 'Jordan', code: 'JO' },
            { name: 'Kazakhstan', code: 'KZ' },
            { name: 'Kenya', code: 'KE' },
            { name: 'Kiribati', code: 'KI' },
            { name: 'Korea, Democratic People\'S Republic of', code: 'KP' },
            { name: 'Korea, Republic of', code: 'KR' },
            { name: 'Kuwait', code: 'KW' },
            { name: 'Kyrgyzstan', code: 'KG' },
            { name: 'Lao People\'S Democratic Republic', code: 'LA' },
            { name: 'Latvia', code: 'LV' },
            { name: 'Lebanon', code: 'LB' },
            { name: 'Lesotho', code: 'LS' },
            { name: 'Liberia', code: 'LR' },
            { name: 'Libya', code: 'LY' },
            { name: 'Liechtenstein', code: 'LI' },
            { name: 'Lithuania', code: 'LT' },
            { name: 'Luxembourg', code: 'LU' },
            { name: 'Macao', code: 'MO' },
            { name: 'Macedonia, The Former Yugoslav Republic of', code: 'MK' },
            { name: 'Madagascar', code: 'MG' },
            { name: 'Malawi', code: 'MW' },
            { name: 'Malaysia', code: 'MY' },
            { name: 'Maldives', code: 'MV' },
            { name: 'Mali', code: 'ML' },
            { name: 'Malta', code: 'MT' },
            { name: 'Marshall Islands', code: 'MH' },
            { name: 'Martinique', code: 'MQ' },
            { name: 'Mauritania', code: 'MR' },
            { name: 'Mauritius', code: 'MU' },
            { name: 'Mayotte', code: 'YT' },
            { name: 'Mexico', code: 'MX' },
            { name: 'Micronesia, Federated States of', code: 'FM' },
            { name: 'Moldova, Republic of', code: 'MD' },
            { name: 'Monaco', code: 'MC' },
            { name: 'Mongolia', code: 'MN' },
            { name: 'Montserrat', code: 'MS' },
            { name: 'Morocco', code: 'MA' },
            { name: 'Mozambique', code: 'MZ' },
            { name: 'Myanmar', code: 'MM' },
            { name: 'Namibia', code: 'NA' },
            { name: 'Nauru', code: 'NR' },
            { name: 'Nepal', code: 'NP' },
            { name: 'Netherlands', code: 'NL' },
            { name: 'Netherlands Antilles', code: 'AN' },
            { name: 'New Caledonia', code: 'NC' },
            { name: 'New Zealand', code: 'NZ' },
            { name: 'Nicaragua', code: 'NI' },
            { name: 'Niger', code: 'NE' },
            { name: 'Nigeria', code: 'NG' },
            { name: 'Niue', code: 'NU' },
            { name: 'Norfolk Island', code: 'NF' },
            { name: 'Northern Mariana Islands', code: 'MP' },
            { name: 'Norway', code: 'NO' },
            { name: 'Oman', code: 'OM' },
            { name: 'Pakistan', code: 'PK' },
            { name: 'Palau', code: 'PW' },
            { name: 'Palestinian Territory, Occupied', code: 'PS' },
            { name: 'Panama', code: 'PA' },
            { name: 'Papua New Guinea', code: 'PG' },
            { name: 'Paraguay', code: 'PY' },
            { name: 'Peru', code: 'PE' },
            { name: 'Philippines', code: 'PH' },
            { name: 'Pitcairn', code: 'PN' },
            { name: 'Poland', code: 'PL' },
            { name: 'Portugal', code: 'PT' },
            { name: 'Puerto Rico', code: 'PR' },
            { name: 'Qatar', code: 'QA' },
            { name: 'Reunion', code: 'RE' },
            { name: 'Romania', code: 'RO' },
            { name: 'Russian Federation', code: 'RU' },
            { name: 'Rwanda', code: 'RW' },
            { name: 'Saint Helena', code: 'SH' },
            { name: 'Saint Kitts and Nevis', code: 'KN' },
            { name: 'Saint Lucia', code: 'LC' },
            { name: 'Saint Pierre and Miquelon', code: 'PM' },
            { name: 'Saint Vincent and the Grenadines', code: 'VC' },
            { name: 'Samoa', code: 'WS' },
            { name: 'San Marino', code: 'SM' },
            { name: 'Sao Tome and Principe', code: 'ST' },
            { name: 'Saudi Arabia', code: 'SA' },
            { name: 'Senegal', code: 'SN' },
            { name: 'Serbia and Montenegro', code: 'CS' },
            { name: 'Seychelles', code: 'SC' },
            { name: 'Sierra Leone', code: 'SL' },
            { name: 'Singapore', code: 'SG' },
            { name: 'Slovakia', code: 'SK' },
            { name: 'Slovenia', code: 'SI' },
            { name: 'Solomon Islands', code: 'SB' },
            { name: 'Somalia', code: 'SO' },
            { name: 'South Africa', code: 'ZA' },
            { name: 'South Georgia and the South Sandwich Islands', code: 'GS' },
            { name: 'Spain', code: 'ES' },
            { name: 'Sri Lanka', code: 'LK' },
            { name: 'Sudan', code: 'SD' },
            { name: 'Suriname', code: 'SR' },
            { name: 'Svalbard and Jan Mayen', code: 'SJ' },
            { name: 'Swaziland', code: 'SZ' },
            { name: 'Sweden', code: 'SE' },
            { name: 'Switzerland', code: 'CH' },
            { name: 'Syrian Arab Republic', code: 'SY' },
            { name: 'Taiwan, Province of China', code: 'TW' },
            { name: 'Tajikistan', code: 'TJ' },
            { name: 'Tanzania, United Republic of', code: 'TZ' },
            { name: 'Thailand', code: 'TH' },
            { name: 'Timor-Leste', code: 'TL' },
            { name: 'Togo', code: 'TG' },
            { name: 'Tokelau', code: 'TK' },
            { name: 'Tonga', code: 'TO' },
            { name: 'Trinidad and Tobago', code: 'TT' },
            { name: 'Tunisia', code: 'TN' },
            { name: 'Turkey', code: 'TR' },
            { name: 'Turkmenistan', code: 'TM' },
            { name: 'Turks and Caicos Islands', code: 'TC' },
            { name: 'Tuvalu', code: 'TV' },
            { name: 'Uganda', code: 'UG' },
            { name: 'Ukraine', code: 'UA' },
            { name: 'United Arab Emirates', code: 'AE' },
            { name: 'United Kingdom', code: 'GB' },
            { name: 'United States', code: 'US' },
            { name: 'United States Minor Outlying Islands', code: 'UM' },
            { name: 'Uruguay', code: 'UY' },
            { name: 'Uzbekistan', code: 'UZ' },
            { name: 'Vanuatu', code: 'VU' },
            { name: 'Venezuela', code: 'VE' },
            { name: 'Viet Nam', code: 'VN' },
            { name: 'Virgin Islands, British', code: 'VG' },
            { name: 'Virgin Islands, U.S.', code: 'VI' },
            { name: 'Wallis and Futuna', code: 'WF' },
            { name: 'Western Sahara', code: 'EH' },
            { name: 'Yemen', code: 'YE' },
            { name: 'Zambia', code: 'ZM' },
            { name: 'Zimbabwe', code: 'ZW' }
        ].sort((a, b) => a.name.localeCompare(b.name));

        this.cols = [
            { field: 'company_name', header: 'Company Name' },
            { field: 'tenant_id', header: 'Tenant ID' },
            { field: 'country', header: 'Country' },
            { field: 'sales_person_name', header: 'Sales Rep' },
            { field: 'status', header: 'Status' }
        ];

        this.exportColumns = this.cols.map((col) => ({ title: col.header, dataKey: col.field }));
    }

    get isAdmin() {
        return this.authService.hasRole('Admin');
    }

    loadCustomers() {
        this.customerService.getCustomers().subscribe((response) => {
            if (response.success) {
                this.customers.set(response.customers);
            }
        });
    }

    loadSalesPersons() {
        this.userService.getUsers().subscribe((response) => {
            if (response.success) {
                const sales = response.data.filter(u => u.role === 'Sales' || u.role === 'Admin');
                this.salesPersons.set(sales);
            }
        });
    }

    onGlobalFilter(table: Table, event: Event) {
        table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
    }

    viewDetails(customer: Customer) {
        this.viewCustomer = customer;
        this.customerDetailsDialog = true;
    }

    viewProducts(customer: Customer) {
        this.router.navigate(['/pages/customer', customer.id, 'products']);
    }

    openNew() {
        this.customer = {};
        this.submitted = false;
        this.customerDialog = true;
    }

    editCustomer(customer: Customer) {
        this.customer = { ...customer };
        this.customerDialog = true;
    }

    deleteSelectedCustomers() {
        if(!this.isAdmin) {
            alert("Delete is restricted to Admins only.");
            return;
        }
        this.confirmationService.confirm({
            message: 'Are you sure you want to delete the selected customers?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                 if (this.selectedCustomers) {
                    this.customers.set(this.customers().filter((val) => !this.selectedCustomers?.includes(val)));
                    this.selectedCustomers = null;
                     this.messageService.add({
                        severity: 'success',
                        summary: 'Successful',
                        detail: 'Customers Deleted',
                        life: 3000
                    });
                 }
            }
        });
    }

    hideDialog() {
        this.customerDialog = false;
        this.submitted = false;
    }

    deleteCustomer(customer: Customer) {
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
            message: 'Are you sure you want to delete ' + customer.company_name + '?',
            header: 'Confirm',
            icon: 'pi pi-exclamation-triangle',
            accept: () => {
                this.customerService.deleteCustomer(customer.id).subscribe({
                    next: (res) => {
                        if (res.success) {
                            this.customers.set(this.customers().filter((val) => val.id !== customer.id));
                            this.customer = {};
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Customer Deleted',
                                life: 3000
                            });
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to delete customer',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to delete customer',
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

    saveCustomer() {
        this.submitted = true;

        if (this.customer.company_name?.trim() && this.customer.email?.trim()) {
            if (this.customer.id) {
                this.customerService.updateCustomer(this.customer.id, this.customer).subscribe({
                    next: (res) => {
                        if (res.success) {
                            const _customers = this.customers();
                            const index = _customers.findIndex(c => c.id === this.customer.id);
                            _customers[index] = res.customer;
                            this.customers.set([..._customers]);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Customer Updated',
                                life: 3000
                            });
                            this.customerDialog = false;
                            this.customer = {};
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to update customer',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to update customer',
                            life: 3000
                        });
                    }
                });
            } else {
                this.customerService.createCustomer(this.customer).subscribe({
                    next: (res) => {
                        if (res.success) {
                            this.customers.set([...this.customers(), res.customer]);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Successful',
                                detail: 'Customer Created',
                                life: 3000
                            });
                            this.customerDialog = false;
                            this.customer = {};
                        } else {
                            this.messageService.add({
                                severity: 'error',
                                summary: 'Error',
                                detail: 'Failed to create customer',
                                life: 3000
                            });
                        }
                    },
                    error: (err) => {
                        this.messageService.add({
                            severity: 'error',
                            summary: 'Error',
                            detail: err.error?.error || 'Failed to create customer',
                            life: 3000
                        });
                    }
                });
            }
        }
    }
}
