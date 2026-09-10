import { notFound } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";

// Development-only preview with example data, so the signed-in surface can be
// designed and screenshotted without a GitHub login. Never served in production.
export default function DashboardPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <DashboardView
      d={{
        login: "egeoztass",
        repos: [
          { id: "1", full_name: "egeoztass/mq-smoke", mine: true, isPrivate: false },
          { id: "2", full_name: "bluewave-labs/Checkmate", mine: true, isPrivate: false },
          { id: "3", full_name: "egeoztass/private-notes", mine: true, isPrivate: true },
        ],
        tasks: [
          { id: "a", title: "greet should trim surrounding whitespace", status: "merged", github_issue_number: 1, repo: "egeoztass/mq-smoke" },
          { id: "b", title: "createMonitor never returns the created document", status: "open", github_issue_number: 3917, repo: "bluewave-labs/Checkmate" },
          { id: "c", title: "Apprise notification channel", status: "claimed", github_issue_number: 3272, repo: "bluewave-labs/Checkmate" },
        ],
        claims: [{ status: "submitted", task: { id: "a", title: "greet should trim surrounding whitespace" } }],
        tokens: [{ id: "t1", label: "default", created_at: "2026-09-07T12:00:00Z", last_used_at: "2026-09-08T14:30:00Z" }],
        mergedCount: 1,
        installUrl: "#",
        siteUrl: "http://localhost:3000",
      }}
    />
  );
}
