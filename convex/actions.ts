"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { performHealthCheck, HealthMonitorConfig } from "../src/lib/deployment/healthMonitor";
import { deployAgent, DeploymentConfig, testN8nConnection } from "../src/lib/deployment/deploymentEngine";
import { decryptObject } from "../src/lib/crypto/encryption";

/**
 * Error messages with actionable remediation advice
 */
const ERROR_REMEDIATION: Record<string, string> = {
    "Invalid API key": "Check your n8n API key in Settings. Generate a new API key from n8n Settings > API.",
    "Access denied": "Your API key doesn't have sufficient permissions. Ensure it has read/write access to workflows and credentials.",
    "Unable to connect": "Check if your n8n instance is running and accessible. Verify the URL is correct.",
    "ECONNREFUSED": "n8n instance is not reachable. Check if it's running and the URL is correct.",
    "rate limit": "Too many requests. Wait a moment and try again.",
    "request/body/data must be object": "Credential format error. Please check the credential values are properly formatted.",
    "Workflow validation failed": "The workflow template has errors. Contact support or check the agent configuration.",
};

/**
 * Get actionable error message with remediation advice
 */
function getActionableError(error: string): string {
    const lowerError = error.toLowerCase();
    for (const [key, advice] of Object.entries(ERROR_REMEDIATION)) {
        if (lowerError.includes(key.toLowerCase())) {
            return `${error}. ${advice}`;
        }
    }
    return error;
}

/**
 * Validate templateJSON structure before deployment
 */
function validateTemplateJSON(template: any): { valid: boolean; error?: string } {
    if (!template) {
        return { valid: false, error: "Template JSON is missing" };
    }

    if (typeof template !== 'object') {
        return { valid: false, error: "Template JSON must be an object" };
    }

    if (!Array.isArray(template.nodes)) {
        return { valid: false, error: "Template JSON must have a 'nodes' array" };
    }

    if (template.nodes.length === 0) {
        return { valid: false, error: "Template JSON must have at least one node" };
    }

    // Validate each node has required fields
    for (let i = 0; i < template.nodes.length; i++) {
        const node = template.nodes[i];
        if (!node.type) {
            return { valid: false, error: `Node at index ${i} is missing 'type' field` };
        }
    }

    if (!template.connections || typeof template.connections !== 'object') {
        return { valid: false, error: "Template JSON must have a 'connections' object" };
    }

    return { valid: true };
}

/**
 * Ensure credential data is properly structured as an object
 * IMPORTANT: We pass through the data as-is to respect the field names
 * defined in the agent's credential schema. n8n requires specific field
 * names for each credential type (e.g., accessToken, clientId, etc.)
 */
function normalizeCredentialData(data: any): Record<string, any> {
    if (data === null || data === undefined) {
        return {};
    }

    // If it's already a proper object (not array, not primitive), return as-is
    if (typeof data === 'object' && !Array.isArray(data)) {
        return data;
    }

    // If it's a string, this is likely an error in the credential schema
    // The agent schema should define proper field names that match n8n's expected fields
    // Log a warning but don't blindly wrap it - return empty to fail gracefully
    if (typeof data === 'string') {
        console.warn("[normalizeCredentialData] Received string instead of object. This suggests the credential schema may be misconfigured.", data.substring(0, 50));
        // Return empty - better to fail with clear error than corrupt data
        return {};
    }

    // For arrays or other types, return empty
    console.warn("[normalizeCredentialData] Received unexpected data type:", typeof data);
    return {};
}

// Test n8n connection
export const testConnection = action({
    args: {
        n8nUrl: v.string(),
        n8nApiKey: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            return await testN8nConnection(args.n8nUrl, args.n8nApiKey);
        } catch (error: any) {
            return {
                success: false,
                message: error.message
            };
        }
    },
});

