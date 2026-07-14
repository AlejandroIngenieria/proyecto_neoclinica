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

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type RecoveryFormValues = z.infer<typeof recoverySchema>;
