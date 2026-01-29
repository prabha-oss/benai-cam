import { v } from "convex/values";
import { query } from "./_generated/server";

// List activity logs with optional filters
export const list = query({
    args: {
        limit: v.optional(v.number()),
        entityType: v.optional(v.union(
            v.literal("agent"),
            v.literal("client"),
            v.literal("deployment")
        )),
        action: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;

        let logsQuery = ctx.db
            .query("activityLog")
            .withIndex("by_timestamp")
            .order("desc");

        // Collect all logs first, then filter
        const allLogs = await logsQuery.take(limit * 3); // Fetch extra to account for filtering

        // Apply filters
        let filteredLogs = allLogs;

        if (args.entityType) {
            filteredLogs = filteredLogs.filter(log => log.entityType === args.entityType);
        }

        if (args.action) {
            filteredLogs = filteredLogs.filter(log => log.action === args.action);
        }

        // Take only the requested limit
        const logs = filteredLogs.slice(0, limit);

        // Enrich logs with entity names
        const enrichedLogs = await Promise.all(
            logs.map(async (log) => {
                let entityName = "Unknown";
                let entityLink = "";

                try {
                    if (log.entityType === "client") {
                        const client = await ctx.db.get(log.entityId as any);
                        if (client && "name" in client) {
                            entityName = client.name as string;
                            entityLink = `/clients/${log.entityId}`;
                        }
                    } else if (log.entityType === "agent") {
                        const agent = await ctx.db.get(log.entityId as any);
                        if (agent && "name" in agent) {
                            entityName = agent.name as string;
                            entityLink = `/agents/${log.entityId}`;
                        }
                    } else if (log.entityType === "deployment") {
                        const deployment = await ctx.db.get(log.entityId as any);
                        if (deployment && "workflowName" in deployment) {
                            entityName = deployment.workflowName as string;
                            // Get client ID for the link
                            const clientId = (deployment as any).clientId;
                            entityLink = `/clients/${clientId}/deployments/${log.entityId}`;
                        }
                    }
                } catch {
                    // Entity may have been deleted
                }

                return {
                    ...log,
                    entityName,
                    entityLink,
                };
            })
        );

        return enrichedLogs;
    },
});

// Get activity for a specific entity
export const getByEntity = query({
    args: {
        entityType: v.union(
            v.literal("agent"),
            v.literal("client"),
            v.literal("deployment")
        ),
        entityId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;

        const logs = await ctx.db
            .query("activityLog")
            .withIndex("by_entity", (q) =>
                q.eq("entityType", args.entityType).eq("entityId", args.entityId)
            )
            .order("desc")
            .take(limit);

        return logs;
    },
});

// Get unique action types for filtering
export const getActionTypes = query({
    args: {},
    handler: async (ctx) => {
        const logs = await ctx.db
            .query("activityLog")
            .withIndex("by_timestamp")
            .order("desc")
            .take(100);

        const actions = new Set(logs.map(log => log.action));
        return Array.from(actions).sort();
    },
});
