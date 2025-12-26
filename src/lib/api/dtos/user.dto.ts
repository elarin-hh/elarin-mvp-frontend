/**
 * User DTOs
 * Based on app_users and app_memberships tables
 */

/**
 * User entity from app_users
 */
export interface UserDto {
    id: number;
    auth_uid: string;
    email: string;
    full_name?: string | null;
    avatar_url?: string | null;
    height_cm?: number | null;
    weight_kg?: number | null;
    birth_date?: string | null;
    is_dev: boolean;
    consent_given_at?: string | null;
    biometric_consent_given_at?: string | null;
    marketing_consent: boolean;
    age_verified: boolean;
    created_at?: string;
}

/**
 * Membership from app_memberships
 */
export interface MembershipDto {
    id: number;
    user_id: number;
    organization_id: number;
    role: string;
    status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
    is_active: boolean;
    created_at?: string;
}
