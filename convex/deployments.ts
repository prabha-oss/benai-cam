import { v, ConvexError } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";

// List all deployments with client and agent info
export const list = query({
    args: {},
    handler: async (ctx) => {
        const deployments = await ctx.db
            .query("deployments")
            .withIndex("by_deployed")
            .order("desc")
            .collect();

        return await Promise.all(
            deployments.map(async (d) => {
                const client = await ctx.db.get(d.clientId);
                const agent = await ctx.db.get(d.agentId);
                return {
                    ...d,
                    clientName: client?.name || "Unknown Client",
                    clientCompany: client?.company || "",
                    agentName: agent?.name || "Unknown Agent",
                };
            })
        );
    },
});

// Get deployments by agent ID
export const getByAgent = query({
    args: { agentId: v.id("agents") },
    handler: async (ctx, args) => {
        const deployments = await ctx.db
            .query("deployments")
            .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
            .collect();

        return await Promise.all(
            deployments.map(async (d) => {
                const client = await ctx.db.get(d.clientId);
                return {
                    ...d,
                    clientName: client?.name || "Unknown Client",
                    clientCompany: client?.company || "",
                };
            })
        );
    },
});

// Get deployments by client ID
export const getByClient = query({
    args: { clientId: v.id("clients") },
    handler: async (ctx, args) => {
        const deployments = await ctx.db
            .query("deployments")
            .withIndex("by_client", (q) => q.eq("clientId", args.clientId))
            .collect();

        return await Promise.all(
            deployments.map(async (d) => {
                const agent = await ctx.db.get(d.agentId);
                return {
                    ...d,
                    agentName: agent?.name || "Unknown Agent",
                };
            })
        );
    },
});

// Get a single deployment by ID
export const get = query({
    args: { id: v.id("deployments") },
    handler: async (ctx, args) => {
        const deployment = await ctx.db.get(args.id);
        if (!deployment) return null;

        const agent = await ctx.db.get(deployment.agentId);
        const client = await ctx.db.get(deployment.clientId);

        return {
            ...deployment,
            agentName: agent?.name || "Unknown Agent",
            clientName: client?.name || "Unknown Client",
        };
    },
});

// Create a new deployment record
export const create = mutation({
    args: {
        clientId: v.id("clients"),
        agentId: v.id("agents"),
        deploymentType: v.string(), // "client_instance" | "your_instance"
        workflowId: v.string(),
        workflowName: v.string(),
        credentials: v.any(), // Flexible to prevent validation errors
        // Optional n8n credentials for client_instance deployments
        n8nUrl: v.optional(v.string()),
        n8nApiKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        console.log("deployments:create args:", args);

        try {
            // Check if deployment already exists for this client-agent pair
            // If it exists, archive it and create a new one (re-deployment)
            const existing = await ctx.db
                .query("deployments")
                .withIndex("by_client_agent", q => q.eq("clientId", args.clientId).eq("agentId", args.agentId))
                .filter(q => q.neq(q.field("status"), "archived"))
                .first();

            if (existing) {
                // Archive the existing deployment to allow re-deployment
                await ctx.db.patch(existing._id, {
                    status: "archived",
                    archivedAt: Date.now(),
                });
            }

            // Deployment Type validation
            if (args.deploymentType !== 'client_instance' && args.deploymentType !== 'your_instance') {
                throw new Error("Invalid deployment type");
            }

            // Safely handle credentials - ensure it's an array
            const rawCredentials = Array.isArray(args.credentials) ? args.credentials : [];
            const processedCredentials = rawCredentials.map((c: any) => ({
                ...c,
                status: (c.status || "active") as "active" | "needs_refresh" | "failed" | "archived"
            }));

            const deploymentId = await ctx.db.insert("deployments", {
                clientId: args.clientId,
                agentId: args.agentId,
                deploymentType: args.deploymentType as "client_instance" | "your_instance",
                // Store n8n credentials for client_instance deployments
                n8nInstanceUrl: args.n8nUrl,
                n8nApiKey: args.n8nApiKey,
                workflowId: args.workflowId,
                workflowName: args.workflowName,
                workflowUrl: "", // Optional
                credentials: processedCredentials,
                status: "deploying", // Start as deploying, action will update to deployed/failed
                health: {
                    lastChecked: Date.now(),
                    isHealthy: true, // Optimistic init
                    errorCount: 0,
                    consecutiveErrors: 0,
                    errors: []
                },
                deployedAt: Date.now(),
                updatedAt: Date.now(),
            });

            // Log activity
            await ctx.db.insert("activityLog", {
                entityType: "deployment",
                entityId: deploymentId,
                action: "deploying",
                description: `Started deploying agent to client`,
                timestamp: Date.now(),
            });

            return { deploymentId, error: null };
        } catch (error: any) {
            console.error("Deployment creation failed:", error);
            return { deploymentId: null, error: `Failed to create deployment: ${error.message}` };
        }
    }
});

