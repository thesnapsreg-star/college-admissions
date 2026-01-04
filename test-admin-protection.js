const { chromium } = require('playwright');

async function testAdminRouteProtection() {
  console.log('Starting Test: Applicant blocked from admin panel\n');

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
    // Step 1: Log in as applicant
    console.log('Step 1: Login as applicant role');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });

    // Clear any stored auth
    await page.evaluate(() => localStorage.clear());

    // Login as applicant
    await page.fill('input[name="email"]', 'student@email.com');
    await page.fill('input[name="password"]', 'student123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('   ✅ Logged in as applicant');

    // Step 2: Try to access admin routes - /users (should be blocked)
    console.log('\nStep 2: Access /users (admin-only route)');
    await page.goto('http://localhost:3000/users', { waitUntil: 'networkidle' });

    const currentUrl = page.url();
    const redirectedToDashboard = currentUrl.includes('/dashboard') && !currentUrl.includes('/users');
    const isNotOnUsersPage = !await page.locator('h1:has-text("Users Management")').isVisible().catch(() => false);

    console.log('   Current URL:', currentUrl);
    console.log('   Redirected to dashboard:', redirectedToDashboard);
    console.log('   Users page NOT visible:', isNotOnUsersPage);

    // Step 3: Try to access settings (should be blocked)
    console.log('\nStep 3: Access /settings (admin-only route)');
    await page.goto('http://localhost:3000/settings', { waitUntil: 'networkidle' });

    const settingsUrl = page.url();
    const redirectedFromSettings = settingsUrl.includes('/dashboard') && !settingsUrl.includes('/settings');
    const isNotOnSettingsPage = !await page.locator('h1:has-text("Settings")').isVisible().catch(() => false);

    console.log('   Current URL:', settingsUrl);
    console.log('   Redirected to dashboard:', redirectedFromSettings);
    console.log('   Settings page NOT visible:', isNotOnSettingsPage);

    // Step 4: Verify applications page IS accessible
    console.log('\nStep 4: Access /applications (should be allowed for all authenticated users)');
    await page.goto('http://localhost:3000/applications', { waitUntil: 'networkidle' });

    const applicationsUrl = page.url();
    const canAccessApplications = applicationsUrl.includes('/applications');
    const isOnApplicationsPage = await page.locator('h1:has-text("Applications")').isVisible().catch(() => false);

    console.log('   Current URL:', applicationsUrl);
    console.log('   Can access applications page:', canAccessApplications);

    // Check console errors
    console.log('\nConsole errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);

    // Test result
    console.log('\n=== TEST RESULT ===');
    if (redirectedToDashboard && redirectedFromSettings && canAccessApplications && isNotOnUsersPage && isNotOnSettingsPage && isOnApplicationsPage) {
      console.log('✅ PASS: Applicant blocked from admin panel');
      console.log('   - /users redirect to dashboard: YES');
      console.log('   - /settings redirect to dashboard: YES');
      console.log('   - /applications accessible: YES');
      console.log('   - No admin functionality exposed');
    } else {
      console.log('❌ FAIL: Admin route protection not working correctly');
      console.log('   /users redirected:', redirectedToDashboard);
      console.log('   /settings redirected:', redirectedFromSettings);
      console.log('   /applications accessible:', canAccessApplications);
    }

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    await browser.close();
  }
}

testAdminRouteProtection();