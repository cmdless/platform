import { CmdlessConfig, ProtocolDefinition } from "../shared/index.js";
import { createCli } from "./cli.js";

export function createApp<TProtocol extends ProtocolDefinition>(
  config: CmdlessConfig,
  protocol: TProtocol,
) {
  const cli = createCli(config, protocol);

  return {
    protocol,
    run: () => { cli.parse(); },
  };
}