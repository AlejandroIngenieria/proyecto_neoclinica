Aquí tienes la documentación detallada de los endpoints de autenticación para que el desarrollador frontend pueda integrarlos.

### Iniciar Sesión (Login)

Autentica tanto a pacientes como a doctores y devuelve el token JWT necesario para las peticiones seguras.

* **URL:** `/api/Autenticacion/login`
* **Método:** `POST`
* **Headers Requeridos:** `Content-Type: application/json`

**Cuerpo de la Petición (Request Body):**

```json
{
  "correo": "usuario@ejemplo.com",
  "password": "PasswordSegura123!"
}

```

**Respuestas (Responses):**

* 🟢 **200 OK** (Autenticación exitosa)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI...",
  "rol": "paciente", 
  "tipo": "paciente" 
}

```


*(Nota: `rol` puede ser "paciente" o "admin", y `tipo` indica la tabla de origen: "paciente" o "doctor").*
* 🔴 **401 Unauthorized** (Credenciales incorrectas o usuario inactivo)
```json
{
  "mensaje": "Credenciales incorrectas o usuario inactivo."
}

```

---

### Registro de Nuevo Paciente

Crea un nuevo usuario con rol de paciente en el sistema.

* **URL:** `/api/Autenticacion/registrar-paciente`
* **Método:** `POST`
* **Headers Requeridos:** `Content-Type: application/json`

**Cuerpo de la Petición (Request Body):**

```json
{
  "correo": "usuario@ejemplo.com",
  "password": "PasswordSegura123!",
  "primerNombre": "Juan",
  "primerApellido": "Pérez"
}

```

**Respuestas (Responses):**

* 🟢 **200 OK** (Registro exitoso)
```json
{
  "mensaje": "Paciente registrado correctamente."
}

```


* 🔴 **400 Bad Request** (Validación fallida o correo ya existe)
```json
{
  "mensaje": "El correo ya se encuentra registrado."
}

```

---

### Recuperar Contraseña (Solo Pacientes)

Permite restablecer la contraseña directamente (idealmente, en producción esto debería requerir un código OTP enviado al correo previo a este paso, pero este es el endpoint actual según el flujo definido).

* **URL:** `/api/Autenticacion/recuperar-password`
* **Método:** `POST`
* **Headers Requeridos:** `Content-Type: application/json`

**Cuerpo de la Petición (Request Body):**

```json
{
  "correo": "usuario@ejemplo.com",
  "nuevaPassword": "NuevaPassword456!"
}

```

**Respuestas (Responses):**

* 🟢 **200 OK** (Cambio exitoso)
```json
{
  "mensaje": "Contraseña restablecida correctamente."
}

```


* 🔴 **404 Not Found** (El correo no existe)
```json
{
  "mensaje": "El correo especificado no pertenece a ningún usuario."
}

```


* 🔴 **400 Bad Request** (Intento de cambiar clave de un doctor o error interno)
```json
{
  "mensaje": "La recuperación de contraseña automatizada sólo está disponible para pacientes."
}

```


---


Todos estos endpoints requieren el token JWT en las cabeceras:
`Authorization: Bearer <TOKEN>`

#### Obtener Perfil del Titular y sus Dependientes

Devuelve una lista. El primer registro generalmente es el titular (verificado por la bandera `pacTitular: true`) y los demás son sus dependientes.

* **URL:** `/api/Pacientes/perfil`
* **Método:** `GET`
* **Respuesta 200 OK:**
```json
[
  {
    "pacCodigo": "uuid-del-titular",
    "pacTitular": true,
    "pacPrimerNombre": "Juan",
    "pacPrimerApellido": "Pérez"
    // ... (otros campos de PacienteDto)
  },
  {
    "pacCodigo": "uuid-del-dependiente",
    "pacTitular": false,
    "parentescoDescripcion": "Hijo",
    "pacPrimerNombre": "Carlitos",
    "pacPrimerApellido": "Pérez"
  }
]

```

### Actualizaciones: Subida de Imágenes en Pacientes

**NOTA CRÍTICA PARA FRONTEND:** Los endpoints de crear dependiente y actualizar paciente ya no reciben JSON. Deben enviar un objeto `FormData` (`multipart/form-data`).

#### Crear Paciente Dependiente

* **URL:** `/api/Pacientes/dependiente`
* **Método:** `POST`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
* **Cuerpo (FormData):**
* `titularCodigo`: "uuid-del-titular"
* `codParentesco`: 1
* `primerNombre`: "Carlitos"
* `segundoNombre`: ""
* `primerApellido`: "Pérez"
* `segundoApellido`: "Gómez"
* `fechaNacimiento`: "2015-05-10T00:00:00"
* `genero`: "masculino"
* `tipoSangre`: "O+"
* `fotoPerfilArchivo`: **[Archivo físico (File/Blob)]** *(Opcional)*


* **Respuesta 200 OK:**

```json
{
  "mensaje": "Dependiente creado exitosamente.",
  "id": "nuevo-uuid-generado"
}

```

#### Actualizar Datos del Paciente (Titular o Dependiente)

* **URL:** `/api/Pacientes/{pacCodigo}` *(Reemplazar `{pacCodigo}` por el UUID del paciente)*
* **Método:** `PUT`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN>`, `Content-Type: multipart/form-data`
* **Cuerpo (FormData):**
* *(Todos los campos de texto anteriores)*
* `fotoPerfilArchivo`: **[Archivo físico (File/Blob)]** *(Opcional)*
* `fotoCarneArchivo`: **[Archivo físico (File/Blob)]** *(Opcional)*


* **Respuesta 200 OK:**

