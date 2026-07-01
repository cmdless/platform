/// <reference lib="dom" />

import type { Cmdless } from './shared/cmdless.js'

declare global {
  export type MaybePromise<T> = T | Promise<T>;

  interface Window {
    /** Exposed by the Cmdless sdk preload when running inside a renderer. */
    cmdless: Cmdless;
  }
}

export { };
