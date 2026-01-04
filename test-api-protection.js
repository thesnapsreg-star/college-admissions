const { chromium } = require('playwright');

async function testAPIEndpointProtection() {
  console.log('Starting Test: API endpoints reject unauthenticated requests\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Step 1: Test GET request without token - should return 401
    console.log('Step 1: Test GET /api/applications without auth token');
    const response1 = await page.evaluate(async () => {
      const res = await fetch('/api/applications');
      return { status: res.status, text: await res.text() };
    });
    console.log('   Status:', response1.status);
    console.log('   Response:', response1.text.substring(0, 100));

    // Step 3: Test POST request without token - should return 401
    console.log('\nStep 2: Test POST /api/applications without auth token');
    const response2 = await page.evaluate(async () => {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: 'Test', last_name: 'User', email: 'test@test.com', program_id: 'test' })
      });
      return { status: res.status, text: await res.text() };
    });
    console.log('   Status:', response2.status);
    console.log('   Response:', response2.text.substring(0, 100));

    // Step 4: Test sensitive endpoint without token
    console.log('\nStep 3: Test GET /api/dashboard/stats without auth token');
    const response3 = await page.evaluate(async () => {
      const res = await fetch('/api/dashboard/stats');
      return { status: res.status, text: await res.text() };
    });
    console.log('   Status:', response3.status);
    console.log('   Response:', response3.text.substring(0, 100));

    // Step 5: Test GET /api/users without token
    console.log('\nStep 4: Test GET /api/users (sensitive endpoint) without auth token');
    const response4 = await page.evaluate(async () => {
      const res = await fetch('/api/auth/me');
      return { status: res.status, text: await res.text() };
    });
    console.log('   Status:', response4.status);
    console.log('   Response:', response4.text.substring(0, 100));

    // Verification
    console.log('\n=== TEST RESULT ===');
    const all401 = response1.status === 401 && response2.status === 401 &&
                   response3.status === 401 && response4.status === 401;

    const noSensitiveData =
      !response1.text.includes('password') &&
      !response2.text.includes('password') &&
      !response3.text.includes('password') &&
      !response4.text.includes('password_hash');

    if (all401 && noSensitiveData) {
      console.log('✅ PASS: API endpoints reject unauthenticated requests');
      console.log('   - All endpoints return 401: YES');
      console.log('   - No sensitive data exposed: YES');
    } else {
      console.log('❌ FAIL: API endpoint protection not working correctly');
      console.log('   All return 401:', all401);
      console.log('   No sensitive data:', noSensitiveData);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testAPIEndpointProtection();