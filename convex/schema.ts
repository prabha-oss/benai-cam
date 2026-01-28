import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // ============================================================
    // AGENTS TABLE
    // ============================================================
    agents: defineTable({
        // Basic Info
        name: v.string(),
        description: v.optional(v.string()),

        // Template
        templateJSON: v.any(), // Complete n8n workflow JSON

        // Credential Schema
        credentialSchema: v.object({
            simple: v.array(v.object({
                type: v.string(),
                displayName: v.string(),
                instances: v.number(),
                fields: v.array(v.object({
                    name: v.string(),
                    label: v.string(),
                    type: v.union(v.literal("text"), v.literal("password")),
                    required: v.boolean(),
                    default: v.optional(v.string())
                }))
            })),
            special: v.array(v.object({
                type: v.string(),
                displayName: v.string(),
                keyword: v.string(),
                instances: v.number(),
                fields: v.array(v.object({
                    name: v.string(),
                    label: v.string(),
                    type: v.union(v.literal("text"), v.literal("password")),
                    required: v.boolean(),
                    default: v.optional(v.string())
                }))
            }))
        }),

        // Manual Credentials
        manualCredentials: v.array(v.object({
            type: v.string(),
            displayName: v.string(),
            fields: v.array(v.object({
                name: v.string(),
                label: v.string(),
                type: v.union(v.literal("text"), v.literal("password")),
                required: v.boolean()
            }))
        })),

        // Status
        isActive: v.optional(v.boolean()), // Active/Inactive toggle (defaults to true)

        // Metadata
        createdAt: v.number(),
        updatedAt: v.number(),
        deletedAt: v.optional(v.number()) // Soft delete
    })
        .index("by_name", ["name"])
        .index("by_created", ["createdAt"])
        .index("by_deleted", ["deletedAt"])
        .index("by_active", ["isActive"])
        .searchIndex("search_name", {
            searchField: "name",
            filterFields: ["deletedAt", "isActive"]
        }),

    // ============================================================
    // CLIENTS TABLE
    // ============================================================
    clients: defineTable({
        // Basic Info
        name: v.string(),
        email: v.string(),
        company: v.string(),

        // Deployment Configuration
        deploymentType: v.union(
            v.literal("client_instance"),
            v.literal("your_instance")
        ),

        // For client_instance only
        n8nInstanceUrl: v.optional(v.string()),
        n8nApiKey: v.optional(v.string()), // Encrypted

        // Status
        status: v.union(
            v.literal("active"),
            v.literal("inactive"),
            v.literal("suspended")
        ),

        // Metadata
        createdAt: v.number(),
        updatedAt: v.number(),
        archivedAt: v.optional(v.number()) // Soft archive
    })
        .index("by_email", ["email"])
        .index("by_name", ["name"])
        .index("by_status", ["status"])
        .index("by_deployment_type", ["deploymentType"])
        .index("by_created", ["createdAt"])
        .index("by_archived", ["archivedAt"])
        .searchIndex("search_client", {
            searchField: "name",
            filterFields: ["status", "deploymentType", "archivedAt"]
        }),

    // ============================================================
    // DEPLOYMENTS TABLE
    // ============================================================
    deployments: defineTable({
        // Relationships
        clientId: v.id("clients"),
        agentId: v.id("agents"),

        // Deployment Config
        deploymentType: v.union(
            v.literal("client_instance"),
            v.literal("your_instance")
        ),

        // n8n Instance Config (for client_instance deployments)
        n8nInstanceUrl: v.optional(v.string()),
        n8nApiKey: v.optional(v.string()), // Consider encrypting in production

        // n8n References
        workflowId: v.string(), // n8n workflow ID
        workflowName: v.string(),
        workflowUrl: v.optional(v.string()), // URL to workflow in n8n

        // Credentials
        credentials: v.array(v.object({
            key: v.string(), // e.g., "airtable", "openai"
            n8nCredentialId: v.string(),
            displayName: v.string(),
            type: v.string(),
            status: v.union(
                v.literal("active"),
                v.literal("needs_refresh"),
                v.literal("failed"),
                v.literal("archived")
            ),
            createdAt: v.number(),
            updatedAt: v.optional(v.number()),
            expiresAt: v.optional(v.number())
        })),

        // Deployment Status
        status: v.union(
            v.literal("deployed"),
            v.literal("deploying"),
            v.literal("failed"),
            v.literal("archived")
        ),

        deploymentError: v.optional(v.string()),

        // Health Monitoring
        health: v.object({
            lastChecked: v.number(),
            isHealthy: v.boolean(),
            lastExecutionTime: v.optional(v.number()),
            lastExecutionStatus: v.optional(v.union(
                v.literal("success"),
                v.literal("error"),
                v.literal("warning")
            )),
            errorCount: v.number(),
            consecutiveErrors: v.number(),
            errors: v.array(v.object({
                timestamp: v.number(),
                message: v.string(),
                type: v.string(),
                severity: v.union(
                    v.literal("info"),
                    v.literal("warning"),
                    v.literal("error"),
                    v.literal("critical")
                )
            }))
        }),

        // Metadata
        deployedAt: v.number(),
        updatedAt: v.number(),
        archivedAt: v.optional(v.number())
    })
        .index("by_client", ["clientId"])
        .index("by_agent", ["agentId"])
        .index("by_client_agent", ["clientId", "agentId"])
        .index("by_status", ["status"])
        .index("by_health", ["health.isHealthy"])
        .index("by_deployed", ["deployedAt"])
        .index("by_archived", ["archivedAt"])
        .searchIndex("search_workflow", {
            searchField: "workflowName",
            filterFields: ["clientId", "agentId", "status", "archivedAt"]
        }),

    // ============================================================
    // HEALTH_CHECKS TABLE (Historical Record)
    // ============================================================
    healthChecks: defineTable({
        deploymentId: v.id("deployments"),

        timestamp: v.number(),

        checks: v.object({
            workflowExists: v.boolean(),
            workflowActive: v.boolean(),
            credentialsValid: v.boolean(),
            recentExecution: v.boolean(),
            noErrors: v.boolean()
        }),

        overallStatus: v.union(
            v.literal("healthy"),
            v.literal("warning"),
            v.literal("error"),
            v.literal("unknown")
        ),

        details: v.optional(v.string()),

        executionData: v.optional(v.object({
            lastExecutionId: v.string(),
            lastExecutionTime: v.number(),
            lastExecutionStatus: v.string(),
            errorMessage: v.optional(v.string())
        }))
    })
        .index("by_deployment", ["deploymentId"])
        .index("by_timestamp", ["timestamp"])
        .index("by_status", ["overallStatus"]),

    // ============================================================
    // ACTIVITY_LOG TABLE
    // ============================================================
    activityLog: defineTable({
        // Related Entity
        entityType: v.union(
            v.literal("agent"),
            v.literal("client"),
            v.literal("deployment")
        ),
        entityId: v.string(), // ID of related entity

        // Activity Details
        action: v.string(), // e.g., "created", "updated", "deployed", "archived"
        description: v.string(),

        // User (for future multi-user support)
        userId: v.optional(v.string()),

        // Additional Data
        metadata: v.optional(v.any()),

        timestamp: v.number()
    })
        .index("by_entity", ["entityType", "entityId"])
        .index("by_timestamp", ["timestamp"])
        .index("by_action", ["action"]),

    // ============================================================
    // NOTIFICATIONS TABLE
    // ============================================================
    notifications: defineTable({
        // Notification Details
        type: v.union(
            v.literal("health_alert"),
            v.literal("deployment_success"),
            v.literal("deployment_failure"),
            v.literal("credential_expiring"),
            v.literal("system_message")
        ),

        title: v.string(),
        message: v.string(),

        severity: v.union(
            v.literal("info"),
            v.literal("warning"),
            v.literal("error"),
            v.literal("success")
        ),

        // Related Entity
        relatedEntityType: v.optional(v.union(
            v.literal("agent"),
            v.literal("client"),
            v.literal("deployment")
        )),
        relatedEntityId: v.optional(v.string()),

        // Status
        read: v.boolean(),
        dismissed: v.boolean(),
        snoozedUntil: v.optional(v.number()),

        // Metadata
        createdAt: v.number(),
        readAt: v.optional(v.number()),
        dismissedAt: v.optional(v.number())
    })
        .index("by_read", ["read"])
        .index("by_dismissed", ["dismissed"])
        .index("by_created", ["createdAt"])
        .index("by_type", ["type"])
        .index("by_severity", ["severity"])
        .index("by_related_entity", ["relatedEntityType", "relatedEntityId"]),

    // ============================================================
    // SETTINGS TABLE (System Configuration)
    // ============================================================
    settings: defineTable({
        key: v.string(), // Unique setting key
        value: v.any(), // Setting value (can be any type)
        description: v.optional(v.string()),
        updatedAt: v.number()
    })
        .index("by_key", ["key"])
});
