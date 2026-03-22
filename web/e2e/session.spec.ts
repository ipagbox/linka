import { test, expect } from '@playwright/test'

// These tests verify the session recovery behaviors defined in Stage 4.
// No real Synapse is needed: the app handles network failures optimistically
// (keeps session), while structural failures (bad JSON, wrong version) trigger
// a clean reset to the placeholder screen.

test('corrupted session data → app shows placeholder', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('linka_session', 'this-is-not-valid-json')
  })
  await page.reload()
  await expect(page.getByText(/private messaging/i)).toBeVisible()
  // Corrupted session must be cleared
  const stored = await page.evaluate(() => localStorage.getItem('linka_session'))
  expect(stored).toBeNull()
})

test('incomplete session (missing fields) → app shows placeholder', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('linka_session', JSON.stringify({ userId: '@alice:localhost' }))
  })
  await page.reload()
  await expect(page.getByText(/private messaging/i)).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('linka_session'))
  expect(stored).toBeNull()
})

test('session with wrong version → app shows placeholder', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'linka_session',
      JSON.stringify({
        version: 999,
        userId: '@alice:localhost',
        accessToken: 'syt_abc',
        deviceId: 'DEVICE1',
        homeserver: 'http://localhost:8008',
        displayName: 'Alice',
      }),
    )
  })
  await page.reload()
  await expect(page.getByText(/private messaging/i)).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('linka_session'))
  expect(stored).toBeNull()
})

test('valid session → reload → app shell shown', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'linka_session',
      JSON.stringify({
        version: 1,
        userId: '@bob:localhost',
        accessToken: 'syt_bob',
        deviceId: 'DEVICE2',
        homeserver: 'http://localhost:8008',
        displayName: 'Bob',
      }),
    )
  })
  await page.reload()
  await expect(page.getByTestId('app-shell-greeting')).toBeVisible()
  await expect(page.getByTestId('app-shell-greeting')).toContainText('Bob')
})

test('logout → session cleared → placeholder shown', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem(
      'linka_session',
      JSON.stringify({
        version: 1,
        userId: '@carol:localhost',
        accessToken: 'syt_carol',
        deviceId: 'DEVICE3',
        homeserver: 'http://localhost:8008',
        displayName: 'Carol',
      }),
    )
  })
  await page.reload()
  await expect(page.getByTestId('app-shell-greeting')).toBeVisible()

  await page.getByTestId('logout-button').click()

  await expect(page.getByText(/private messaging/i)).toBeVisible()
  const stored = await page.evaluate(() => localStorage.getItem('linka_session'))
  expect(stored).toBeNull()
})
