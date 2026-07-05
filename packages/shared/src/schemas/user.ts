import { z } from 'zod';
import { ROLES } from '../enums';

export const userSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z.string().min(6, 'Senha mínima de 6 caracteres').optional(),
  ),
  roleId: z.string().uuid(),
  active: z.boolean().default(true),
});

export type UserInput = z.infer<typeof userSchema>;

export const userPermissionSchema = z.object({
  permission: z.string(),
  granted: z.boolean(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6, 'Nova senha mínima de 6 caracteres'),
});

export const roleNameSchema = z.enum(ROLES);
