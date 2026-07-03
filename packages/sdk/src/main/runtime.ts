import { mkdirSync } from "node:fs";
import { readFile as readFsFile, writeFile as writeFsFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import type { CmdlessConfig } from "../shared/index.js";

function freezeObject<T extends Record<string, unknown>>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function resolveAppDataPath(dataRoot: string, path: string) {
  const resolvedPath = resolve(dataRoot, path);
  const rootWithSeparator = dataRoot.endsWith(sep) ? dataRoot : `${dataRoot}${sep}`;

  if (resolvedPath !== dataRoot && !resolvedPath.startsWith(rootWithSeparator)) {
    throw new Error(`Path "${path}" resolves outside of the app data directory.`);
  }

  return resolvedPath;
}

export function createAppRuntime(config: CmdlessConfig) {
  const paths = freezeObject({
    cmdlessRoot: join(homedir(), ".cmdless"),
    appsRoot: join(homedir(), ".cmdless", "apps"),
    appRoot: join(homedir(), ".cmdless", "apps", config.name),
    data: join(homedir(), ".cmdless", "apps", config.name, config.version),
  });
  const root = paths.data;
  const ensurePath = (path: string) => {
    const resolvedPath = resolveAppDataPath(root, path);
    mkdirSync(dirname(resolvedPath), { recursive: true });
    return resolvedPath;
  };
  const writeBytesAtPath = async (path: string, bytes: Uint8Array) => {
    const filePath = ensurePath(path);
    await writeFsFile(filePath, bytes);
  };
  const writeTextAtPath = async (path: string, text: string) => {
    const filePath = ensurePath(path);
    await writeFsFile(filePath, text, "utf8");
  };

  return freezeObject({
    config: freezeObject({ ...config }),
    paths,
    resolvePath: ensurePath,
    async readBytes(path: string) {
      return await readFsFile(ensurePath(path));
    },
    async writeBytes(path: string, bytes: Uint8Array) {
      await writeBytesAtPath(path, bytes);
    },
    async readText(path: string) {
      return await readFsFile(ensurePath(path), "utf8");
    },
    async writeText(path: string, text: string) {
      await writeTextAtPath(path, text);
    },
    async readJson<T>(path: string): Promise<T> {
      return JSON.parse(await this.readText(path)) as T;
    },
    async writeJson(path: string, value: unknown) {
      await this.writeText(path, JSON.stringify(value));
    },
  });
}

export type CmdlessAppRuntime = ReturnType<typeof createAppRuntime>;
