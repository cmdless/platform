import { createApp } from '@cmdless/sdk/main';
import { config } from '../shared/config.js';

export const app = createApp(config, {});

export type Protocol = typeof app.protocol;