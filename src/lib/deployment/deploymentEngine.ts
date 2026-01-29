/**
 * Deployment Engine
 * Handles the full deployment lifecycle for deploying agents to client n8n instances
 */

import { N8nClient, N8nCredential, N8nWorkflow, createN8nClient } from '../n8n/n8nClient';

export interface DeploymentConfig {
    clientId: string;
    agentId: string;
    n8nUrl: string;
    n8nApiKey: string;
    credentials: CredentialInput[];
    templateJSON: any;
    workflowName: string;
}

export interface CredentialInput {
    type: string;           // e.g., "openAiApi", "googleSheetsOAuth2Api"
    name: string;           // Display name for the credential in n8n
    data: Record<string, any>;  // Credential data (API keys, tokens, etc.)
}

export interface DeploymentProgress {
    stage: 'initializing' | 'creating_credentials' | 'generating_workflow' | 'deploying' | 'activating' | 'completed' | 'failed' | 'rolling_back';
    progress: number;       // 0-100
    message: string;
    details?: string;
}

export interface DeploymentResult {
    success: boolean;
    workflowId?: string;
    workflowUrl?: string;
    credentialIds?: string[];
    error?: string;
    errorDetails?: any;
}

type ProgressCallback = (progress: DeploymentProgress) => void;

/**
 * Deployment Engine class
 * Orchestrates the deployment of agents to client n8n instances
 */
export class DeploymentEngine {
    private client: N8nClient;
    private config: DeploymentConfig;
    private progressCallback?: ProgressCallback;
    private createdCredentialIds: string[] = [];
    private createdWorkflowId?: string;

    constructor(config: DeploymentConfig, onProgress?: ProgressCallback) {
        this.config = config;
        this.progressCallback = onProgress;
        this.client = createN8nClient({
            baseUrl: config.n8nUrl,
            apiKey: config.n8nApiKey,
        });
    }

    /**
     * Execute the full deployment process
     */
    async deploy(): Promise<DeploymentResult> {
        try {
            // Stage 1: Test connection
            this.updateProgress({
                stage: 'initializing',
                progress: 5,
                message: 'Testing connection to n8n instance...',
            });

            const connectionTest = await this.client.testConnection();
            if (!connectionTest.success) {
                throw new Error(`Failed to connect to n8n: ${connectionTest.message}`);
            }

            this.updateProgress({
                stage: 'initializing',
                progress: 10,
                message: 'Connection successful. Preparing deployment...',
            });

            // Stage 2: Create credentials
            this.updateProgress({
                stage: 'creating_credentials',
                progress: 15,
                message: 'Creating credentials in n8n...',
            });

            const credentialMap = await this.createCredentials();

            this.updateProgress({
                stage: 'creating_credentials',
                progress: 40,
                message: `Created ${this.createdCredentialIds.length} credentials successfully.`,
            });

            // Stage 3: Generate workflow with credential references
            this.updateProgress({
                stage: 'generating_workflow',
                progress: 50,
                message: 'Generating workflow with credential bindings...',
            });

            const workflow = this.generateWorkflow(credentialMap);

            this.updateProgress({
                stage: 'generating_workflow',
                progress: 60,
                message: 'Workflow generated successfully.',
            });

            // Stage 4: Deploy workflow
            this.updateProgress({
                stage: 'deploying',
                progress: 70,
                message: 'Deploying workflow to n8n...',
            });

            const createdWorkflow = await this.client.createWorkflow(workflow);
            this.createdWorkflowId = createdWorkflow.id;

            this.updateProgress({
                stage: 'deploying',
                progress: 85,
                message: 'Workflow deployed successfully.',
            });

            // Stage 5: Activate workflow
            this.updateProgress({
                stage: 'activating',
                progress: 90,
                message: 'Activating workflow...',
            });

            if (createdWorkflow.id) {
                await this.client.activateWorkflow(createdWorkflow.id);
            }

            // Complete!
            this.updateProgress({
                stage: 'completed',
                progress: 100,
                message: 'Deployment completed successfully!',
            });

            return {
                success: true,
                workflowId: createdWorkflow.id,
                workflowUrl: `${this.config.n8nUrl}/workflow/${createdWorkflow.id}`,
                credentialIds: this.createdCredentialIds,
            };

        } catch (error: any) {
            // Rollback on failure
            this.updateProgress({
                stage: 'rolling_back',
                progress: 0,
                message: 'Deployment failed. Rolling back changes...',
                details: error.message,
            });

            await this.rollback();

            this.updateProgress({
                stage: 'failed',
                progress: 0,
                message: 'Deployment failed.',
                details: error.message,
            });

            return {
                success: false,
                error: error.message,
                errorDetails: error.toString(),
            };
        }
    }