// Perform health check for a single deployment
export const performDeploymentHealthCheck = action({
    args: {
        deploymentId: v.id("deployments"),
    },
    handler: async (ctx, args) => {
        // 1. Get deployment details
        const deployment = await ctx.runQuery(internal.deployments.getInternal, { id: args.deploymentId });
        if (!deployment) throw new Error("Deployment not found");

        // 2. Get client details for credentials
        const client = await ctx.runQuery(internal.clients.getInternal, { id: deployment.clientId });
        if (!client) throw new Error("Client not found");

        // Decrypt API key if needed
        let apiKey = "";
        let n8nUrl = "";

        // In a real app, we would fetch the ENCRYPTION_KEY from env vars
        // const encryptionKey = process.env.ENCRYPTION_KEY;

        if (deployment.deploymentType === "client_instance") {
            if (!client.n8nInstanceUrl || !client.n8nApiKey) {
                // If it's a client instance deployment, the deployment record *should* have the credentials
                // stored in it (as per create mutation). But create mutation stores them in deployment record,
                // not necessarily on the client record (depending on if we updated client).
                // Let's check deployment record first (which performDeploymentHealthCheck didn't do before properly)

                // Correction: The deployment record has n8nInstanceUrl and n8nApiKey.
                if (deployment.n8nInstanceUrl && deployment.n8nApiKey) {
                    n8nUrl = deployment.n8nInstanceUrl;
                    apiKey = deployment.n8nApiKey;
                } else {
                    throw new Error("Client n8n configuration missing");
                }
            } else {
                n8nUrl = client.n8nInstanceUrl;
                apiKey = client.n8nApiKey;
            }
        } else {
            // "your_instance" - use settings from DB
            const settings = await ctx.runQuery(api.settings.getMultiple, {
                keys: ["n8n_url", "n8n_api_key"]
            });
            n8nUrl = settings.n8n_url;
            apiKey = settings.n8n_api_key;
        }

        if (!n8nUrl || !apiKey) {
            throw new Error("n8n credentials missing");
        }

        // 3. Configure monitor
        const config: HealthMonitorConfig = {
            n8nUrl,
            n8nApiKey: apiKey,
            workflowId: deployment.workflowId,
            deploymentId: deployment._id,
            clientId: deployment.clientId,
            agentId: deployment.agentId
        };

        // 4. Perform check
        const result = await performHealthCheck(config);

        // 5. Record result
        await ctx.runMutation(internal.health.recordResult, {
            deploymentId: deployment._id,
            isHealthy: result.isHealthy,
            result: result,
            timestamp: Date.now()
        });

        return result;
    },
});

