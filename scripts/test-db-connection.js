
#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔍 Testing Database Connection and Schema\n');

try {
  console.log('1. Testing basic connection...');
  const connection = execSync('psql $DATABASE_URL -c "SELECT NOW();"', { encoding: 'utf8' });
  console.log('✅ Database connection successful\n');

  console.log('2. Checking users table...');
  const usersTable = execSync('psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"', { encoding: 'utf8' });
  console.log('✅ Users table accessible\n');

  console.log('3. Checking organizations table...');
  const orgsTable = execSync('psql $DATABASE_URL -c "SELECT COUNT(*) FROM organizations;"', { encoding: 'utf8' });
  console.log('✅ Organizations table accessible\n');

  console.log('4. Checking sports table...');
  const sportsTable = execSync('psql $DATABASE_URL -c "SELECT COUNT(*) FROM sports;"', { encoding: 'utf8' });
  console.log('✅ Sports table accessible\n');

  console.log('5. Checking sports table schema...');
  const sportsSchema = execSync('psql $DATABASE_URL -c "\\d sports"', { encoding: 'utf8' });
  console.log('Sports table schema:');
  console.log(sportsSchema);

  console.log('\n🎉 All database tests passed!');
} catch (error) {
  console.error('❌ Database test failed:', error.message);
  process.exit(1);
}
