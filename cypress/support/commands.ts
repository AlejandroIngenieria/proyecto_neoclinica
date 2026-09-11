/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(email?: string, password?: string): Chainable<void>;
  }
}

Cypress.Commands.add('login', (email = 'testpatient99@saludya.com', password = 'Password123@') => {
  cy.visit('/login');
  cy.get('body').then(($body) => {
    if ($body.find('button:contains("Iniciar sesión con correo electrónico")').length > 0) {
      cy.contains('button', 'Iniciar sesión con correo electrónico').click();
    }
  });
  cy.get('#correo, input[type="email"], input[name="correo"]').should('be.visible').clear().type(email);
  cy.get('#password, input[type="password"]').clear().type(password);
  cy.get('button[type="submit"]').click();
  cy.url({ timeout: 15000 }).should('include', '/dashboard');
});

