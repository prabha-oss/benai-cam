/**
 * n8n REST API Client
 * Provides methods for interacting with n8n instances via REST API
 */

export interface N8nCredential {
    id?: string;
    name: string;
    type: string;
    data: Record<string, any>;
}

export interface N8nWorkflow {
    id?: string;
    name: string;
    active: boolean;
    nodes: any[];
    connections: Record<string, any>;
    settings?: Record<string, any>;
}

export interface N8nExecution {
    id: string;
    finished: boolean;
    mode: string;
    startedAt: string;
    stoppedAt?: string;
    workflowId: string;
    status: 'success' | 'error' | 'running' | 'waiting';
}

export interface N8nConnectionConfig {
    baseUrl: string;
    apiKey: string;
}

export interface N8nError {
    message: string;
    code?: string;
    details?: any;
}

export class N8nClient {
    private baseUrl: string;
    private apiKey: string;
    private headers: HeadersInit;

    constructor(config: N8nConnectionConfig) {
        // Remove trailing slash from base URL
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.apiKey = config.apiKey;
        this.headers = {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': this.apiKey,
        };
    }

    // ================== Connection ==================

    /**
     * Test connection to n8n instance
     */
    async testConnection(): Promise<{ success: boolean; message: string; version?: string }> {
        try {
            const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
                method: 'GET',
                headers: this.headers,
            });

            if (response.ok) {
                return { success: true, message: 'Connection successful' };
            } else if (response.status === 401) {
                return { success: false, message: 'Invalid API key' };
            } else if (response.status === 403) {
                return { success: false, message: 'Access denied - check API key permissions' };
            } else {
                return { success: false, message: `Connection failed: ${response.statusText}` };
            }
        } catch (error: any) {
            if (error.code === 'ECONNREFUSED') {
                return { success: false, message: 'Unable to connect - check if n8n is running' };
            }
            return { success: false, message: `Connection error: ${error.message}` };
        }
    }

    // ================== Credentials ==================

    /**
     * Get all credentials of a specific type
     */
    async getCredentials(type?: string): Promise<N8nCredential[]> {
        const url = type
            ? `${this.baseUrl}/api/v1/credentials?type=${encodeURIComponent(type)}`
            : `${this.baseUrl}/api/v1/credentials`;

        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            throw this.handleError(response);
        }

        const data = await response.json();
        return data.data || data;
    }

    /**
     * Get a specific credential by ID
     */
    async getCredential(id: string): Promise<N8nCredential> {
        const response = await fetch(`${this.baseUrl}/api/v1/credentials/${id}`, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            throw this.handleError(response);
        }

        return response.json();
    }

    /**
     * Create a new credential
     */
    async createCredential(credential: N8nCredential): Promise<N8nCredential> {
        const response = await fetch(`${this.baseUrl}/api/v1/credentials`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(credential),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    /**
     * Update an existing credential
     */
    async updateCredential(id: string, credential: Partial<N8nCredential>): Promise<N8nCredential> {
        const response = await fetch(`${this.baseUrl}/api/v1/credentials/${id}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(credential),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    /**
     * Delete a credential
     */
    async deleteCredential(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/v1/credentials/${id}`, {
            method: 'DELETE',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }
    }

    // ================== Workflows ==================

    /**
     * Get all workflows
     */
    async getWorkflows(active?: boolean): Promise<N8nWorkflow[]> {
        let url = `${this.baseUrl}/api/v1/workflows`;
        if (active !== undefined) {
            url += `?active=${active}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        const data = await response.json();
        return data.data || data;
    }

    /**
     * Get a specific workflow by ID
     */
    async getWorkflow(id: string): Promise<N8nWorkflow> {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/${id}`, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    /**
     * Create a new workflow
     */
    async createWorkflow(workflow: Omit<N8nWorkflow, 'id'>): Promise<N8nWorkflow> {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(workflow),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    /**
     * Update an existing workflow
     */
    async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/${id}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(workflow),
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    /**
     * Delete a workflow
     */
    async deleteWorkflow(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/${id}`, {
            method: 'DELETE',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }
    }

    /**
     * Activate a workflow
     */
    async activateWorkflow(id: string): Promise<N8nWorkflow> {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/${id}/activate`, {
            method: 'POST',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    /**
     * Deactivate a workflow
     */
    async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/${id}/deactivate`, {
            method: 'POST',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    // ================== Executions ==================

    /**
     * Get workflow executions
     */
    async getExecutions(workflowId?: string, limit: number = 10): Promise<N8nExecution[]> {
        let url = `${this.baseUrl}/api/v1/executions?limit=${limit}`;
        if (workflowId) {
            url += `&workflowId=${workflowId}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        const data = await response.json();
        return data.data || data;
    }

    /**
     * Get a specific execution by ID
     */
    async getExecution(id: string): Promise<N8nExecution> {
        const response = await fetch(`${this.baseUrl}/api/v1/executions/${id}`, {
            method: 'GET',
            headers: this.headers,
        });

        if (!response.ok) {
            throw await this.handleError(response);
        }

        return response.json();
    }

    // ================== Health Check ==================

    /**
     * Check if n8n instance is healthy
     */
    async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
        const startTime = Date.now();

        try {
            const response = await fetch(`${this.baseUrl}/healthz`, {
                method: 'GET',
            });

            const latency = Date.now() - startTime;

            if (response.ok) {
                return { healthy: true, latency };
            } else {
                return { healthy: false, latency, error: `Status: ${response.status}` };
            }
        } catch (error: any) {
            return { healthy: false, error: error.message };
        }
    }

    // ================== Error Handling ==================

    private async handleError(response: Response): Promise<Error> {
        let message = `n8n API Error: ${response.status} ${response.statusText}`;

        try {
            const errorData = await response.json();
            if (errorData.message) {
                message = errorData.message;
            }
        } catch {
            // Ignore JSON parse errors
        }

        const error = new Error(message);
        (error as any).status = response.status;
        return error;
    }
}

/**
 * Create a new n8n client instance
 */
export function createN8nClient(config: N8nConnectionConfig): N8nClient {
    return new N8nClient(config);
}
