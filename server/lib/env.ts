import { z } from "zod";

// Environment variables schema with proper validation
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().optional().default("5000"),
  
  // Optional but recommended for full functionality
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), 
  OPENAI_API_KEY: z.string().optional(),
  
  // Feature flags
  ENABLE_DOMAIN_STUBS: z.string().optional().default("0"),
});

type EnvSchema = z.infer<typeof envSchema>;

function validateEnv(): EnvSchema {
  try {
    const parsedEnv = envSchema.parse(process.env);
    
    // Log successful validation with masked values
    console.log('\n=== Environment Contract Validation ===');
    console.log(`✓ NODE_ENV: ${parsedEnv.NODE_ENV}`);
    console.log(`✓ PORT: ${parsedEnv.PORT}`);
    console.log(`✓ DATABASE_URL: ${parsedEnv.DATABASE_URL.substring(0, 20)}***`);
    
    if (parsedEnv.SUPABASE_URL) {
      console.log(`✓ SUPABASE_URL: ${parsedEnv.SUPABASE_URL.substring(0, 20)}***`);
    }
    if (parsedEnv.SUPABASE_SERVICE_ROLE_KEY) {
      console.log(`✓ SUPABASE_SERVICE_ROLE_KEY: ${parsedEnv.SUPABASE_SERVICE_ROLE_KEY.substring(0, 6)}*** (length: ${parsedEnv.SUPABASE_SERVICE_ROLE_KEY.length})`);
    }
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