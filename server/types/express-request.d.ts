// Augment Express Request to include user property
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email?: string;
      full_name?: string;
      role?: string;
      organization_id?: string;
      is_super_admin?: boolean;
      raw_user_meta_data?: any;
      user_metadata?: any;
    };
  }
}