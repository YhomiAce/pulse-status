import { z } from 'zod';

/**
 * Build-time configuration. Vite inlines `VITE_*` variables into the bundle
 * when it builds, so changing them later means rebuilding.
 */
export const envSchema = z.object({
  VITE_API_URL: z
    .url({ protocol: /^https?$/, message: 'VITE_API_URL must be an http(s) URL, e.g. http://localhost:5104' })
    .transform((value) => value.replace(/\/+$/, '')),
  VITE_STATUS_TITLE: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

/** Parsed build-time configuration. */
export type AppEnv = z.infer<typeof envSchema>;

/**
 * Validates raw `VITE_*` variables.
 *
 * @throws Error listing every invalid or missing variable.
 */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  return result.data;
}
