export interface Distributor {
    id: string;
    name: string;
    email_support?: string;
    phone?: string;
    partner_link?: string;
    status?: 'Active' | 'Inactive';
    notes?: string;
    created_at?: string;
    updated_at?: string;
}
