// Import commands.js using ES2015 syntax:
import './commands';

// Ignore uncaught exceptions from third-party scripts or hydration quirks
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test on unhandled exceptions
  return false;
});
