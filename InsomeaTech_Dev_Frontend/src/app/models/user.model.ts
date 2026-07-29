export interface User {
    id: string;
    email: string;
    name: string;
    role: 'Sales' | 'Technical' | 'Admin' | 'Finance';
    status: 'Active' | 'Inactive';
    created_at?: string;
    updated_at?: string;
}
