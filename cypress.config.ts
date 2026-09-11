import { defineConfig } from 'cypress';
import { execSync } from 'child_process';
import path from 'path';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 20000,
    pageLoadTimeout: 40000,
    setupNodeEvents(on, config) {
      on('task', {
        cleanIndependizadoUser() {
          const scriptPath = path.resolve(__dirname, '../scratch_clean_test.ps1');
          try {
            execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { stdio: 'inherit' });
            return true;
          } catch (e) {
            console.error('Error cleaning test user:', e);
            return false;
          }
        },
      });
    },
  },
});
