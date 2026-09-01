import { z } from 'zod';

export const loginSchema = z.object({
  correo: z.string().min(1, 'El correo es obligatorio').email('El correo no es válido'),
  password: z.string().min(1, 'La contraseña es obligatoria').min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
export const registerSchema = z.object({
  primerNombre: z.string().trim().min(1, 'El primer nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  segundoNombre: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  primerApellido: z.string().trim().min(1, 'El primer apellido es obligatorio').max(100, 'Máximo 100 caracteres'),
  segundoApellido: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  apellidoCasado: z.string().trim().max(100, 'Máximo 100 caracteres').optional(),
  fechaNacimiento: z.string().trim().min(1, 'La fecha de nacimiento es obligatoria').refine((val) => {
    const parts = val.split('-');
    if (parts.length !== 3) return false;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const birthDate = new Date(year, month, day);
    if (isNaN(birthDate.getTime())) return false;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  }, 'Debes ser mayor de 18 años para registrarte.'),
  correo: z.string().trim().min(1, 'El correo es obligatorio').email('El correo no es válido'),
  password: z.string().trim().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%&@\-_]).{8,15}$/, 'La contraseña no cumple con los requisitos'),
  confirmPassword: z.string().trim().min(1, 'Debes confirmar la contraseña'),
}).refine((values) => values.password === values.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const recoverySchema = z.object({
  correo: z.string().min(1, 'El correo es obligatorio').email('El correo no es válido'),
  nuevaPassword: z.string().min(1, 'La contraseña es obligatoria').min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export const solicitarRecuperacionSchema = z.object({
  correo: z.string().trim().min(1, 'El correo es obligatorio').email('El correo no es válido'),
});

export const restablecerPasswordSchema = z.object({
  nuevaPassword: z.string().trim().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[%&@\-_]).{8,15}$/, 'La contraseña no cumple con los requisitos'),
  confirmarPassword: z.string().trim().min(1, 'Debes confirmar la contraseña'),
}).refine((values) => values.nuevaPassword === values.confirmarPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmarPassword'],
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type RecoveryFormValues = z.infer<typeof recoverySchema>;
export type SolicitarRecuperacionFormValues = z.infer<typeof solicitarRecuperacionSchema>;
export type RestablecerPasswordFormValues = z.infer<typeof restablecerPasswordSchema>;

