export interface RunContext {
  provider: string;
  repository: string;
  workflow: string;
  trigger: string;
  actor: string;
  sha?: string;
  ref?: string;
}

export interface ExecRequest {
  server_id: string;
  command: string;
  working_directory?: string;
  env?: Record<string, string>;
  timeout_seconds: number;
  run_id?: string;
  run_context?: RunContext;
}

export interface ExecResponse {
  operation_id: string;
  status: "completed" | "running" | "failed" | "timeout";
  exit_code?: number;
  stdout?: string;
  stderr?: string;
  duration_ms?: number;
}

export interface OperationDetail {
  operation_id: string;
  status: "running" | "completed" | "failed" | "timeout";
  result?: {
    exit_code?: number;
    stdout?: string;
    stderr?: string;
    duration_ms?: number;
  };
  started_at: string;
  completed_at?: string;
}