    /**
     * Create all required credentials in n8n
     * Returns a map of credential type -> n8n credential ID
     */
    private async createCredentials(): Promise<Map<string, string>> {
        const credentialMap = new Map<string, string>();
        const totalCredentials = this.config.credentials.length;

        for (let i = 0; i < this.config.credentials.length; i++) {
            const cred = this.config.credentials[i];

            this.updateProgress({
                stage: 'creating_credentials',
                progress: 15 + Math.floor((i / totalCredentials) * 25),
                message: `Creating credential: ${cred.name}...`,
            });

            const n8nCredential: N8nCredential = {
                name: cred.name,
                type: cred.type,
                data: cred.data,
            };

            const created = await this.client.createCredential(n8nCredential);

            if (created.id) {
                this.createdCredentialIds.push(created.id);
                credentialMap.set(cred.type, created.id);
            }
        }

        return credentialMap;
    }

    /**
     * Generate the workflow with credential references replaced
     */
    private generateWorkflow(credentialMap: Map<string, string>): Omit<N8nWorkflow, 'id'> {
        // Deep clone the template
        const workflow = JSON.parse(JSON.stringify(this.config.templateJSON));

        // Update workflow name
        workflow.name = this.config.workflowName;

        // Set workflow to inactive initially (we'll activate after creation)
        workflow.active = false;

        // Remove ID to force n8n to generate a new one
        if (workflow.id) {
            delete workflow.id;
        }

        // Replace credential references in nodes
        if (workflow.nodes && Array.isArray(workflow.nodes)) {
            workflow.nodes = workflow.nodes.map((node: any) => {
                if (node.credentials) {
                    const updatedCredentials: Record<string, any> = {};

                    for (const [credType, credConfig] of Object.entries(node.credentials as Record<string, any>)) {
                        const n8nCredentialId = credentialMap.get(credType);

                        if (n8nCredentialId) {
                            updatedCredentials[credType] = {
                                id: n8nCredentialId,
                                name: credConfig.name || credType,
                            };
                        } else {
                            // Keep original if no mapping found
                            updatedCredentials[credType] = credConfig;
                        }
                    }

                    node.credentials = updatedCredentials;
                }

                return node;
            });
        }

        return workflow;
    }

    /**
     * Rollback all created resources on failure
     */
    async rollback(): Promise<void> {
        const errors: string[] = [];

        // Delete created workflow
        if (this.createdWorkflowId) {
            try {
                await this.client.deleteWorkflow(this.createdWorkflowId);
            } catch (error: any) {
                errors.push(`Failed to delete workflow: ${error.message}`);
            }
        }

        // Delete created credentials
        for (const credId of this.createdCredentialIds) {
            try {
                await this.client.deleteCredential(credId);
            } catch (error: any) {
                errors.push(`Failed to delete credential ${credId}: ${error.message}`);
            }
        }

        if (errors.length > 0) {
            console.error('Rollback errors:', errors);
        }
    }

    /**
     * Update progress and notify callback
     */
    private updateProgress(progress: DeploymentProgress): void {
        if (this.progressCallback) {
            this.progressCallback(progress);
        }
    }
}

/**
 * Create and execute a deployment
 */
export async function deployAgent(
    config: DeploymentConfig,
    onProgress?: ProgressCallback
): Promise<DeploymentResult> {
    const engine = new DeploymentEngine(config, onProgress);
    return engine.deploy();
}

/**
 * Test connection to an n8n instance
 */
export async function testN8nConnection(
    url: string,
    apiKey: string
): Promise<{ success: boolean; message: string }> {
    const client = createN8nClient({ baseUrl: url, apiKey });
    return client.testConnection();
}
