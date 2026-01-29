import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Get IDs of all active deployments for health checks (used by cron)
export const getActiveDeploymentIds = internalQuery({
    args: {},
    handler: async (ctx) => {
        const deployments = await ctx.db
            .query("deployments")
            .withIndex("by_status", (q) => q.eq("status", "deployed"))
            .collect();

        return deployments.map(d => d._id);
    },
});

// Get health history for a deployment
export const getHistory = query({
    args: { deploymentId: v.id("deployments"), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        return await ctx.db
            .query("healthChecks")
            .withIndex("by_deployment", (q) => q.eq("deploymentId", args.deploymentId))
            .order("desc")
            .take(limit);
    },
});

// Record a health check result
export const recordResult = internalMutation({
    args: {
        deploymentId: v.id("deployments"),
        isHealthy: v.boolean(),
        result: v.any(), // Full HealthCheckResult object
        timestamp: v.number(),
    },
    handler: async (ctx, args) => {
        const deployment = await ctx.db.get(args.deploymentId);
        if (!deployment) throw new Error("Deployment not found");

        const status = args.isHealthy ? "healthy" : "error";
        const result = args.result;

        // 1. Store historical record
        await ctx.db.insert("healthChecks", {
            deploymentId: args.deploymentId,
            timestamp: args.timestamp,
            overallStatus: status,
            checks: {
                workflowExists: true, // simplified
                workflowActive: result.details?.workflowActive ?? false,
                credentialsValid: true, // simplified
                recentExecution: (result.details?.recentExecutions ?? 0) > 0,
                noErrors: args.isHealthy
            },
            details: result.error,
            executionData: result.lastExecution ? {
                lastExecutionId: result.lastExecution.id,
                lastExecutionTime: new Date(result.lastExecution.startedAt).getTime(),
                lastExecutionStatus: result.lastExecution.status,
            } : undefined
        });

        // 2. Update deployment current health status
        const currentErrors = deployment.health.errors || [];

        // Add new error if unhealthy
        if (!args.isHealthy && result.error) {
            currentErrors.push({
                timestamp: args.timestamp,
                message: result.error,
                type: "health_check_failed",
                severity: "error"
            });

            // Keep only last 10 errors
            if (currentErrors.length > 10) {
                currentErrors.shift();
            }
        }

        await ctx.db.patch(args.deploymentId, {
            health: {
                ...deployment.health,
                lastChecked: args.timestamp,
                isHealthy: args.isHealthy,
                errorCount: args.isHealthy ? 0 : (deployment.health.errorCount + 1),
                consecutiveErrors: args.isHealthy ? 0 : (deployment.health.consecutiveErrors + 1),
                errors: currentErrors,
                lastExecutionTime: result.lastExecution ? new Date(result.lastExecution.startedAt).getTime() : deployment.health.lastExecutionTime,
                lastExecutionStatus: result.lastExecution?.status === 'success' ? 'success' : result.lastExecution?.status === 'error' ? 'error' : 'warning',
            }
        });

        // 3. Create notification if health status changed or critical error
        if (!args.isHealthy && (deployment.health.isHealthy || deployment.health.consecutiveErrors >= 3)) {
            await ctx.db.insert("notifications", {
                type: "health_alert",
                title: `Health Check Failed: ${deployment.workflowName}`,
                message: result.error || "Unknown health check error",
                severity: "error",
                relatedEntityType: "deployment",
                relatedEntityId: args.deploymentId,
                read: false,
                dismissed: false,
                createdAt: args.timestamp
            });
        }
    },
});

// Perform health checks for all active deployments (would be called by cron/scheduler)
export const checkAll = mutation({
    args: {},
    handler: async (ctx) => {
        // In a real implementation, this would trigger an action to perform HTTP requests
        // Since Convex mutations can't make HTTP requests, we'd use a scheduled action
        // For now, we'll return the list of deployments that need checking
        const deployments = await ctx.db
            .query("deployments")
            .withIndex("by_status", (q) => q.eq("status", "deployed"))
            .collect();

        return deployments.map(d => d._id);
    },
});
