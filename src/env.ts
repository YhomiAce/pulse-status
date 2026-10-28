import { parseEnv } from './env-schema';

/** Validated build-time configuration for the running app. */
export const env = parseEnv(import.meta.env);

/** Brand name shown in the header and the page title. */
export const brandName = env.VITE_STATUS_TITLE ?? 'Status';
