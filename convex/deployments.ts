import { v } from "convex/values";
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

// Create a new deployment record
export const create = mutation({
    args: {
        clientId: v.id("clients"),
        agentId: v.id("agents"),
        deploymentType: v.string(), // "client_instance" | "your_instance"
        workflowId: v.string(),
        workflowName: v.string(),
        credentials: v.array(v.object({
            key: v.string(),
            n8nCredentialId: v.string(),
            displayName: v.string(),
            type: v.string(),
            status: v.string(), // "active" | "needs_refresh"
            createdAt: v.number(),
        })),
        // Optional n8n credentials for client_instance deployments
        n8nUrl: v.optional(v.string()),
        n8nApiKey: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if deployment already exists for this pair?
        // For MVP allow multiple, but PRD says "One deployment per client-agent pair" (Business Rule 1)
        // Let's enforce it.
        const existing = await ctx.db
            .query("deployments")
            .withIndex("by_client_agent", q => q.eq("clientId", args.clientId).eq("agentId", args.agentId))
            .filter(q => q.neq(q.field("status"), "archived"))
            .first();

        if (existing) {
            throw new Error("This agent is already deployed to this client.");
        }

        // Deployment Type validation
        if (args.deploymentType !== 'client_instance' && args.deploymentType !== 'your_instance') {
            throw new Error("Invalid deployment type");
        }

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
            credentials: args.credentials.map(c => ({
                ...c,
                status: c.status as "active" | "needs_refresh" | "failed" // casting
            })),
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

        return deploymentId;
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

// Internal query to get deployment for actions
export const getInternal = internalQuery({
    args: { id: v.id("deployments") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
