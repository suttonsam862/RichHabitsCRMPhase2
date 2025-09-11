import { spawn } from 'child_process';
import 'dotenv/config';

async function completeSchemaSync() {
  return new Promise((resolve, reject) => {
    console.log('Starting automated schema push...');
    
    const child = spawn('npm', ['run', 'db:push'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let errorOutput = '';
    let promptSent = false;

    child.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(chunk);
      
      // When we see the prompt about team_name, send the "+" response
      if (chunk.includes('Is team_name column in org_sports table created or renamed') && !promptSent) {
        console.log('\n📤 Sending response to create new team_name column...');
        child.stdin.write('+\n');
        promptSent = true;
      }
    });

    child.stderr.on('data', (data) => {
      const chunk = data.toString();
      errorOutput += chunk;
      console.error(chunk);
    });

    child.on('close', (code) => {
      console.log(`\nSchema push completed with exit code: ${code}`);
      console.log('Full output:', output);
      
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Schema push failed with code ${code}. Error: ${errorOutput}`));
      }
    });

    child.on('error', (error) => {
      console.error('Process error:', error);
      reject(error);
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error('Schema push timed out'));
    }, 60000);
  });
}

completeSchemaSync()
  .then((result) => {
    console.log('✅ Schema sync completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema sync failed:', error);
    process.exit(1);
  });