import { cmdless } from "@cmdless/sdk/renderer";
import { config } from "./config.js";

export const template = await cmdless.createRenderer<Protocol>(config);

export type { Protocol };
