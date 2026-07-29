export interface ZohoInvoice {
    id: string;
    zoho_invoice_id?: string;
    zoho_invoice_number?: string;
    json_zoho: any;
    xml_no_sign?: string;
    xml_with_sign?: string;
    ttn_ref?: string;
    ttn_code?: string;
    status: string;
    user_id?: string;
    errors?: any;
    created_at?: string;
    updated_at?: string;
}
