// Error taxonomy + mapper for Postgres/Supabase
export type RichError = {
  code: string|number;
  message: string;
  hint?: string;
  details?: any;
};

export class AppError extends Error {
  status: number; code: string; hint?: string; details?: any;
  constructor(status: number, code: string, message: string, hint?: string, details?: any){
    super(message); this.status=status; this.code=code; this.hint=hint; this.details=details;
  }
}

export function mapPgError(e:any): RichError {
  // Handle common PG codes: 23505 unique_violation, 23503 fk_violation, 42501 insufficient_privilege (RLS),
  // 22P02 invalid_text_representation, 23502 not_null_violation, etc.
  const code = e?.code || e?.details?.code || e?.status || 'UNKNOWN';
  const msg  = e?.message || e?.error_description || 'Unexpected database error';
  if (code === '42501') return { code, message: 'Permission denied by RLS', hint: 'Check policies & auth.uid().' };
  if (code === '23505') return { code, message: 'Duplicate value violates unique constraint', hint: 'Check unique fields.' };
  if (code === '23503') return { code, message: 'Foreign key constraint failed', hint: 'Related record missing.' };
  if (code === '23502') return { code, message: 'Required field is missing', hint: 'Add all NOT NULL columns.' };
  if (code === '22P02') return { code, message: 'Invalid input format', hint: 'Check UUID/number types.' };
  return { code, message: msg };
}

export function mapValidationError(zodError:any): RichError {
  return { code: 400, message: 'Validation failed', details: zodError?.flatten?.() ?? zodError };
}