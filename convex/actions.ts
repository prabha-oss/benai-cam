"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { performHealthCheck, HealthMonitorConfig } from "../src/lib/deployment/healthMonitor";
import { deployAgent, DeploymentConfig, testN8nConnection } from "../src/lib/deployment/deploymentEngine";
import { decrypt } from "../src/lib/crypto/encryption";

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

        // 5. Prepare Deployment Config
        console.log("Preparing deployment config...");
        console.log("n8nUrl:", n8nUrl);
        console.log("credentials count:", deployment.credentials?.length || 0);
        console.log("templateJSON exists:", !!agent.templateJSON);

        const filteredCredentials = (deployment.credentials || [])
            .filter(c => c.values && Object.keys(c.values).length > 0)
            .map(c => ({
                type: c.type,
                name: `${c.displayName} - ${client.name}`,
                data: c.values.credential || c.values
            }));

        console.log("Filtered credentials:", JSON.stringify(filteredCredentials, null, 2));

        const config: DeploymentConfig = {
            clientId: client._id,
            agentId: agent._id,
            n8nUrl,
            n8nApiKey,
            templateJSON: agent.templateJSON,
            workflowName: `${agent.name} - ${client.name}`,
            credentials: filteredCredentials
        };

        // 6. Run Deployment
        try {
            const result = await deployAgent(config, (progress) => {
                console.log(`Deployment Progress: ${progress.stage} ${progress.progress}%`);
            });

            if (result.success) {
                await ctx.runMutation(internal.deployments.updateStatus, {
                    id: args.deploymentId,
                    status: "deployed",
                    workflowId: result.workflowId || "",
                    workflowUrl: result.workflowUrl
                });
            } else {
                await ctx.runMutation(internal.deployments.updateStatus, {
                    id: args.deploymentId,
                    status: "failed",
                    error: result.error
                });
            }

            return result;
        } catch (error: any) {
            await ctx.runMutation(internal.deployments.updateStatus, {
                id: args.deploymentId,
                status: "failed",
                error: error.message
            });
            throw error;
        }
    }
});

