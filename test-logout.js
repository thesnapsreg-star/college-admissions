const { chromium } = require('playwright');

async function testLogout() {
  console.log('Starting Test: Logout clears session and redirects\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Step 1: Login successfully
    console.log('Step 1: Login as admin');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'admin@college.edu');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ Logged in successfully');

    // Step 2: Verify we're on dashboard
    const dashboardUrl = page.url();
    console.log('\nStep 2: Current URL:', dashboardUrl);
    const isOnDashboard = dashboardUrl.includes('/dashboard');
    console.log('   On dashboard:', isOnDashboard);

    // Step 3: Click logout button (in sidebar)
    console.log('\nStep 3: Click logout button');
    await page.click('button:has-text("Logout")');
    await page.waitForURL('**/login', { timeout: 10000 });
    console.log('   ✅ Redirected to login page');

    // Step 4: Verify redirected to login
    const loginUrl = page.url();
    console.log('\nStep 4: Current URL after logout:', loginUrl);
    const isOnLogin = loginUrl.includes('/login');
    console.log('   On login page:', isOnLogin);

    // Step 5: Verify token cleared from localStorage
    console.log('\nStep 5: Check localStorage cleared');
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    const userData = await page.evaluate(() => localStorage.getItem('user'));
    console.log('   authToken cleared:', authToken === null);
    console.log('   user data cleared:', userData === null);

    // Step 6: Try to access dashboard with old URL
    console.log('\nStep 6: Try to access dashboard with old URL (should redirect)');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });
    const finalUrl = page.url();
    console.log('   Current URL:', finalUrl);
    const redirectedBackToLogin = finalUrl.includes('/login');
    console.log('   Redirected to login:', redirectedBackToLogin);

    // Check for login form (not dashboard content)
    const loginFormVisible = await page.locator('form').isVisible().catch(() => false);
    const dashboardNotVisible = !await page.locator('h1:has-text("Dashboard")').isVisible().catch(() => false);

    console.log('\nConsole errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);

    // Test result
    console.log('\n=== TEST RESULT ===');
    if (isOnLogin && redirectedBackToLogin && authToken === null && userData === null && loginFormVisible && dashboardNotVisible) {
      console.log('✅ PASS: Logout works correctly');
      console.log('   - Redirected to login page: YES');
      console.log('   - Token cleared from localStorage: YES');
      console.log('   - User data cleared: YES');
      console.log('   - Cannot access dashboard after logout: YES');
    } else {
      console.log('❌ FAIL: Logout not working correctly');
      console.log('   On login page:', isOnLogin);
      console.log('   Redirected back:', redirectedBackToLogin);
      console.log('   Token cleared:', authToken === null);
      console.log('   User cleared:', userData === null);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testLogout();