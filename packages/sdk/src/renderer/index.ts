import type { Cmdless } from '../shared/cmdless.js';

/** The runtime facade exposed by the sdk preload. Throws if not present. */
export const cmdless: Cmdless = (() => {
  if (typeof window === 'undefined')
    throw new Error('Cmdless bridge unavailable: not running in a browser/renderer environment');
  const w = window.cmdless;
  if (!w)
    throw new Error('Cmdless bridge not installed. Are you running inside a Cmdless sdk renderer?');
  return w as Cmdless;
})();

export type { Cmdless } from '../shared/cmdless.js';
export * from '../shared/index.js';
