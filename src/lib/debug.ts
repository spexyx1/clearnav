/**
 * Debug logging — no-ops in production, full console.log in dev.
 * Usage: dbg('tag', value)
 * Never call console.log directly with user/auth data — always use dbg().
 */
const isDev = import.meta.env.DEV;

// eslint-disable-next-line no-console
export const dbg: (...args: unknown[]) => void = isDev
  ? console.log.bind(console)
  : () => {};
