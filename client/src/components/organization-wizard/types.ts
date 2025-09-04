import type { USState } from "@/constants/us-states";

export interface SportContact {
  id: string;
  sportId: string;
  sportName: string;
  teamName: string; // NEW: Team name for multiple teams per sport
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  user_id?: string; // For existing users
}

export interface CreateOrgFormData {
  // Primary step (required)
  name: string;
  is_business: boolean;
  email_domain?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: USState | string;
  postal_code?: string;
  country: string;

  // Branding step
  logo_file?: File;
  logo_url?: string;
  brand_primary?: string;
  brand_secondary?: string;

  // Sports & contacts step
  sports: SportContact[];

  // Legacy fields for compatibility
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface OrgWizardData {
  name: string;
  state: string;
  phone: string;
  email: string;
  notes: string;
  address: string;
  logoUrl: string;
  isBusiness: boolean;
  universalDiscounts: Record<string, any>;
}