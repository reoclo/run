import * as core from "@actions/core";
import { ReocloClient } from "./client.js";
import type { ExecRequest, RunContext } from "./types.js";

function parseEnvInput(envInput: string): Record<string, string> | undefined {
  if (!envInput.trim()) return undefined;
  const result: Record<string, string> = {};
  for (const line of envInput.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key) result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function buildRunContext(): RunContext {
  return {
    provider: "github_actions",
    repository: process.env["GITHUB_REPOSITORY"] ?? "",
    workflow: process.env["GITHUB_WORKFLOW"] ?? "",
    trigger: process.env["GITHUB_EVENT_NAME"] ?? "",
    actor: process.env["GITHUB_ACTOR"] ?? "",
    sha: process.env["GITHUB_SHA"],
    ref: process.env["GITHUB_REF"],
  };
}

async function run(): Promise<void> {
  try {
    const apiKey = core.getInput("api_key", { required: true });
    const serverId = core.getInput("server_id", { required: true });
    const command = core.getInput("command", { required: true });
    const workingDirectory = core.getInput("working_directory") || undefined;
    const envInput = core.getInput("env") || "";
    const timeout = parseInt(core.getInput("timeout") || "60", 10);
    const apiUrl = core.getInput("api_url") || "https://api.reoclo.com";

    const client = new ReocloClient(apiKey, apiUrl);

    const request: ExecRequest = {
      server_id: serverId,
      command,
      working_directory: workingDirectory,
      env: parseEnvInput(envInput),
      timeout_seconds: Math.min(Math.max(timeout, 1), 900),
      run_id: process.env["GITHUB_RUN_ID"],
      run_context: buildRunContext(),
    };

    core.info(`Executing command on server ${serverId}...`);
    const response = await client.execCommand(request);

    core.setOutput("operation_id", response.operation_id);

    if (response.status === "completed" || response.status === "failed" || response.status === "timeout") {
      core.setOutput("exit_code", String(response.exit_code ?? 1));
      core.setOutput("stdout", response.stdout ?? "");
      core.setOutput("stderr", response.stderr ?? "");
      core.setOutput("duration_ms", String(response.duration_ms ?? 0));

      if (response.stdout) core.info(response.stdout);
      if (response.stderr) core.warning(response.stderr);

      if (response.exit_code !== 0) {
        core.setFailed(`Command exited with code ${response.exit_code}`);
      }
      return;
    }

    // Async path: poll until complete
    core.info(`Operation ${response.operation_id} is running, polling for completion...`);

    const detail = await client.pollUntilComplete(response.operation_id, (update) => {
      core.info(`Operation status: ${update.status}`);
    });

    const result = detail.result ?? {};
    const exitCode = result.exit_code ?? 1;

    core.setOutput("exit_code", String(exitCode));
    core.setOutput("stdout", result.stdout ?? "");
    core.setOutput("stderr", result.stderr ?? "");
    core.setOutput("duration_ms", String(result.duration_ms ?? 0));

    if (result.stdout) core.info(result.stdout);
    if (result.stderr) core.warning(result.stderr);

    if (exitCode !== 0) {
      core.setFailed(`Command exited with code ${exitCode}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${message}`);
  }
}

run();