// Deploy an agent to a client
export const deployAgentAction = action({
    args: {
        deploymentId: v.id("deployments"),
    },
    handler: async (ctx, args) => {
        // 1. Get deployment
        const deployment = await ctx.runQuery(internal.deployments.getInternal, { id: args.deploymentId });
        if (!deployment) throw new Error("Deployment not found");

        // 2. Get client and agent
        const client = await ctx.runQuery(internal.clients.getInternal, { id: deployment.clientId });
        const agent = await ctx.runQuery(internal.agents.getInternal, { id: deployment.agentId });

        if (!client || !agent) throw new Error("Client or Agent not found");

        // 3. Resolve credentials (API keys etc)
        let n8nUrl = "", n8nApiKey = "";
        let isDemoMode = false;

        if (deployment.deploymentType === "client_instance") {
            // Use credentials from the deployment record (entered during deployment)
            n8nUrl = deployment.n8nInstanceUrl || "";
            n8nApiKey = deployment.n8nApiKey || "";
        } else {
            // "your_instance" - use settings from DB
            const settings = await ctx.runQuery(api.settings.getMultiple, {
                keys: ["n8n_url", "n8n_api_key"]
            });
            n8nUrl = settings.n8n_url;
            n8nApiKey = settings.n8n_api_key;
        }

        // Check if we should run in demo mode (no credentials configured)
        if (!n8nUrl || !n8nApiKey) {
            if (deployment.deploymentType === "client_instance") {
                // Client instance must have credentials
                const errorMsg = "Missing client n8n credentials. Please provide n8n URL and API key.";
                await ctx.runMutation(internal.deployments.updateStatus, {
                    id: args.deploymentId,
                    status: "failed",
                    error: errorMsg
                });
                throw new Error(errorMsg);
            } else {
                // Managed instances must also have credentials now that we support them
                const errorMsg = "Managed n8n instance not configured. Please configure it in Settings.";
                await ctx.runMutation(internal.deployments.updateStatus, {
                    id: args.deploymentId,
                    status: "failed",
                    error: errorMsg
                });
                throw new Error(errorMsg);
            }
        }

        // 5. Validate Template JSON
        console.log("Validating template JSON...");
        const templateValidation = validateTemplateJSON(agent.templateJSON);
        if (!templateValidation.valid) {
            const errorMsg = getActionableError(templateValidation.error || "Invalid template");
            await ctx.runMutation(internal.deployments.updateStatus, {
                id: args.deploymentId,
                status: "failed",
                error: errorMsg
            });
            throw new Error(errorMsg);
        }

        // 6. Prepare Deployment Config
        console.log("Preparing deployment config...");
        console.log("n8nUrl:", n8nUrl);
        console.log("credentials count:", deployment.credentials?.length || 0);
        console.log("templateJSON exists:", !!agent.templateJSON);

        const encryptionKey = process.env.ENCRYPTION_KEY;
        if (!encryptionKey) {
            console.error("ENCRYPTION_KEY not set in environment variables");
            // Proceeding without key might be valid if no encrypted credentials exist,
            // but risky if we expect them.
        }

        // Type for deployment credentials
        type DeploymentCredential = {
            type: string;
            displayName: string;
            values?: Record<string, any>;
            encryptedValue?: string;
        };

        const filteredCredentials = await Promise.all((deployment.credentials || [])
            .filter((c: DeploymentCredential) => (c.values && Object.keys(c.values).length > 0) || c.encryptedValue)
            .map(async (c: DeploymentCredential) => {
                // Use the values directly - don't unwrap nested 'credential' field
                // The field names in c.values should match what n8n expects for this credential type
                let data = c.values;

                if (c.encryptedValue) {
                    if (!encryptionKey) {
                        throw new Error(`Cannot decrypt credential ${c.displayName}: ENCRYPTION_KEY not set`);
                    }
                    try {
                        data = await decryptObject(c.encryptedValue, encryptionKey);
                    } catch (error) {
                        console.error(`Failed to decrypt credential ${c.displayName}:`, error);
                        throw new Error(`Failed to decrypt credential ${c.displayName}`);
                    }
                }

                // Log the raw data for debugging
                console.log(`[Credential ${c.displayName}] type: ${c.type}, raw data:`, JSON.stringify(data, null, 2));

                // Ensure credential data is properly structured as an object
                const normalizedData = normalizeCredentialData(data);
                console.log(`[Credential ${c.displayName}] normalized data:`, JSON.stringify(normalizedData, null, 2));

                // Validate that we have some data
                if (Object.keys(normalizedData).length === 0) {
                    console.error(`[Credential ${c.displayName}] WARNING: No valid credential data to send to n8n!`);
                }

                return {
                    type: c.type,
                    name: `${c.displayName} - ${client.name}`,
                    data: normalizedData
                };
            }));

        console.log("Filtered credentials:", JSON.stringify(filteredCredentials, null, 2));

        const config: DeploymentConfig = {
            clientId: client._id,
            agentId: agent._id,
            n8nUrl,
            n8nApiKey,
            templateJSON: agent.templateJSON,
            workflowName: deployment.workflowName || `${agent.name} - ${client.name}`, // Use stored name or fallback
            credentials: filteredCredentials
        };

        // 7. Run Deployment with throttled progress updates
        // Throttle progress updates to avoid OptimisticConcurrencyControlFailure
        let lastProgressUpdate = 0;
        let lastStage = "";
        const THROTTLE_MS = 500; // Minimum 500ms between progress updates

        try {
            const result = await deployAgent(config, async (progress) => {
                console.log(`Deployment Progress: ${progress.stage} ${progress.progress}%`);

                const now = Date.now();
                const stageChanged = progress.stage !== lastStage;
                const throttleExpired = (now - lastProgressUpdate) >= THROTTLE_MS;

                // Only update DB if stage changed OR throttle expired OR it's a completion/failure
                if (stageChanged || throttleExpired || progress.stage === 'completed' || progress.stage === 'failed') {
                    lastProgressUpdate = now;
                    lastStage = progress.stage;

                    await ctx.runMutation(internal.deployments.updateProgress, {
                        id: args.deploymentId,
                        stage: progress.stage,
                        progress: progress.progress,
                        message: progress.message,
                        details: progress.details
                    });
                }
            });

            if (result.success) {
                console.log("Deployment succeeded, workflowId:", result.workflowId, "workflowUrl:", result.workflowUrl);

                if (!result.workflowId) {
                    console.error("WARNING: Deployment succeeded but no workflowId returned!");
                }

                await ctx.runMutation(internal.deployments.updateStatus, {
                    id: args.deploymentId,
                    status: "deployed",
                    workflowId: result.workflowId,  // Pass actual value, not empty string fallback
                    workflowUrl: result.workflowUrl
                });
            } else {
                const actionableError = getActionableError(result.error || "Deployment failed");
                await ctx.runMutation(internal.deployments.updateStatus, {
                    id: args.deploymentId,
                    status: "failed",
                    error: actionableError
                });
                result.error = actionableError;
            }

            return result;
        } catch (error: any) {
            const actionableError = getActionableError(error.message);
            await ctx.runMutation(internal.deployments.updateStatus, {
                id: args.deploymentId,
                status: "failed",
                error: actionableError
            });
            throw new Error(actionableError);
        }
    }
});

