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

// ---------------------------------------------------------------------------
// Library (Milestone 2)
// ---------------------------------------------------------------------------
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v.length ? v : null));

export const noteSchema = optionalText(5000, 'Keep notes under 5,000 characters.');

/** "Add manually": a product that isn't in the catalogue, private to this person. */
export const personalProductSchema = z.object({
  brand: z.string().trim().min(1, 'Enter the brand.').max(120, 'Keep the brand under 120 characters.'),
  name: z.string().trim().min(1, 'Enter the product name.').max(200, 'Keep the name under 200 characters.'),
  variantLabel: optionalText(120, 'Keep the shade or size under 120 characters.'),
  category: z.enum(['makeup', 'skincare', 'fragrance', 'haircare', 'body', 'tools', 'other'], 'Choose a category.'),
  status: z.enum(['owned', 'wishlist', 'finished']),
  notes: noteSchema,
});
export type PersonalProductForm = z.input<typeof personalProductSchema>;
export type PersonalProductInput = z.output<typeof personalProductSchema>;

const isRealDate = (v: string) => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

/** Finished date as typed: blank, or a real calendar date written YYYY-MM-DD. */
export const finishedDateSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d{4}-\d{2}-\d{2}$/.test(v) && isRealDate(v)), 'Use a date like 2026-10-28.')
  .transform((v) => (v.length ? v : null));

export const collectionNameSchema = z
  .string()
  .trim()
  .min(1, 'Give your collection a name.')
  .max(80, 'Keep the name under 80 characters.');
