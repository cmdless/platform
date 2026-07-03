import type { ChangeEvent } from "react";
import { useEffect } from "react";
import {
  AppHeader,
  AppSection,
  AppShell,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldHint,
  Input,
  Label,
} from "@cmdless/ui";
import { Api } from "./Api";
import { useAppState } from "./state";
import "./App.css";

function App() {
  const {
    githubUsername,
    githubOrg,
    isAuthed,
    viewerLogin,
    verifiedUsername,
    verifiedOrg,
    orgRole,
    orgState,
    cliPhase,
    phase,
    error,
    actions,
  } = useAppState((state) => ({
    githubUsername: state.githubUsername,
    githubOrg: state.githubOrg,
    isAuthed: state.isAuthed,
    viewerLogin: state.viewerLogin,
    verifiedUsername: state.verifiedUsername,
    verifiedOrg: state.verifiedOrg,
    orgRole: state.orgRole,
    orgState: state.orgState,
    cliPhase: state.cliPhase,
    phase: state.phase,
    error: state.error,
    actions: state.actions,
  }));

  useEffect(() => {
    void actions.initialize();
  }, [actions]);

  const badgeTone =
    phase === "ready" ? "success" : phase === "error" ? "danger" : phase === "checking" ? "warning" : "neutral";

  if (cliPhase !== "ready") {
    return (
      <AppShell className="gh-shell gh-shell--centered">
        <Card className="gh-gate">
          <CardHeader>
            <CardTitle>
              {cliPhase === "checking" ? "Checking for GitHub CLI..." : "GitHub CLI Missing"}
            </CardTitle>
            <CardDescription>
              {cliPhase === "checking"
                ? "Verifying that the local GitHub CLI is installed before the rest of the app shell renders."
                : error ?? "Install GitHub CLI to continue. In the future, this screen can offer a guided setup path."}
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell className="gh-shell">
      <AppHeader className="gh-header">
        <div className="gh-header__intro">
          <Badge tone={badgeTone}>{phase}</Badge>
          <Badge tone={isAuthed ? "success" : "warning"}>
            {isAuthed ? "authenticated" : "not authenticated"}
          </Badge>
          <div>
            <h1>GitHub Desktop Shell</h1>
            <p>Swagger UI is live now. Account and org context can still be resolved on demand from the local GitHub CLI.</p>
          </div>
        </div>

        <form
          className="gh-header__form"
          onSubmit={(event) => {
            event.preventDefault();
            void actions.updateContext();
          }}
        >
          <Field className="gh-header__field">
            <Label htmlFor="github-username">GitHub Username</Label>
            <Input
              id="github-username"
              value={githubUsername}
              placeholder="octocat"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                actions.setGitHubUsername(event.target.value)
              }
            />
          </Field>

          <Field className="gh-header__field">
            <Label htmlFor="github-org">GitHub Org</Label>
            <Input
              id="github-org"
              value={githubOrg}
              placeholder="openai"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                actions.setGitHubOrg(event.target.value)
              }
            />
          </Field>

          <Button className="gh-header__submit" disabled={phase === "checking"} type="submit">
            {phase === "checking" ? "Updating..." : "Update"}
          </Button>
        </form>
      </AppHeader>

      <AppSection className="gh-grid">
        <Card className="gh-summary">
          <CardHeader>
            <CardTitle>GitHub Context</CardTitle>
            <CardDescription>
              Auth is now informational instead of blocking. Save values here when you want to resolve the active account or org context.
            </CardDescription>
          </CardHeader>
          <CardContent className="gh-summary__content">
            <div>
              <span className="gh-summary__label">Auth</span>
              <strong>{isAuthed ? "Authenticated" : "Not authenticated"}</strong>
            </div>
            <div>
              <span className="gh-summary__label">Viewer</span>
              <strong>{viewerLogin ?? "Not resolved yet"}</strong>
            </div>
            <div>
              <span className="gh-summary__label">Selected user</span>
              <strong>{verifiedUsername ?? (githubUsername || "Waiting for update")}</strong>
            </div>
            <div>
              <span className="gh-summary__label">Selected org</span>
              <strong>{verifiedOrg ?? (githubOrg || "Optional")}</strong>
            </div>
            <div>
              <span className="gh-summary__label">Membership</span>
              <strong>{orgState ? `${orgState}${orgRole ? ` · ${orgRole}` : ""}` : "Unchecked"}</strong>
            </div>
            <Field>
              <FieldHint>
                {error ?? "Swagger UI can render before login. Use Update when you want to resolve account and organization details."}
              </FieldHint>
            </Field>
          </CardContent>
        </Card>

        <div className="gh-main">
          <Card className="gh-ready">
            <CardHeader>
              <CardTitle>GitHub API Explorer</CardTitle>
              <CardDescription>
                Swagger UI is running through the local GitHub CLI-backed transport for try-it-out requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="gh-ready__content gh-ready__content--api">
              <Api />
            </CardContent>
          </Card>
        </div>
      </AppSection>
    </AppShell>
  );
}

export default App;