```json
{
  "mensaje": "Datos actualizados correctamente.",
  "urlImagenPerfil": "https://saludyastorage.blob.core.windows.net/perfiles-pacientes/...",
  "urlImagenCarne": "https://saludyastorage.blob.core.windows.net/perfiles-pacientes/..."
}

```

---

### Nuevos Endpoints: Programa de Lealtad (Puntos y Tareas)

#### Obtener Estado de Lealtad (Barra de Progreso)

Obtiene los puntos actuales, el nivel, y el porcentaje calculado para renderizar la barra de progreso.

* **URL:** `/api/Lealtad/estado`
* **Método:** `GET`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN>`
* **Respuesta 200 OK:**

```json
{
  "puntosActuales": 150,
  "nivelActual": "Plata",
  "puntosMinimosNivel": 100,
  "puntosMaximosNivel": 300,
  "imagenNivelUrl": "https://url-imagen-nivel.com/plata.png",
  "progresoPorcentaje": 25
}

```

#### Obtener Catálogo de Tareas

Lista las tareas disponibles, puntos de recompensa, e indica mediante un booleano si el usuario ya completó esa tarea.

* **URL:** `/api/Lealtad/tareas`
* **Método:** `GET`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN>`
* **Respuesta 200 OK:**

```json
[
  {
    "tareaId": 1,
    "titulo": "Completar perfil médico",
    "descripcion": "Añade tu tipo de sangre y alergias.",
    "puntosRecompensa": 50,
    "imagenUrl": null,
    "codigoAccion": "COMPLETAR_PERFIL",
    "repetible": false,
    "indicaciones": "Ve a la sección de perfil y llena los campos vacíos.",
    "completada": true
  }
]

```

#### Completar Tarea

Asigna los puntos al titular de la cuenta una vez que el frontend determine que la acción se completó.

* **URL:** `/api/Lealtad/completar`
* **Método:** `POST`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN>`, `Content-Type: application/json`
* **Cuerpo (JSON):**

```json
{
  "codigoAccion": "COMPLETAR_PERFIL"
}

```

* **Respuesta 200 OK:**

```json
{
  "mensaje": "Tarea completada y puntos asignados."
}

```


* **Respuesta 200 OK:**
```json
{
  "mensaje": "Datos actualizados correctamente."
}

```

#### Obtener Datos de un Paciente Específico

Útil si necesitas cargar los datos de un solo paciente (por ejemplo, para llenar el formulario antes de hacer el `PUT`).

* **URL:** `/api/Pacientes/{pacCodigo}` *(Reemplazar `{pacCodigo}` por el UUID del paciente)*
* **Método:** `GET`
* **Respuesta 200 OK:** Lista con 1 solo objeto `PacienteDto`.

### Eliminar Paciente Dependiente

Elimina físicamente un perfil dependiente y sus registros médicos asociados. Fallará si el dependiente tiene citas registradas.

* **URL:** `/api/Pacientes/dependiente/{pacCodigo}`
*(Reemplazar `{pacCodigo}` por el identificador UUID del dependiente)*
* **Método:** `DELETE`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN>`

**Respuestas:**

* 🟢 **200 OK**
```json
{
  "mensaje": "Dependiente eliminado correctamente."
}

```


* 🔴 **500 Internal Server Error** (Capturado por el filtro global si hay errores de validación en BD)
```json
{
  "mensaje": "No se puede eliminar el paciente porque tiene citas registradas."
}

```

---

### Eliminar Cuenta de Usuario (Titular)

Realiza una baja lógica (soft delete) del usuario en sesión. Inactiva la cuenta, métodos de pago y cancela las suscripciones activas.

* **URL:** `/api/Pacientes/cuenta`
* **Método:** `DELETE`
* **Headers Requeridos:** `Authorization: Bearer <TOKEN>`

**Respuestas:**

* 🟢 **200 OK**
```json
{
  "mensaje": "Cuenta y suscripciones desactivadas correctamente."
}

```

---

### Nuevos Endpoints: Reseñas (Reviews)

Nota: Obtener reseñas es para el perfil del médico. Crear, actualizar y eliminar reseña es para el usuario que ya haya tenido una cita con dicho médico.

#### 1. CREAR RESEÑA

* **Endpoint:** `/api/Expedientes`
* **Método:** `POST`
* **Headers:** `Authorization: Bearer {token}`
* **Body (JSON):**
```json
{
  "codDoc": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "codPac": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "codCta": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "valoracion": 5,
  "texto": "Excelente atención."
}
```
* **Respuestas:** `200 OK` (Éxito), `400 Bad Request` (Errores de validación de modelo), `409 Conflict` (La cita ya tiene reseña).



#### 3. ACTUALIZAR RESEÑA

* **Endpoint:** `/api/Expedientes/{resCodigo}`
* **Método:** `PUT`
* **Headers:** `Authorization: Bearer {token}`
* **Parámetro en URL:** `resCodigo` (UUID de la reseña).
* **Body (JSON):**
```json
{
  "valoracion": 4,
  "texto": "Muy buena atención, pero la cita empezó tarde."
}
```
* **Respuestas:** `200 OK` (Éxito), `400 Bad Request` (Errores de validación), `403 Forbidden` (El usuario no es el autor o la reseña no existe).

#### 4. ELIMINAR RESEÑA

* **Endpoint:** `/api/Expedientes/{resCodigo}`
* **Método:** `DELETE`
* **Headers:** `Authorization: Bearer {token}`
* **Parámetro en URL:** `resCodigo` (UUID de la reseña).
* **Respuestas:** `200 OK` (Éxito), `403 Forbidden` (El usuario no es el autor o la reseña no existe).
