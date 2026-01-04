const { chromium } = require('playwright');

async function testSecurityFeature() {
  console.log('Starting Test: Unauthenticated user blocked from dashboard\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Step 1: Navigate to dashboard without authentication
    console.log('Step 1: Navigate to /dashboard without authentication');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle' });

    // Step 2: Check the current URL
    const currentUrl = page.url();
    console.log('Step 2: Current URL after navigation:', currentUrl);

    // Step 3: Verify redirection to /login
    const isRedirectedToLogin = currentUrl.includes('/login') || currentUrl.includes('login');
    console.log('Step 3: Redirected to login:', isRedirectedToLogin);

    // Step 4: Check if login form is visible (not dashboard content)
    const loginFormVisible = await page.locator('form').isVisible().catch(() => false);
    console.log('Step 4: Login form visible:', loginFormVisible);

    // Step 5: Verify no dashboard content is displayed
    const dashboardTitle = await page.locator('h1:has-text("Dashboard")').isVisible().catch(() => false);
    console.log('Step 5: Dashboard title visible:', dashboardTitle);

    // Step 6: Check for "College Admissions" on login page
    const loginPageTitle = await page.locator('h1:has-text("College Admissions")').isVisible().catch(() => false);
    console.log('Step 6: Login page title visible:', loginPageTitle);

    // Check console errors
    console.log('\nConsole errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);

    // Test result
    console.log('\n=== TEST RESULT ===');
    if (isRedirectedToLogin && loginFormVisible && !dashboardTitle) {
      console.log('✅ PASS: Unauthenticated user is blocked from dashboard');
      console.log('   - Redirected to /login');
      console.log('   - Login form displayed');
      console.log('   - No dashboard content visible');
    } else {
      console.log('❌ FAIL: Security feature not working correctly');
      console.log('   isRedirectedToLogin:', isRedirectedToLogin);
      console.log('   loginFormVisible:', loginFormVisible);
      console.log('   dashboardTitleVisible:', dashboardTitle);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testSecurityFeature();