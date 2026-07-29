export interface Product {
    id: string;
    name: string;
    sku: string;
    description?: string;
    billing_cycle?: 'Monthly' | 'Annual' | 'OneTime';
    term?: '1Month' | '1Year' | 'Perpetual';
    category?: string;
    list_price?: number;
    segment?: string;
    status: 'Active' | 'Discontinued';
    created_at?: string;
    updated_at?: string;
}