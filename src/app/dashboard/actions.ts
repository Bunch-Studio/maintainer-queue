"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getInstallationOctokit } from "@/lib/github/app";
import { mintAgentToken } from "@/lib/tokens";

const requireOperator = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in first");
  const db = createServiceRoleClient();
  const { data: operator } = await db.from("operators").select("id, login").eq("id", user.id).single();
  if (!operator) throw new Error("Operator missing");
  return operator;
};

// Only accounts with write permission on the installed repo can turn an issue into a task.
export const createTask = async (formData: FormData) => {
  const operator = await requireOperator();
  const repoId = String(formData.get("repo_id"));
  const issueNumber = Number(formData.get("issue_number"));
  const spec = String(formData.get("spec") ?? "").trim();
  const filesInScope = String(formData.get("files_in_scope") ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const maxDiffLines = Number(formData.get("max_diff_lines") ?? 200);
  const requiresScreenshot = formData.get("requires_screenshot") === "on";
  if (!spec || !issueNumber) return { error: "Issue number and spec are required." };

  const db = createServiceRoleClient();
  const { data: repo } = await db.from("repos").select("id, installation_id, owner, name, is_private").eq("id", repoId).single();
  if (!repo) return { error: "Repository not connected." };
  if (repo.is_private) return { error: "Private repositories are not supported. The board is public." };

  const octokit = await getInstallationOctokit(repo.installation_id);
  const { data: perm } = await octokit.request("GET /repos/{owner}/{repo}/collaborators/{username}/permission", {
    owner: repo.owner,
    repo: repo.name,
    username: operator.login,
  });
  if (!["admin", "maintain", "write"].includes(perm.permission)) {
    return { error: "You need write access on this repository to post tasks." };
  }

  const { data: issue } = await octokit.request("GET /repos/{owner}/{repo}/issues/{issue_number}", {
    owner: repo.owner,
    repo: repo.name,
    issue_number: issueNumber,
  });

  const { error } = await db.from("tasks").insert({
    repo_id: repo.id,
    github_issue_number: issue.number,
    github_issue_id: issue.id,
    title: issue.title,
    spec,
    files_in_scope: filesInScope,
    max_diff_lines: Math.min(Math.max(maxDiffLines, 10), 2000),
    requires_screenshot: requiresScreenshot,
    created_by: operator.id,
  });
  if (error) return { error: error.code === "23505" ? "That issue already has a task." : error.message };
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { ok: true };
};

export const createAgentToken = async () => {
  const operator = await requireOperator();
  const token = await mintAgentToken(operator.id);
  revalidatePath("/dashboard");
  return { token };
};

export const revokeAgentToken = async (tokenId: string) => {
  const operator = await requireOperator();
  const db = createServiceRoleClient();
  await db
    .from("agent_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", tokenId)
    .eq("operator_id", operator.id)
    .is("revoked_at", null);
  revalidatePath("/dashboard");
  return { ok: true };
};

// The task's author, or anyone with write access on its repo, can take it off the board or put it back.
export const setTaskStatus = async (taskId: string, status: "open" | "closed") => {
  const operator = await requireOperator();
  const db = createServiceRoleClient();
  const { data: task } = await db
    .from("tasks")
    .select("id, status, created_by, repos ( installation_id, owner, name )")
    .eq("id", taskId)
    .maybeSingle();
  const repo = task ? (Array.isArray(task.repos) ? task.repos[0] : task.repos) : null;
  if (!task || !repo) return { error: "Task not found." };

  if (task.created_by !== operator.id) {
    const octokit = await getInstallationOctokit(repo.installation_id);
    const { data: perm } = await octokit.request("GET /repos/{owner}/{repo}/collaborators/{username}/permission", {
      owner: repo.owner,
      repo: repo.name,
      username: operator.login,
    });
    if (!["admin", "maintain", "write"].includes(perm.permission)) return { error: "You need write access on this repository." };
  }

  const allowed = status === "closed" ? ["open", "claimed", "submitted"] : ["closed"];
  if (!allowed.includes(task.status)) return { error: `Task is ${task.status}.` };

  await db.from("tasks").update({ status }).eq("id", taskId);
  if (status === "closed") {
    await db
      .from("claims")
      .update({ status: "released", released_at: new Date().toISOString() })
      .eq("task_id", taskId)
      .in("status", ["active", "submitted"]);
  }
  revalidatePath("/dashboard");
  revalidatePath("/board");
  revalidatePath(`/tasks/${taskId}`);
  return { ok: true };
};

// Removes the auth user; operators, tokens, claims and submissions cascade. Tasks keep their spec with no author.
export const deleteAccount = async () => {
  const operator = await requireOperator();
  const db = createServiceRoleClient();
  const { error } = await db.auth.admin.deleteUser(operator.id);
  if (error) throw new Error(error.message);
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
};
