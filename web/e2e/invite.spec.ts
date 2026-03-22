import { test, expect } from '@playwright/test'

const CONTROL_PLANE = 'http://localhost:8080'
const MATRIX_HS = 'http://localhost:8008'

// Intercept control-plane invite validation
function mockValidInvite(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ usable: true, status: 'active' }),
    }),
  )
}

function mockInvalidInvite(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ usable: false, reason: 'invalid' }),
    }),
  )
}

function mockExpiredInvite(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ usable: false, reason: 'expired' }),
    }),
  )
}

function mockConsumeInvite(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}/consume`, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ consumed: true, used_count: 1 }),
    }),
  )
}

function mockMatrixRegister(page: import('@playwright/test').Page) {
  // Mock all requests to the Matrix homeserver
  let registerCallCount = 0
  return page.route(`${MATRIX_HS}/**`, route => {
    const url = route.request().url()

    if (url.includes('/register')) {
      registerCallCount++
      if (registerCallCount === 1) {
        // First call: UIAA challenge
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            session: 'uia-session-abc',
            flows: [{ stages: ['m.login.dummy'] }],
            params: {},
            errcode: 'M_FORBIDDEN',
            error: 'No token provided',
          }),
        })
      }
      // Second call: registration success
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: '@testuser_abc12:localhost',
          access_token: 'syt_test_access_token',
          device_id: 'TESTDEVICE1',
        }),
      })
    }

    // Handle profile/displayname update
    if (url.includes('/displayname') || url.includes('/profile/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    }

    // Handle version discovery and any other Matrix API calls
    if (url.includes('/versions') || url.includes('/_matrix/')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ versions: ['v1.1'] }),
      })
    }

    return route.fulfill({ status: 200, body: '{}', contentType: 'application/json' })
  })
}

test('valid invite shows onboarding form', async ({ page }) => {
  const token = 'valid-test-token'
  await mockValidInvite(page, token)
  await page.goto(`/invite/${token}`)
  await expect(page.getByTestId('onboarding-form')).toBeVisible()
  await expect(page.getByLabel(/your name/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /join linka/i })).toBeVisible()
})

test('invalid invite shows error screen', async ({ page }) => {
  const token = 'invalid-test-token'
  await mockInvalidInvite(page, token)
  await page.goto(`/invite/${token}`)
  await expect(page.getByTestId('invite-error')).toBeVisible()
  await expect(page.getByTestId('invite-error')).toContainText(/not valid/i)
})

test('expired invite shows expired error', async ({ page }) => {
  const token = 'expired-test-token'
  await mockExpiredInvite(page, token)
  await page.goto(`/invite/${token}`)
  await expect(page.getByTestId('invite-error')).toBeVisible()
  await expect(page.getByTestId('invite-error')).toContainText(/expired/i)
})

test('successful onboarding redirects to app shell', async ({ page }) => {
  const token = 'success-test-token'
  await mockValidInvite(page, token)
  await mockConsumeInvite(page, token)
  await mockMatrixRegister(page)

  await page.goto(`/invite/${token}`)
  await expect(page.getByTestId('onboarding-form')).toBeVisible()

  await page.getByLabel(/your name/i).fill('Test User')
  await page.getByRole('button', { name: /join linka/i }).click()

  await expect(page.getByTestId('app-shell-greeting')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('app-shell-greeting')).toContainText('Test User')
})

test('session persists after reload', async ({ page }) => {
  // Inject a session directly into localStorage
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'linka_session',
      JSON.stringify({
        version: 1,
        userId: '@alice:localhost',
        accessToken: 'syt_abc',
        deviceId: 'DEVICE1',
        homeserver: 'http://localhost:8008',
        displayName: 'Alice',
      }),
    )
  })
  await page.reload()
  await expect(page.getByTestId('app-shell-greeting')).toBeVisible()
  await expect(page.getByTestId('app-shell-greeting')).toContainText('Alice')
})

test('logout clears session and returns to placeholder', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'linka_session',
      JSON.stringify({
        version: 1,
        userId: '@alice:localhost',
        accessToken: 'syt_abc',
        deviceId: 'DEVICE1',
        homeserver: 'http://localhost:8008',
        displayName: 'Alice',
      }),
    )
  })
  await page.reload()
  await expect(page.getByTestId('app-shell-greeting')).toBeVisible()

  await page.getByTestId('logout-button').click()

  await expect(page.getByText(/private messaging/i)).toBeVisible()
  const session = await page.evaluate(() => localStorage.getItem('linka_session'))
  expect(session).toBeNull()
})
