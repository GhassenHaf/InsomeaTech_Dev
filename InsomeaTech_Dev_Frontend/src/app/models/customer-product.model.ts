export interface CustomerProduct {
    id: string;
    quantity: number;
    start_date?: string;
    expiration_date?: string;
    billing_cycle?: 'Monthly' | 'Annual' | 'OneTime';
    term?: '1Month' | '1Year' | 'Perpetual';
    status: 'Active' | 'Expired' | 'Suspended' | 'Cancelled';
    notes?: string;
    customer_id: string;
    product_id: string;
    order_line_id?: string;
    created_date?: string;
    last_modified_date?: string;
    // Joined fields from backend
    customer_name?: string;
    product_name?: string;
    product_sku?: string;
    segment?: string;
    disti_name?: string;
    order_id?: string;
    order_number?: string;
}