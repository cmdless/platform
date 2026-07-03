import {
  CmdlessConfig,
  createProtocol,
  method,
  ProtocolDefinition,
} from "../shared/index.js";
import { z } from "zod";
import { createCli } from "./cli.js";
import { createAppRuntime, type CmdlessAppRuntime } from "./runtime.js";

export function createApp<TProtocol extends ProtocolDefinition>(
  config: CmdlessConfig,
  factory: (args: {
    method: typeof method;
    runtime: CmdlessAppRuntime;
    z: typeof z;
  }) => TProtocol,
) {
  const runtime = createAppRuntime(config);
  const protocol = createProtocol(({ method, z }) => factory({ method, runtime, z }));
  const cli = createCli(config, protocol);

  return {
    protocol,
    runtime,
    run: () => { cli.parse(); },
  };
}
