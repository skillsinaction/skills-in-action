import { defineConfig } from '@playwright/test';
const port = Number(process.env.PORT || 4173);
export default defineConfig({
  testDir: './tests',
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1 --directory site`,
    url: `http://127.0.0.1:${port}/index.html`,
    reuseExistingServer: false,
    stderr: 'ignore',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});

