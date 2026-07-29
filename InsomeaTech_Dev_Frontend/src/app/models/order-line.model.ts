export interface OrderLine {
    id: string;
    quantity: number;
    status: 'Pending' | 'UnderProcessing' | 'Activated' | 'Cancelled';
    expiration_date?: string;
    activated_date?: string;
    notes?: string;
    order_id: string;
    product_id: string;
    disti_id?: string;
    activated_by?: string;
    // Joined fields
    product_name?: string;
    product_sku?: string;
    segment?: string;
    disti_name?: string;
    activated_by_name?: string;
    billing_cycle?: string;
    term?: string;
}