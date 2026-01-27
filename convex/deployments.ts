import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

        // Cast string to union types for storage if needed, but schema defined string union so string input is validated at runtime by Convex if it matches
        // Wait, schema used v.union for status. The arg we passed is string. 
        // We should cast or ensure the input matches.

        // Deployment Type validation
        if (args.deploymentType !== 'client_instance' && args.deploymentType !== 'your_instance') {
            throw new Error("Invalid deployment type");
        }

        const deploymentId = await ctx.db.insert("deployments", {
            clientId: args.clientId,
            agentId: args.agentId,
            deploymentType: args.deploymentType as "client_instance" | "your_instance",
            workflowId: args.workflowId,
            workflowName: args.workflowName,
            workflowUrl: "", // Optional
            credentials: args.credentials.map(c => ({
                ...c,
                status: c.status as "active" | "needs_refresh" | "failed" // casting
            })),
            status: "deployed",
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
            action: "deployed",
            description: `Deployed agent to client`,
            timestamp: Date.now(),
        });

        return deploymentId;
    }
});
