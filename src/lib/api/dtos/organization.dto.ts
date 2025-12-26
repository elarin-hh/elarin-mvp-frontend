/**
 * Organization DTOs
 * Based on app_organizations table
 */

/**
 * Organization entity from app_organizations
 */
export interface OrganizationDto {
    id: number;
    auth_uid?: string | null;
    name: string;
    code: string;
    email: string;
    plan_id?: number | null;
    responsible_name?: string | null;
    phone?: string | null;
    address?: string | null;
    federal_tax_id?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}