// Result type for health check cron
interface HealthCheckCronResult {
    total: number;
    checked: number;
    healthy: number;
    unhealthy: number;
    errors: string[];
}

// Internal action for scheduled health checks (called by cron)
export const checkAllDeploymentsHealth = internalAction({
    args: {},
    handler: async (ctx): Promise<HealthCheckCronResult> => {
        console.log("[Health Cron] Starting scheduled health checks...");

        // 1. Get all active deployments
        const deploymentIds = await ctx.runQuery(internal.health.getActiveDeploymentIds);

        console.log(`[Health Cron] Found ${deploymentIds.length} active deployments to check`);

        const results: HealthCheckCronResult = {
            total: deploymentIds.length,
            checked: 0,
            healthy: 0,
            unhealthy: 0,
            errors: []
        };

        // 2. Check each deployment (with error handling so one failure doesn't stop others)
        for (const deploymentId of deploymentIds) {
            try {
                // Get deployment details
                const deployment = await ctx.runQuery(internal.deployments.getInternal, { id: deploymentId });
                if (!deployment) {
                    results.errors.push(`Deployment ${deploymentId} not found`);
                    continue;
                }

                // Get client details for credentials
                const client = await ctx.runQuery(internal.clients.getInternal, { id: deployment.clientId });
                if (!client) {
                    results.errors.push(`Client not found for deployment ${deploymentId}`);
                    continue;
                }

                // Resolve n8n credentials
                let apiKey = "";
                let n8nUrl = "";

                if (deployment.deploymentType === "client_instance") {
                    if (deployment.n8nInstanceUrl && deployment.n8nApiKey) {
                        n8nUrl = deployment.n8nInstanceUrl;
                        apiKey = deployment.n8nApiKey;
                    } else if (client.n8nInstanceUrl && client.n8nApiKey) {
                        n8nUrl = client.n8nInstanceUrl;
                        apiKey = client.n8nApiKey;
                    }
                } else {
                    const settings = await ctx.runQuery(api.settings.getMultiple, {
                        keys: ["n8n_url", "n8n_api_key"]
                    });
                    n8nUrl = settings.n8n_url;
                    apiKey = settings.n8n_api_key;
                }

                if (!n8nUrl || !apiKey) {
                    results.errors.push(`Missing n8n credentials for deployment ${deploymentId}`);
                    continue;
                }

                // Configure and perform health check
                const config: HealthMonitorConfig = {
                    n8nUrl,
                    n8nApiKey: apiKey,
                    workflowId: deployment.workflowId,
                    deploymentId: deployment._id,
                    clientId: deployment.clientId,
                    agentId: deployment.agentId
                };

                const result = await performHealthCheck(config);

                // Record result
                await ctx.runMutation(internal.health.recordResult, {
                    deploymentId: deployment._id,
                    isHealthy: result.isHealthy,
                    result: result,
                    timestamp: Date.now()
                });

                results.checked++;
                if (result.isHealthy) {
                    results.healthy++;
                } else {
                    results.unhealthy++;
                }

            } catch (error: any) {
                console.error(`[Health Cron] Error checking deployment ${deploymentId}:`, error.message);
                results.errors.push(`${deploymentId}: ${error.message}`);
            }
        }

        console.log(`[Health Cron] Completed. Checked: ${results.checked}, Healthy: ${results.healthy}, Unhealthy: ${results.unhealthy}, Errors: ${results.errors.length}`);

        return results;
    }
});
