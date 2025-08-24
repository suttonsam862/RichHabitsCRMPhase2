
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

class ComprehensiveTest {
  private supabase: any;
  private results: TestResult[] = [];

  constructor() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(url, key);
  }

  private addResult(name: string, passed: boolean, error?: string, details?: any) {
    this.results.push({ name, passed, error, details });
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${name}`);
    if (!passed && error) {
      console.log(`   Error: ${error}`);
    }
    if (details) {
      console.log(`   Details:`, details);
    }
  }

  async testSchemaRequirements() {
    console.log('\n📋 Testing Schema Requirements...');

    // Test organizations table structure
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .limit(1);

      if (error) {
        this.addResult('Organizations table access', false, error.message);
        return;
      }

      this.addResult('Organizations table access', true);

      // Check for required columns by attempting to select them
      const requiredOrgColumns = [
        'id', 'name', 'brand_primary', 'brand_secondary', 'status', 'created_at'
      ];

      for (const column of requiredOrgColumns) {
        try {
          const { error: colError } = await this.supabase
            .from('organizations')
            .select(column)
            .limit(1);

          this.addResult(`Organizations.${column} column exists`, !colError, colError?.message);
        } catch (e) {
          this.addResult(`Organizations.${column} column exists`, false, (e as Error).message);
        }
      }

    } catch (e) {
      this.addResult('Organizations table access', false, (e as Error).message);
    }

    // Test org_sports table structure
    try {
      const { data, error } = await this.supabase
        .from('org_sports')
        .select('*')
        .limit(1);

      if (error) {
        this.addResult('Org_sports table access', false, error.message);
        return;
      }

      this.addResult('Org_sports table access', true);

      // Check for required columns
      const requiredOrgSportsColumns = [
        'id', 'organization_id', 'sport_id', 'contact_name', 'contact_email', 'contact_user_id'
      ];

      for (const column of requiredOrgSportsColumns) {
        try {
          const { error: colError } = await this.supabase
            .from('org_sports')
            .select(column)
            .limit(1);

          this.addResult(`Org_sports.${column} column exists`, !colError, colError?.message);
        } catch (e) {
          this.addResult(`Org_sports.${column} column exists`, false, (e as Error).message);
        }
      }

    } catch (e) {
      this.addResult('Org_sports table access', false, (e as Error).message);
    }
  }

  async testApiEndpoints() {
    console.log('\n🌐 Testing API Endpoints...');

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';

    // Test GET organizations list
    try {
      const response = await fetch(`${baseUrl}/api/v1/organizations`);
      const data = await response.json();
      
      this.addResult(
        'GET /api/v1/organizations', 
        response.ok, 
        response.ok ? undefined : `${response.status}: ${data.error || data.message}`,
        { status: response.status, hasData: !!data }
      );
    } catch (e) {
      this.addResult('GET /api/v1/organizations', false, (e as Error).message);
    }

    // Test GET sports list
    try {
      const response = await fetch(`${baseUrl}/api/v1/sports`);
      const data = await response.json();
      
      this.addResult(
        'GET /api/v1/sports', 
        response.ok, 
        response.ok ? undefined : `${response.status}: ${data.error || data.message}`,
        { status: response.status, hasData: !!data }
      );
    } catch (e) {
      this.addResult('GET /api/v1/sports', false, (e as Error).message);
    }
  }

  async testOrganizationCreation() {
    console.log('\n🏢 Testing Organization Creation...');

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';

    // Test cases with different payloads
    const testCases = [
      {
        name: 'Minimal valid organization',
        payload: {
          name: `Test Org ${Date.now()}`,
          isBusiness: false,
          brandPrimary: '#FF0000',
          brandSecondary: '#00FF00'
        }
      },
      {
        name: 'Organization with sports',
        payload: {
          name: `Test Org With Sports ${Date.now()}`,
          isBusiness: false,
          brandPrimary: '#FF0000',
          brandSecondary: '#00FF00',
          sports: [
            {
              sportId: '26c98c39-f204-40f3-a5ec-b0dbd040b01c', // Wrestling
              contactName: 'Test Contact',
              contactEmail: 'test@example.com',
              contactPhone: '555-1234'
            }
          ]
        }
      },
      {
        name: 'Invalid payload (missing name)',
        payload: {
          isBusiness: false,
          brandPrimary: '#FF0000',
          brandSecondary: '#00FF00'
        },
        expectError: true
      }
    ];

    for (const testCase of testCases) {
      try {
        const response = await fetch(`${baseUrl}/api/v1/organizations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase.payload)
        });

        const data = await response.json();
        
        if (testCase.expectError) {
          this.addResult(
            `POST Organization: ${testCase.name}`,
            !response.ok,
            response.ok ? 'Expected error but got success' : undefined,
            { status: response.status, response: data }
          );
        } else {
          this.addResult(
            `POST Organization: ${testCase.name}`,
            response.ok,
            response.ok ? undefined : `${response.status}: ${data.error || data.message}`,
            { status: response.status, response: data }
          );

          // Clean up created organization
          if (response.ok && data.data?.id) {
            try {
              await this.supabase
                .from('organizations')
                .delete()
                .eq('id', data.data.id);
            } catch (e) {
              console.log(`   Cleanup failed for ${data.data.id}:`, (e as Error).message);
            }
          }
        }

      } catch (e) {
        this.addResult(`POST Organization: ${testCase.name}`, false, (e as Error).message);
      }
    }
  }

  async testSchemaCache() {
    console.log('\n🔄 Testing Schema Cache...');

    // Test if PostgREST schema cache is up to date
    try {
      const testQueries = [
        { table: 'organizations', columns: ['brand_primary', 'brand_secondary'] },
        { table: 'org_sports', columns: ['contact_user_id', 'organization_id'] }
      ];

      for (const query of testQueries) {
        for (const column of query.columns) {
          try {
            const { error } = await this.supabase
              .from(query.table)
              .select(column)
              .limit(1);

            this.addResult(
              `Schema cache: ${query.table}.${column}`,
              !error,
              error?.message
            );
          } catch (e) {
            this.addResult(
              `Schema cache: ${query.table}.${column}`,
              false,
              (e as Error).message
            );
          }
        }
      }

    } catch (e) {
      this.addResult('Schema cache test', false, (e as Error).message);
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Organization Creation Tests\n');

    await this.testSchemaRequirements();
    await this.testSchemaCache();
    await this.testApiEndpoints();
    await this.testOrganizationCreation();

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / total) * 100)}%\n`);

    if (failed > 0) {
      console.log('🔧 Failed tests indicate issues that need to be fixed before manual testing.');
      console.log('   Run the schema fixes first, then rerun this test.\n');
      
      // Show specific recommendations
      const schemaErrors = this.results.filter(r => !r.passed && r.name.includes('column exists'));
      if (schemaErrors.length > 0) {
        console.log('💡 Schema issues detected. Try running:');
        console.log('   npm run db:reload-postgrest');
        console.log('   npm run db:schema:dump');
        console.log('   npm run db:schema:check\n');
      }

      process.exit(1);
    } else {
      console.log('🎉 All tests passed! Organization creation should work reliably.');
    }
  }
}

async function main() {
  const tester = new ComprehensiveTest();
  await tester.runAllTests();
}

main().catch((e) => {
  console.error('❌ Test runner failed:', e.message);
  process.exit(1);
});
