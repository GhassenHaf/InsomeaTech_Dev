export interface AuditLog {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    timestamp: string;
    changes: any;
    ip_address: string;
    user_id: string;
    user_name: string;
}
