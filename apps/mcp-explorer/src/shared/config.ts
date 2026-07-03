import { createConfig } from "@cmdless/sdk/shared";
import packageJson from "../../package.json" with { type: "json" };

const packageJsonUrl = new URL("../../package.json", import.meta.url);
const packageRootUrl = new URL("./", packageJsonUrl);

export const config = createConfig({
  ...packageJson.cmdless,
  name: packageJson.name,
  sdk: packageJson.dependencies["@cmdless/sdk"],
  version: packageJson.version,
  root: packageRootUrl.href,
  url: import.meta.url,
});
