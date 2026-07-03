import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { cmdless } from "@cmdless/sdk/renderer";
import { gh } from "../shared/client.js";

type AppPhase = "idle" | "checking" | "ready" | "error";
type CliPhase = "checking" | "ready" | "missing";

type AppState = {
  githubUsername: string;
  githubOrg: string;
  isAuthed: boolean;
  viewerLogin: string | null;
  verifiedUsername: string | null;
  verifiedOrg: string | null;
  orgRole: string | null;
  orgState: string | null;
  cliPhase: CliPhase;
  phase: AppPhase;
  error: string | null;
  actions: {
    initialize: () => Promise<void>;
    setGitHubUsername: (value: string) => void;
    setGitHubOrg: (value: string) => void;
    updateContext: () => Promise<void>;
  };
};

const useAppStoreBase = create<AppState>((set, get) => ({
  githubUsername: "",
  githubOrg: "",
  isAuthed: false,
  viewerLogin: null,
  verifiedUsername: null,
  verifiedOrg: null,
  orgRole: null,
  orgState: null,
  cliPhase: "checking",
  phase: "idle",
  error: null,
  actions: {
    initialize: async () => {
      set({ cliPhase: "checking" });
      const hasCli = await cmdless.delay(gh.hasCli());

      if (!hasCli) {
        set({
          cliPhase: "missing",
          error: "GitHub CLI was not found on this machine.",
        });
        return;
      }

      const isAuthed = await gh.isAuthed();

      set({
        cliPhase: "ready",
        isAuthed,
        error: null,
      });
    },
    setGitHubUsername: (value) => {
      set({ githubUsername: value });
    },
    setGitHubOrg: (value) => {
      set({ githubOrg: value });
    },
    updateContext: async () => {
      if (get().cliPhase !== "ready") {
        set({
          phase: "error",
          error: "GitHub CLI must be installed before this app can continue.",
        });
        return;
      }

      set({ phase: "checking", error: null });
      const isAuthed = await gh.isAuthed();

      if (!isAuthed) {
        set({
          isAuthed: false,
          phase: "error",
          error: "GitHub CLI is not authenticated. Run `gh auth login` to resolve account and org context.",
        });
        return;
      }

      const viewer = await gh.getViewer();

      if (!viewer) {
        set({
          isAuthed,
          phase: "error",
          error: "Unable to resolve the authenticated GitHub account.",
        });
        return;
      }

      const usernameInput = get().githubUsername.trim();
      const orgInput = get().githubOrg.trim();
      const user = usernameInput ? await gh.getUser(usernameInput) : viewer;

      if (!user) {
        set({
          isAuthed,
          phase: "error",
          error: `GitHub user "${usernameInput}" could not be resolved.`,
        });
        return;
      }

      if (!orgInput) {
        set({
          isAuthed,
          viewerLogin: viewer.login,
          verifiedUsername: user.login,
          verifiedOrg: null,
          orgRole: null,
          orgState: null,
          githubUsername: user.login,
          phase: "ready",
          error: null,
        });
        return;
      }

      const membership = await gh.getOrgMembership(orgInput);

      if (!membership) {
        set({
          isAuthed,
          phase: "error",
          error:
            `Unable to access the "${orgInput}" organization. ` +
            "If this org uses SSO, make sure the current GitHub auth is authorized for it.",
        });
        return;
      }

      set({
        isAuthed,
        viewerLogin: viewer.login,
        verifiedUsername: user.login,
        verifiedOrg: membership.organization?.login ?? orgInput,
        orgRole: membership.role ?? null,
        orgState: membership.state ?? null,
        githubUsername: user.login,
        githubOrg: membership.organization?.login ?? orgInput,
        phase: "ready",
        error: null,
      });
    },
  },
}));

export function useAppState<T>(selector: (state: AppState) => T) {
  return useAppStoreBase(useShallow(selector));
}
