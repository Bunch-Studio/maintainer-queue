import "server-only";
import { App } from "@octokit/app";

let app: App | null = null;

// One App instance per server process. Installation tokens are minted per call.
export const getGitHubApp = () => {
  if (!app) {
    app = new App({
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      webhooks: { secret: process.env.GITHUB_APP_WEBHOOK_SECRET! },
    });
  }
  return app;
};

export const getInstallationOctokit = (installationId: number) =>
  getGitHubApp().getInstallationOctokit(installationId);

export const appInstallUrl = () =>
  `https://github.com/apps/${process.env.GITHUB_APP_SLUG}/installations/new`;
