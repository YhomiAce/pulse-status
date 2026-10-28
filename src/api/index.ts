import { env } from '@/env';
import { PulseClient } from './client';

/** Shared client for the configured pulse API (`VITE_API_URL`). */
export const api = new PulseClient(env.VITE_API_URL);

export { ApiError, PulseClient } from './client';
export type * from './schemas';
