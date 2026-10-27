import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address.'));

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(72, 'Use 72 characters or fewer.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match.' });
export type SignUpInput = z.infer<typeof signUpSchema>;

export const displayNameSchema = z
  .string()
  .trim()
  .max(60, 'Keep it under 60 characters.')
  .transform((v) => (v.length ? v : null));
