import { HttpClient } from "@actions/http-client";
import type { ExecRequest, ExecResponse, OperationDetail } from "./types.js";

const POLL_INTERVAL_MS = 5_000;

export class ReocloClient {
  private http: HttpClient;
  private baseUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    this.baseUrl = apiUrl.replace(/\/+$/, "");
    this.http = new HttpClient("reoclo-github-action", [], {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  async execCommand(request: ExecRequest): Promise<ExecResponse> {
    const url = `${this.baseUrl}/api/automation/v1/exec`;
    const response = await this.http.postJson<ExecResponse>(url, request);
    if (response.statusCode !== 200) {
      throw new Error(
        `Reoclo API returned ${response.statusCode}: ${JSON.stringify(response.result)}`,
      );
    }
    if (!response.result) {
      throw new Error("Reoclo API returned empty response");
    }
    return response.result;
  }

  async getOperation(operationId: string): Promise<OperationDetail> {
    const url = `${this.baseUrl}/api/automation/v1/operations/${operationId}`;
    const response = await this.http.getJson<OperationDetail>(url);
    if (response.statusCode !== 200) {
      throw new Error(
        `Reoclo API returned ${response.statusCode}: ${JSON.stringify(response.result)}`,
      );
    }
    if (!response.result) {
      throw new Error("Reoclo API returned empty response");
    }
    return response.result;
  }

  async pollUntilComplete(
    operationId: string,
    onUpdate?: (detail: OperationDetail) => void,
  ): Promise<OperationDetail> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      const detail = await this.getOperation(operationId);
      if (onUpdate) {
        onUpdate(detail);
      }
      if (detail.status !== "running") {
        return detail;
      }
    }
  }
}
