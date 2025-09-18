import { z } from "zod";

// Environment variables schema with proper validation
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional().default("3000"),
  ORIGINS: z.string().default("http://localhost:5173"),
  
  // Required for auth
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  
  // Optional
  OPENAI_API_KEY: z.string().optional(),
  ENABLE_DOMAIN_STUBS: z.string().optional().default("0"),
  
  // Security flags (Phase 0)
  ALLOW_ADMIN_SEED: z.string().optional().default("false"), // SEC-1: Kill-switch for admin creation in production
  ALLOW_DEBUG_ENDPOINTS: z.string().optional().default("false"), // SEC-2: Kill-switch for debug endpoints in production
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  try {
    const parsedEnv = envSchema.parse(process.env);
    
    // Log successful validation with masked values
    console.log('\n=== Environment Contract Validation ===');
    console.log(`✓ NODE_ENV: ${parsedEnv.NODE_ENV}`);
    console.log(`✓ PORT: ${parsedEnv.PORT}`);
    console.log(`✓ ORIGINS: ${parsedEnv.ORIGINS}`);
    console.log(`✓ DATABASE_URL: ${parsedEnv.DATABASE_URL.substring(0, 20)}***`);
    console.log(`✓ VITE_SUPABASE_URL: ${parsedEnv.VITE_SUPABASE_URL.substring(0, 20)}***`);
    console.log(`✓ VITE_SUPABASE_ANON_KEY: ${parsedEnv.VITE_SUPABASE_ANON_KEY.substring(0, 6)}*** (length: ${parsedEnv.VITE_SUPABASE_ANON_KEY.length})`);
    console.log(`✓ SUPABASE_SERVICE_ROLE_KEY: ${parsedEnv.SUPABASE_SERVICE_ROLE_KEY.substring(0, 6)}*** (length: ${parsedEnv.SUPABASE_SERVICE_ROLE_KEY.length})`);
    console.log(`✓ JWT_SECRET: ${parsedEnv.JWT_SECRET.substring(0, 6)}*** (length: ${parsedEnv.JWT_SECRET.length})`);
    
    if (parsedEnv.OPENAI_API_KEY) {
      console.log(`✓ OPENAI_API_KEY: ${parsedEnv.OPENAI_API_KEY.substring(0, 6)}*** (length: ${parsedEnv.OPENAI_API_KEY.length})`);
    }
    
    console.log(`✓ ENABLE_DOMAIN_STUBS: ${parsedEnv.ENABLE_DOMAIN_STUBS}`);
    console.log('✓ All environment variables validated successfully\n');
    
    return parsedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n🚨 Environment Validation Failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nPlease fix the above environment variable issues and restart the server.\n');
    } else {
      console.error('\n🚨 Unknown environment validation error:', error);
    }
    
    process.exit(1);
  }
}

// Validate and export typed environment
export const env = validateEnv();