import { z } from 'zod';

export const loginSchema = z.object({
  correo: z.string().min(1, 'El correo es obligatorio').email('El correo no es válido'),
  password: z.string().min(1, 'La contraseña es obligatoria').min(6, 'La contraseña debe tener al menos 6 caracteres'),
});
export const registerSchema = z.object({
  primerNombre: z.string().min(1, 'El nombre es obligatorio'),
  primerApellido: z.string().min(1, 'El apellido es obligatorio'),
  correo: z.string().min(1, 'El correo es obligatorio').email('El correo no es válido'),
  password: z.string().min(1, 'La contraseña es obligatoria').min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string().min(1, 'Debes confirmar la contraseña'),
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
