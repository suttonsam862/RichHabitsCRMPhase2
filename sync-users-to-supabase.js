import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseDbUrl = process.env.DATABASE_URL;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

async function syncUsersTableToSupabase() {
  try {
    console.log('🔄 Syncing users table from Neon to Supabase...\n');

    // Step 1: Get the complete users table structure from Neon
    console.log('1. Getting users table structure from Neon database...');
    const supabasePool = new pg.Pool({ connectionString: supabaseDbUrl });
    
    const { rows: supabaseColumns } = await supabasePool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public' 
      ORDER BY ordinal_position
    `);
    
    console.log('✅ Neon users table has', supabaseColumns.length, 'columns');
    console.log('Columns:', supabaseColumns.map(c => c.column_name).join(', '));

    // Step 2: Check if users table exists in Supabase
    console.log('\n2. Checking users table in Supabase...');
    const { data: supabaseTest, error: supabaseError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);

    if (supabaseError && supabaseError.code === '42P01') {
      console.log('❌ Users table does not exist in Supabase');
      console.log('✅ Need to create users table from scratch');
      
      // Create the table with all columns from Neon
      console.log('\n3. Creating users table in Supabase...');
      
      // Build CREATE TABLE statement
      let createTableSQL = 'CREATE TABLE public.users (\n';
      const columnDefs = [];
      
      for (const col of supabaseColumns) {
        let def = `  ${col.column_name} `;
        
        // Map PostgreSQL types appropriately
        if (col.data_type === 'character varying') {
          def += 'VARCHAR';
        } else if (col.data_type === 'timestamp without time zone') {
          def += 'TIMESTAMP';
        } else if (col.data_type === 'timestamp with time zone') {
          def += 'TIMESTAMPTZ';
        } else {
          def += col.data_type.toUpperCase();
        }
        
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        if (col.column_default) {
          if (col.column_default === 'gen_random_uuid()') {
            def += ' DEFAULT gen_random_uuid()';
          } else if (col.column_default.includes('now()')) {
            def += ' DEFAULT now()';
          } else if (col.column_default === "'{}'::jsonb") {
            def += " DEFAULT '{}'::jsonb";
          } else if (col.column_default === 'true') {
            def += ' DEFAULT true';
          } else if (col.column_default === 'false') {
            def += ' DEFAULT false';
          } else if (col.column_default === "'customer'::text") {
            def += " DEFAULT 'customer'";
          } else if (col.column_default === "'US'::text") {
            def += " DEFAULT 'US'";
          }
        }
        
        columnDefs.push(def);
      }
      
      createTableSQL += columnDefs.join(',\n');
      createTableSQL += ',\n  PRIMARY KEY (id)';
      createTableSQL += '\n);';
      
      console.log('SQL to execute:\n', createTableSQL);
      
      // Since we can't execute DDL directly, let's create the table manually using INSERT approach
      console.log('\n❌ Cannot execute DDL through Supabase client');
      console.log('✅ Need to use Supabase dashboard SQL editor or alternative method');
      
      // Export the SQL for manual execution
      require('fs').writeFileSync('create-users-table.sql', createTableSQL);
      console.log('📄 SQL saved to: create-users-table.sql');
      
    } else if (supabaseError) {
      console.log('❌ Error querying users table:', supabaseError);
    } else {
      console.log('✅ Users table exists in Supabase but may be missing columns');
      
      // Get existing columns in Supabase users table
      console.log('\n3. Getting existing users table structure from Supabase...');
      
      // Try a simple query to see what columns exist
      const { data: sampleUser, error: sampleError } = await supabaseAdmin
        .from('users')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        console.log('❌ Error getting sample user:', sampleError);
      } else {
        const existingColumns = sampleUser && sampleUser.length > 0 
          ? Object.keys(sampleUser[0])
          : [];
        
        console.log('Existing columns in Supabase:', existingColumns);
        
        const neonColumnNames = supabaseColumns.map(c => c.column_name);
        const missingColumns = neonColumnNames.filter(col => !existingColumns.includes(col));
        
        console.log('\n4. Missing columns in Supabase:', missingColumns);
        
        if (missingColumns.length > 0) {
          // Generate ALTER TABLE statements for missing columns
          let alterSQL = '';
          for (const colName of missingColumns) {
            const colDef = supabaseColumns.find(c => c.column_name === colName);
            if (colDef) {
              alterSQL += `ALTER TABLE public.users ADD COLUMN ${colName} `;
              
              if (colDef.data_type === 'character varying') {
                alterSQL += 'VARCHAR';
              } else if (colDef.data_type === 'timestamp without time zone') {
                alterSQL += 'TIMESTAMP';
              } else {
                alterSQL += colDef.data_type.toUpperCase();
              }
              
              if (colDef.column_default) {
                if (colDef.column_default === "'{}'::jsonb") {
                  alterSQL += " DEFAULT '{}'::jsonb";
                } else if (colDef.column_default === 'true') {
                  alterSQL += ' DEFAULT true';
                } else if (colDef.column_default === 'false') {
                  alterSQL += ' DEFAULT false';
                }
              }
              
              alterSQL += ';\n';
            }
          }
          
          console.log('\n📄 SQL to add missing columns:');
          console.log(alterSQL);
          
          // Save to file for manual execution
          require('fs').writeFileSync('add-missing-columns.sql', alterSQL);
          console.log('📄 SQL saved to: add-missing-columns.sql');
        } else {
          console.log('✅ All columns exist in Supabase!');
        }
      }
    }
    
    await supabasePool.end();
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

syncUsersTableToSupabase();