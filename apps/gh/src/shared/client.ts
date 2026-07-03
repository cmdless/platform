import { cmdless } from "@cmdless/sdk/renderer";
import { Octokit } from "octokit";
import { config } from "./config.js";

export const client = await cmdless.createRenderer<Protocol>(config);

type SpawnResult = {
  stdout: Uint8Array;
  stderr: Uint8Array;
  exit: number;
};

type Viewer = {
  login: string;
};

type User = {
  login: string;
};

type OrgMembership = {
  organization?: {
    login?: string;
  };
  state?: string;
  role?: string;
};

function mapGhExitToStatus(exit: number) {
  switch (exit) {
    case 0:
      return 200;
    case 1:
      return 400;
    case 2:
      return 499;
    case 4:
      return 401;
    default:
      return 500;
  }
}

class GhClient {
  readonly octokit: Octokit;

  private authStatusPromise: Promise<SpawnResult | null> | undefined;
  private systemInfoPromise = cmdless.systemInfo();

  constructor() {
    this.octokit = new Octokit({
      request: {
        fetch: this.fetch,
      },
    });
  }

  private async spawn(command: string, args: string[], stdin?: Uint8Array) {
    return await cmdless.invoke("process/spawn", {
      command,
      args,
      stdin,
    });
  }

  private async spawnGh(args: string[], stdin?: Uint8Array) {
    return await this.spawn("gh", args, stdin);
  }

  async systemInfo() {
    return await this.systemInfoPromise;
  }

  async hasCli() {
    const systemInfo = await this.systemInfo();
    const lookup = await this.spawn(
      systemInfo.platform === "win32" ? "where.exe" : "which",
      ["gh"],
    );

    return lookup.exit === 0;
  }

  private createResponse(result: SpawnResult) {
    const status = mapGhExitToStatus(result.exit);
    const body =
      result.exit === 0 || result.stderr.length === 0
        ? Uint8Array.from(result.stdout)
        : Uint8Array.from(result.stderr);

    return new Response(new Blob([body]), {
      status,
    });
  }

  async ensureAuth() {
    this.authStatusPromise ??= (async () => {
      const statusResult = await this.spawnGh(["auth", "status", "--hostname", "github.com"]);

      if (statusResult.exit === 0) {
        return null;
      }

      const loginResult = await this.spawnGh([
        "auth",
        "login",
        "--hostname",
        "github.com",
        "--web",
        "--git-protocol",
        "https",
        "--skip-ssh-key",
      ]);

      return loginResult.exit === 0 ? null : loginResult;
    })();

    const authResult = await this.authStatusPromise;

    if (authResult) {
      this.authStatusPromise = undefined;
      return this.createResponse({
        ...authResult,
        exit: 4,
      });
    }

    return null;
  }

  async isAuthed() {
    const result = await this.spawnGh(["auth", "status", "--hostname", "github.com"]);
    return result.exit === 0;
  }

  async request(path: string, init?: RequestInit) {
    return await this.fetch(new URL(path, "https://api.github.com"), init);
  }

  private async parseJson<T>(response: Response) {
    if (!response.ok) {
      return null;
    }

    return await response.json() as T;
  }

  async getViewer() {
    return await this.parseJson<Viewer>(await this.request("/user"));
  }

  async getUser(username: string) {
    return await this.parseJson<User>(await this.request(`/users/${username}`));
  }

  async getOrgMembership(org: string) {
    return await this.parseJson<OrgMembership>(
      await this.request(`/user/memberships/orgs/${org}`),
    );
  }

  fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const authFailure = await this.ensureAuth();

    if (authFailure) {
      return authFailure;
    }

    const request = new Request(input, init);
    const url = new URL(request.url);
    const path = `${url.pathname}${url.search}`;
    const args = ["api", "--method", request.method, path];
    const stdin = request.body === null ? undefined : new Uint8Array(await request.arrayBuffer());

    request.headers.forEach((value, key) => {
      args.push("-H", `${key}: ${value}`);
    });

    if (stdin?.length) {
      args.push("--input", "-");
    }

    const result = await this.spawnGh(args, stdin);
    return this.createResponse(result);
  };
}

export const gh = new GhClient();

export const octokit = gh.octokit;

export type { Protocol };
