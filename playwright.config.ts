import { defineConfig } from '@playwright/test'

/**
 * Verhaltenstests: dieselben Abläufe laufen gegen das Original (Projekt „legacy“)
 * und gegen die neue Fassung (Projekt „neu“). Beide Ergebnisse werden mit den
 * gespeicherten Referenzabläufen in tests/golden verglichen, die aus dem Original stammen.
 * Vorher: npm run build:test (baut dist/ mit Basis /SoundClashBeta/).
 */
const PORT = Number(process.env.TEST_PORT || 4179)

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 900 },
    locale: 'de-DE',
    actionTimeout: 15_000,
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] },
  },
  webServer: {
    command: `node tests/server.mjs`,
    url: `http://127.0.0.1:${PORT}/legacy/index.html`,
    reuseExistingServer: true,
    env: { TEST_PORT: String(PORT) },
  },
  projects: [
    { name: 'legacy', use: { baseURL: `http://127.0.0.1:${PORT}/legacy/index.html` }, testIgnore: /(pwa|neu|screenshots|begleiter|handymodus)\.spec\.ts/ },
    { name: 'neu', use: { baseURL: `http://127.0.0.1:${PORT}/SoundClashBeta/`, serviceWorkers: 'block' }, testIgnore: /(pwa|minigames)\.spec\.ts/ },
    { name: 'pwa', use: { baseURL: `http://127.0.0.1:${PORT}/SoundClashBeta/`, serviceWorkers: 'allow' }, testMatch: /pwa\.spec\.ts/ },
  ],
})
