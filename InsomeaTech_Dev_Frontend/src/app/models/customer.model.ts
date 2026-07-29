export interface Customer {
    id: string;
    company_name: string;
    tenant_id?: string;
    onmicrosoft_domain?: string;
    email: string;
    phone?: string;
    contact_person?: string;
    status: 'Active' | 'Inactive';
    sales_person_id?: string;
    sales_person_name?: string;
    country?: string;
    created_by?: string;
    source?: 'Manual' | 'Webhook';
    created_date?: string;
    updated_at?: string;
}
