import type { ExecRequest, ExecResponse, OperationDetail } from "./types.js";
export declare class ReocloClient {
    private http;
    private baseUrl;
    constructor(apiKey: string, apiUrl: string);
    execCommand(request: ExecRequest): Promise<ExecResponse>;
    getOperation(operationId: string): Promise<OperationDetail>;
    pollUntilComplete(operationId: string, onUpdate?: (detail: OperationDetail) => void): Promise<OperationDetail>;
}
