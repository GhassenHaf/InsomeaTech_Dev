export interface Order {
    id: string;
    order_number: string;
    order_date: string;
    status_order: 'WaitingForFinanceApproval' | 'ToBeProvisioned' | 'UnderProcessing' | 'DistiProcessing' | 'Done' | 'Cancelled';
    lpo_url?: string;
    so_url?: string;
    proof_tech_url?: string;
    po_number?: string;
    disti_po_url?: string;
    notes?: string;
    created_date?: string;
    created_by?: string;
    last_modified_date?: string;
    last_modified_by?: string;
    sales_person_id?: string;
    technical_user_id?: string;
    customer_id: string;
    // Joined fields
    customer_name?: string;
    sales_person_name?: string;
    technical_user_name?: string;
}