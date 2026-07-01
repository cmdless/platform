import { z } from "zod";

export type InferSchema<TSchema> =
  TSchema extends z.ZodType ? z.infer<TSchema> : void;

export type ProtocolMethod<
  TInputSchema extends z.ZodType | undefined = z.ZodType | undefined,
  TOutputSchema extends z.ZodType | undefined = z.ZodType | undefined
> = {
  input?: TInputSchema;
  output?: TOutputSchema;
  handler: (
    ...args: TInputSchema extends z.ZodType
      ? [params: z.infer<TInputSchema>]
      : []
  ) => MaybePromise<InferSchema<TOutputSchema>>;
};

export function method<
  TInputSchema extends z.ZodType | undefined = undefined,
  TOutputSchema extends z.ZodType | undefined = undefined
>(
  description: ProtocolMethod<TInputSchema, TOutputSchema>
): ProtocolMethod<TInputSchema, TOutputSchema> {
  return description;
}

export type ProtocolDefinition = Record<string, ProtocolMethod>;

export function createProtocol<TProtocol extends ProtocolDefinition>(
  factory: (args: { method: typeof method, z: typeof z; }) => TProtocol
): TProtocol {
  return factory({ method, z });
}

export type InputOf<TMethod> =
  TMethod extends ProtocolMethod<infer TInput, any>
  ? InferSchema<TInput>
  : never;

export type OutputOf<TMethod> =
  TMethod extends ProtocolMethod<any, infer TOutput>
  ? InferSchema<TOutput>
  : never;

export type CmdlessConfig = {
  name: string;
  main: string;
  mainDev: string;
  renderer: string;
  root: string;
  url: string;
};

export function createConfig(config: CmdlessConfig) { return config; }

export type ProtocolClient<TProtocol extends ProtocolDefinition> = {
  config: CmdlessConfig;
  send<K extends keyof TProtocol & string>(
    method: K,
    ...args: InputOf<TProtocol[K]> extends void
      ? []
      : [params: InputOf<TProtocol[K]>]
  ): Promise<OutputOf<TProtocol[K]>>;
};

export function createClient<TProtocol extends ProtocolDefinition>(
  config: CmdlessConfig,
  send: <K extends keyof TProtocol & string>(
    method: K,
    ...args: InputOf<TProtocol[K]> extends void
      ? []
      : [params: InputOf<TProtocol[K]>]
  ) => Promise<OutputOf<TProtocol[K]>>
): ProtocolClient<TProtocol> {
  return {
    config,
    send(method, ...args) {
      return send(method, ...args);
    }
  };
}