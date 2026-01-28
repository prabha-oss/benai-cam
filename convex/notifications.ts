import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List notifications (unread first, then by date)
export const list = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        return await ctx.db
            .query("notifications")
            .withIndex("by_created")
            .order("desc")
            .take(limit);
    },
});

// Get unread count
export const unreadCount = query({
    args: {},
    handler: async (ctx) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read", (q) => q.eq("read", false))
            .collect();
        return unread.length;
    },
});

// Mark as read
export const markAsRead = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            read: true,
            readAt: Date.now(),
        });
    },
});

// Mark all as read
export const markAllAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read", (q) => q.eq("read", false))
            .collect();

        for (const notification of unread) {
            await ctx.db.patch(notification._id, {
                read: true,
                readAt: Date.now(),
            });
        }
    },
});

// Dismiss notification
export const dismiss = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            dismissed: true,
            dismissedAt: Date.now(),
        });
    },
});

// Create notification (internal use mostly, but exposed for testing)
export const create = mutation({
    args: {
        type: v.string(), // "health_alert" | "deployment_success" | ...
        title: v.string(),
        message: v.string(),
        severity: v.string(), // "info" | "warning" | "error" | "success"
        relatedEntityType: v.optional(v.string()),
        relatedEntityId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("notifications", {
            type: args.type as any,
            title: args.title,
            message: args.message,
            severity: args.severity as any,
            relatedEntityType: args.relatedEntityType as any,
            relatedEntityId: args.relatedEntityId,
            read: false,
            dismissed: false,
            createdAt: Date.now(),
        });
    },
});
