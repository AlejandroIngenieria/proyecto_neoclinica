describe('Prueba E2E: Registro de dependiente adulto, agendamiento de citas, independización a nohit76479@94an.com y preservación de citas', () => {
  const titularEmail = 'testpatient99@saludya.com';
  const titularPassword = 'Password123@';
  const targetEmail = 'nohit76479@94an.com';
  const depNombre = 'Roberto';
  const depApellido = 'Méndez';

  before(() => {
    // Limpieza previa del usuario destino y dependiente de prueba en base de datos
    cy.task('cleanIndependizadoUser');
  });

  it('Flujo completo de principio a fin', () => {
    // 1. Inicio de Sesión con la cuenta titular
    cy.login(titularEmail, titularPassword);

    // Validar acceso al dashboard
    cy.url().should('include', '/dashboard');

    // 2. Navegar a Pacientes Afiliados y Registrar Dependiente Mayor de Edad
    cy.visit('/dashboard/perfil/pacientes');
    cy.contains('Pacientes Afiliados', { timeout: 15000 }).should('be.visible');

    // Abrir formulario de registro
    cy.contains('button', 'Agregar Paciente').click();

    // Copiar datos del titular si el botón está presente
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Copiar datos del titular")').length > 0) {
        cy.contains('button', 'Copiar datos del titular').click();
      }
    });

    // Completar datos del nuevo paciente adulto
    cy.get('input[name="pac_primer_nombre"]').clear().type(depNombre);
    cy.get('input[name="pac_primer_apellido"]').clear().type(depApellido);
    // Fecha de nacimiento para mayor de edad (nacido en el 2000 -> 26 años)
    cy.get('input[name="pac_fecha_nacimiento"]').type('2000-05-15');
    cy.get('select[name="pac_genero"]').select('masculino');
    cy.get('select[name="codParentesco"]').select('3'); // Hijo/a
    cy.get('input[name="pac_celular"]').clear().type('55554321');

    // Guardar dependiente
    cy.contains('button', 'Guardar Paciente').click();

    // Verificar que aparece en el listado de pacientes afiliados
    cy.contains(`${depNombre} ${depApellido}`, { timeout: 20000 }).should('be.visible');

    // 3. Crear una cita para este nuevo paciente dependiente
    // Obtenemos el JWT para vincular la cita de manera directa y precisa en base de datos
    cy.request({
      method: 'POST',
      url: 'http://localhost:5010/api/Autenticacion/login',
      body: {
        correo: titularEmail,
        password: titularPassword,
      },
    }).then((loginRes) => {
      expect(loginRes.status).to.eq(200);
      const token = loginRes.body.token;

      // Obtener el pac_codigo del paciente recién creado
      cy.request({
        method: 'GET',
        url: 'http://localhost:5010/api/Pacientes/perfil',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((perfilRes) => {
        expect(perfilRes.status).to.eq(200);
        const pacientes = perfilRes.body;
        const nuevoDep = pacientes.find(
          (p: any) =>
            (p.pacPrimerNombre === depNombre || p.pac_primer_nombre === depNombre) &&
            (p.pacPrimerApellido === depApellido || p.pac_primer_apellido === depApellido)
        );
        expect(nuevoDep).to.exist;
        const depPacCodigo = nuevoDep.pacCodigo || nuevoDep.pac_codigo;

        // Agendar cita médica para el nuevo dependiente usando form: true para [FromForm]
        cy.request({
          method: 'POST',
          url: 'http://localhost:5010/api/FlujoCitas',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          form: true,
          body: {
            CodPaciente: depPacCodigo,
            CodMedico: '94cbc29e-3667-f111-932c-b47df82e049f', // Dra. Ana López
            CodServicio: 1,
            ConsultorioId: 1,
            Fecha: '2026-10-15T09:00:00',
            Hora: '09:00:00',
            Modalidad: 'presencial',
            Motivo: 'Consulta de rutina y chequeo general',
            Precio: '250.00',
          },
        }).then((citaRes) => {
          expect(citaRes.status).to.be.oneOf([200, 201]);

          // 4. Independizar la cuenta del paciente y enviarla a nohit76479@94an.com
          cy.visit('/dashboard/perfil/pacientes');
          cy.contains(`${depNombre} ${depApellido}`, { timeout: 15000 })
            .parents('.group')
            .within(() => {
              cy.get('[data-cy="btn-kebab-paciente"]').click();
              cy.get('[data-cy="btn-independizar-paciente"]').click({ force: true });
            });

          // Llenar modal de independización
          cy.contains('Independizar Cuenta', { timeout: 10000 }).should('be.visible');
          cy.get('input[name="nuevoCorreo"]').clear().type(targetEmail);
          cy.get('input[type="checkbox"]').should('be.checked'); // Conservar historial
          cy.contains('button', 'Confirmar y Enviar').click();

          // Validar toast / notificación de éxito
          cy.contains('¡Cuenta Independizada con Éxito!', { timeout: 25000 }).should('be.visible');

          // 5. Preservación de Citas en la Cuenta Titular:
          // Navegar a Mis Citas
          cy.visit('/dashboard/citas');
          cy.contains(/Pacientes y Citas|Mis Citas Médicas/, { timeout: 20000 }).should('be.visible');

          // Clic en la tarjeta de paciente de Roberto Méndez
          cy.contains(`${depNombre} ${depApellido}`).click({ force: true });

          // La cita debe conservarse y ser visible
          cy.contains('Consulta de rutina y chequeo general', { timeout: 15000 }).should('be.visible');

          // Debe mostrar el distintivo de "Paciente Independizado"
          cy.get('[data-cy="badge-paciente-independizado"]')
            .should('be.visible')
            .and('contain', 'Paciente Independizado');

          // Debe mostrar el estado de solo lectura (sin opción de agendar o alterar la cita)
          cy.contains('Solo lectura').should('be.visible');
          cy.contains('Paciente independizado (cuenta propia activa)').should('be.visible');

          // 6. Validar que el paciente independizado ya NO aparece disponible para agendar nuevas citas
          cy.request({
            method: 'GET',
            url: 'http://localhost:5010/api/FlujoCitas/pacientes/seleccion',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).then((seleccionRes) => {
            expect(seleccionRes.status).to.eq(200);
            const lista = seleccionRes.body;
            const existeEnSeleccion = lista.some(
              (p: any) => (p.pacCodigo || p.pac_codigo) === depPacCodigo
            );
            expect(existeEnSeleccion).to.be.false;
          });
        });
      });
    });
  });
});
