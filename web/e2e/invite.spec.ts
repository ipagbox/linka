import { expect, test } from '@playwright/test'

const CONTROL_PLANE = 'http://localhost:8080'
const SYNAPSE = 'http://localhost:8008'

// Helper — mock the validate endpoint
function mockInviteValid(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ usable: true, status: 'active', usage_type: 'single_use' }),
    }),
  )
}

function mockInviteInvalid(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ usable: false, status: 'consumed', reason: 'consumed' }),
    }),
  )
}

function mockInviteExpired(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ usable: false, status: 'active', reason: 'expired' }),
    }),
  )
}

function mockConsumeInvite(page: import('@playwright/test').Page, token: string) {
  return page.route(`${CONTROL_PLANE}/api/v1/invites/${token}/consume`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ consumed: true, used_count: 1 }),
    }),
  )
}

function mockMatrixRegister(page: import('@playwright/test').Page) {
  // Synapse may respond with a 401 UIA challenge first, then accept dummy auth
  let called = false
  return page.route(`${SYNAPSE}/_matrix/client/v3/register`, (route) => {
    if (!called) {
      called = true
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: '@alice_abc123:localhost',
          access_token: 'syt_test_token',
          device_id: 'TESTDEVICE',
        }),
      })
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: '@alice_abc123:localhost',
          access_token: 'syt_test_token',
          device_id: 'TESTDEVICE',
        }),
      })
    }
  })
}

function mockMatrixDisplayName(page: import('@playwright/test').Page) {
  return page.route(`${SYNAPSE}/_matrix/client/**`, (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    } else {
      route.continue()
    }
  })
}

test('valid invite shows onboarding form', async ({ page }) => {
  await mockInviteValid(page, 'valid-token-123')
  await page.goto('/invite/valid-token-123')
  await expect(page.getByRole('textbox', { name: /your name/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /continue/i })).toBeVisible()
})

test('invalid invite shows error screen', async ({ page }) => {
  await mockInviteInvalid(page, 'bad-token')
  await page.goto('/invite/bad-token')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('consumed')
})

test('expired invite shows error screen', async ({ page }) => {
  await mockInviteExpired(page, 'old-token')
  await page.goto('/invite/old-token')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('expired')
})

test('successful onboarding redirects to app shell', async ({ page }) => {
  await mockInviteValid(page, 'good-token')
  await mockConsumeInvite(page, 'good-token')
  await mockMatrixRegister(page)
  await mockMatrixDisplayName(page)

  await page.goto('/invite/good-token')
  await expect(page.getByRole('textbox', { name: /your name/i })).toBeVisible()

  await page.getByRole('textbox').fill('Alice')
  await page.getByRole('button', { name: /continue/i }).click()

  await expect(page.getByText(/signed in as/i)).toBeVisible({ timeout: 10_000 })
})

test('session is restored after reload', async ({ page }) => {
  await mockInviteValid(page, 'tok-restore')
  await mockConsumeInvite(page, 'tok-restore')
  await mockMatrixRegister(page)
  await mockMatrixDisplayName(page)

  await page.goto('/invite/tok-restore')
  await page.getByRole('textbox').fill('Bob')
  await page.getByRole('button', { name: /continue/i }).click()
  await expect(page.getByText(/signed in as/i)).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await expect(page.getByText(/signed in as/i)).toBeVisible()
})

test('logout clears session', async ({ page }) => {
  await mockInviteValid(page, 'tok-logout')
  await mockConsumeInvite(page, 'tok-logout')
  await mockMatrixRegister(page)
  await mockMatrixDisplayName(page)

  await page.goto('/invite/tok-logout')
  await page.getByRole('textbox').fill('Carol')
  await page.getByRole('button', { name: /continue/i }).click()
  await expect(page.getByText(/signed in as/i)).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: /log out/i }).click()
  await expect(page.getByText(/private messaging/i)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/private messaging/i)).toBeVisible()
})
