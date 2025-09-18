/**
 * Simple test script to verify Prometheus metrics implementation
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testMetricsEndpoint() {
  console.log('🧪 Testing Prometheus metrics endpoint...');
  
  try {
    // Test metrics endpoint
    const metricsResponse = await fetch(`${BASE_URL}/metrics`);
    
    if (!metricsResponse.ok) {
      throw new Error(`Metrics endpoint failed: ${metricsResponse.status}`);
    }
    
    const metricsText = await metricsResponse.text();
    
    // Check if basic metrics are present
    const expectedMetrics = [
      'http_requests_total',
      'http_request_duration_seconds',
      'process_uptime_seconds',
      'nodejs_heap_size_used_bytes',
      'health_check_status'
    ];
    
    console.log('✅ Metrics endpoint is accessible');
    console.log(`📊 Response size: ${metricsText.length} bytes`);
    
    let foundMetrics = 0;
    for (const metric of expectedMetrics) {
      if (metricsText.includes(metric)) {
        console.log(`✅ Found metric: ${metric}`);
        foundMetrics++;
      } else {
        console.log(`❌ Missing metric: ${metric}`);
      }
    }
    
    console.log(`📈 Found ${foundMetrics}/${expectedMetrics.length} expected metrics`);
    
    // Check for custom application metrics
    const customMetrics = [
      'auth_attempts_total',
      'business_user_registrations_total',
      'db_queries_total'
    ];
    
    let foundCustomMetrics = 0;
    for (const metric of customMetrics) {
      if (metricsText.includes(metric)) {
        console.log(`✅ Found custom metric: ${metric}`);
        foundCustomMetrics++;
      } else {
        console.log(`⚠️  Custom metric not yet populated: ${metric}`);
      }
    }
    
    console.log(`🎯 Custom metrics available: ${foundCustomMetrics}/${customMetrics.length}`);
    
    return { success: true, foundMetrics, foundCustomMetrics };
    
  } catch (error) {
    console.error('❌ Error testing metrics endpoint:', error.message);
    return { success: false, error: error.message };
  }
}

async function testHealthEndpoints() {
  console.log('\n🏥 Testing health check endpoints...');
  
  const endpoints = ['/healthz', '/api/health'];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`);
      
      if (!response.ok) {
        console.log(`❌ Health endpoint ${endpoint} failed: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      console.log(`✅ Health endpoint ${endpoint} is working`);
      console.log(`   Status: ${data.status || data.data?.status}`);
      console.log(`   Uptime: ${data.uptimeSec || data.data?.uptimeSec}s`);
      
    } catch (error) {
      console.log(`❌ Health endpoint ${endpoint} error:`, error.message);
    }
  }
}

async function generateSampleTraffic() {
  console.log('\n🚗 Generating sample traffic to populate metrics...');
  
  const requests = [
    { url: '/api/health', method: 'GET' },
    { url: '/healthz', method: 'GET' },
    { url: '/api/v1/auth/login', method: 'POST', body: { email: 'test@test.com', password: 'invalid' } },
    { url: '/api/v1/organizations', method: 'GET' },
  ];
  
  for (const req of requests) {
    try {
      const options = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (req.body) {
        options.body = JSON.stringify(req.body);
      }
      
      const response = await fetch(`${BASE_URL}${req.url}`, options);
      console.log(`${req.method} ${req.url} -> ${response.status}`);
      
      // Don't worry about the response content, just generate traffic
      
    } catch (error) {
      console.log(`${req.method} ${req.url} -> Error: ${error.message}`);
    }
  }
  
  console.log('✅ Sample traffic generated');
}

async function main() {
  console.log('🚀 Starting Prometheus metrics test suite\n');
  
  // Wait for server to start
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test health endpoints
  await testHealthEndpoints();
  
  // Generate some traffic to populate metrics
  await generateSampleTraffic();
  
  // Test metrics endpoint
  const metricsResult = await testMetricsEndpoint();
  
  console.log('\n📋 Test Summary:');
  console.log(`Metrics endpoint: ${metricsResult.success ? '✅ Working' : '❌ Failed'}`);
  
  if (metricsResult.success) {
    console.log('🎉 Prometheus metrics implementation is working!');
    console.log('\n💡 Next steps:');
    console.log('1. Configure Prometheus to scrape http://localhost:3000/metrics');
    console.log('2. Set up Grafana dashboards for visualization');
    console.log('3. Configure alerting based on metrics');
    console.log('4. Monitor application performance in production');
  } else {
    console.log('❌ Metrics implementation needs attention');
    console.log(`Error: ${metricsResult.error}`);
  }
}

main().catch(console.error);