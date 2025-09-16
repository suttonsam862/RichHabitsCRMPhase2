import { z } from "zod";

/**
 * User DTO schemas for user management API
 */

export const UserDTO = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string().min(1),
  phone: z.string().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  lastLogin: z.string().nullable().optional(),
  preferences: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateUserDTO = UserDTO.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
  isActive: true,
}).extend({
  fullName: z.string().min(1, "Full name is required"),
  role: z.enum(['admin', 'staff', 'contact', 'customer']).optional().default('customer'),
});

export const UpdateUserDTO = CreateUserDTO.partial();

// TypeScript types
export type UserType = z.infer<typeof UserDTO>;
export type CreateUserType = z.infer<typeof CreateUserDTO>;
export type UpdateUserType = z.infer<typeof UpdateUserDTO>;