// Update deployment status (internal use by actions)
export const updateStatus = internalMutation({
    args: {
        id: v.id("deployments"),
        status: v.string(), // "deployed" | "deploying" | "failed" | "archived"
        error: v.optional(v.string()),
        workflowId: v.optional(v.string()),
        workflowUrl: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const updates: any = {
            status: args.status,
            updatedAt: Date.now()
        };

        if (args.error) updates.deploymentError = args.error;
        if (args.workflowId) updates.workflowId = args.workflowId;
        if (args.workflowUrl) updates.workflowUrl = args.workflowUrl;

        await ctx.db.patch(args.id, updates);
    }
});

// Update deployment health (internal use by actions)
export const updateHealth = internalMutation({
    args: {
        id: v.id("deployments"),
        isHealthy: v.boolean(),
        error: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const deployment = await ctx.db.get(args.id);
        if (!deployment) return;

        // Simplified health update for now, ideally merge with health.ts logic
        await ctx.db.patch(args.id, {
            health: {
                ...deployment.health,
                lastChecked: Date.now(),
                isHealthy: args.isHealthy
            }
        });
    }
});

// Update deployment progress (internal use by actions)
// NOTE: Do NOT update updatedAt here to avoid OptimisticConcurrencyControlFailure
// during rapid progress updates. updatedAt is only set in updateStatus.
export const updateProgress = internalMutation({
    args: {
        id: v.id("deployments"),
        stage: v.string(),
        progress: v.number(),
        message: v.string(),
        details: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            deploymentProgress: {
                stage: args.stage,
                progress: args.progress,
                message: args.message,
                details: args.details
            }
            // updatedAt intentionally omitted to prevent concurrency conflicts
        });
    }
});

// Internal query to get deployment for actions
export const getInternal = internalQuery({
    args: { id: v.id("deployments") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});


// Toggle deployment active status (pause/resume for a specific client)
export const toggleActive = mutation({
    args: { id: v.id("deployments") },
    handler: async (ctx, args) => {
        const deployment = await ctx.db.get(args.id);
        if (!deployment) {
            throw new Error("Deployment not found");
        }

        const newStatus = deployment.status === "deployed" ? "paused" : "deployed";

        await ctx.db.patch(args.id, {
            status: newStatus,
        });

        // Get agent and client names for activity log
        const agent = await ctx.db.get(deployment.agentId);
        const client = await ctx.db.get(deployment.clientId);

        // Log activity
        await ctx.db.insert("activityLog", {
            entityType: "deployment",
            entityId: args.id,
            action: newStatus === "deployed" ? "activated" : "paused",
            description: `${newStatus === "deployed" ? "Activated" : "Paused"} deployment of "${agent?.name || "Unknown"}" for "${client?.name || "Unknown"}"`,
            timestamp: Date.now(),
        });

        return newStatus;
    },
});

// Update deployment credentials
export const updateCredentials = mutation({
    args: {
        id: v.id("deployments"),
        credentials: v.array(v.object({
            key: v.string(),
            n8nCredentialId: v.string(),
            displayName: v.string(),
            type: v.string(),
            status: v.union(v.literal("active"), v.literal("needs_refresh"), v.literal("failed"), v.literal("archived")),
            createdAt: v.number(),
            values: v.optional(v.any()),
            encryptedValue: v.optional(v.string()),
            updatedAt: v.optional(v.number()),
            expiresAt: v.optional(v.number()),
        })),
    },
    handler: async (ctx, args) => {
        const deployment = await ctx.db.get(args.id);
        if (!deployment) {
            throw new Error("Deployment not found");
        }

        await ctx.db.patch(args.id, {
            credentials: args.credentials.map(cred => ({
                ...cred,
                updatedAt: Date.now(),
            })),
            updatedAt: Date.now(),
        });

        // Get agent and client names for activity log
        const agent = await ctx.db.get(deployment.agentId);
        const client = await ctx.db.get(deployment.clientId);

        // Log activity
        await ctx.db.insert("activityLog", {
            entityType: "deployment",
            entityId: args.id,
            action: "credentials_updated",
            description: `Updated credentials for deployment of "${agent?.name || "Unknown"}" for "${client?.name || "Unknown"}"`,
            timestamp: Date.now(),
        });
    },
});
