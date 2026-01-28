"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { performHealthCheck, HealthMonitorConfig } from "../src/lib/deployment/healthMonitor";
import { deployAgent, DeploymentConfig } from "../src/lib/deployment/deploymentEngine";
import { decrypt } from "../src/lib/crypto/encryption";

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
                throw new Error("Client n8n configuration missing");
            }
            n8nUrl = client.n8nInstanceUrl;
            // apiKey = await decrypt(client.n8nApiKey, encryptionKey);
            apiKey = client.n8nApiKey; // Using raw key for now as encryption setup requires env var
        } else {
            // "your_instance" - use system env vars
            n8nUrl = process.env.N8N_INSTANCE_URL || "";
            apiKey = process.env.N8N_API_KEY || "";
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
            // "your_instance" - use system env vars
            n8nUrl = process.env.N8N_INSTANCE_URL || process.env.N8N_URL || "";
            n8nApiKey = process.env.N8N_API_KEY || "";
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
                // For managed instance, use demo mode if no credentials
                isDemoMode = true;
                console.log("Running in DEMO MODE - no n8n credentials configured");
            }
        }

        // 4. Handle Demo Mode - simulate successful deployment
        if (isDemoMode) {
            const mockWorkflowId = `demo-${Date.now()}`;
            const mockWorkflowUrl = `https://demo.n8n.cloud/workflow/${mockWorkflowId}`;

            // Simulate a brief delay for realism
            await new Promise(resolve => setTimeout(resolve, 1000));

            await ctx.runMutation(internal.deployments.updateStatus, {
                id: args.deploymentId,
                status: "deployed",
                workflowId: mockWorkflowId,
                workflowUrl: mockWorkflowUrl
            });

            return {
                success: true,
                workflowId: mockWorkflowId,
                workflowUrl: mockWorkflowUrl,
                message: "Deployed in DEMO MODE (no n8n credentials configured)"
            };
        }

        // 5. Prepare Deployment Config
        const config: DeploymentConfig = {
            clientId: client._id,
            agentId: agent._id,
            n8nUrl,
            n8nApiKey,
            templateJSON: agent.templateJSON,
            workflowName: `${agent.name} - ${client.name}`,
            credentials: []
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

