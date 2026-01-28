import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";

// List all clients
export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("clients")
            .withIndex("by_created")
            .order("desc")
            .collect();
    },
});

// Get single client by ID
export const get = query({
    args: { id: v.id("clients") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Create a new client (simple - just basic info)
export const create = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        company: v.string(),
        status: v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended")),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("clients")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            throw new Error(`Client with email "${args.email}" already exists.`);
        }

        const clientId = await ctx.db.insert("clients", {
            name: args.name,
            email: args.email,
            company: args.company,
            status: args.status,
            deploymentType: "your_instance", // Default, will be set per-deployment
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Log activity
        await ctx.db.insert("activityLog", {
            entityType: "client",
            entityId: clientId,
            action: "created",
            description: `Created client "${args.name}"`,
            timestamp: Date.now(),
        });

        return clientId;
    },
});

// Update an existing client
export const update = mutation({
    args: {
        id: v.id("clients"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        company: v.optional(v.string()),
        status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("suspended"))),
    },
    handler: async (ctx, args) => {
        const client = await ctx.db.get(args.id);
        if (!client) {
            throw new Error("Client not found");
        }

        // If email is being changed, check for duplicates
        if (args.email && args.email !== client.email) {
            const existing = await ctx.db
                .query("clients")
                .withIndex("by_email", (q) => q.eq("email", args.email!))
                .first();
            if (existing) {
                throw new Error(`Client with email "${args.email}" already exists.`);
            }
        }

        const updates: any = { updatedAt: Date.now() };
        if (args.name !== undefined) updates.name = args.name;
        if (args.email !== undefined) updates.email = args.email;
        if (args.company !== undefined) updates.company = args.company;
        if (args.status !== undefined) updates.status = args.status;

        await ctx.db.patch(args.id, updates);

        // Log activity
        await ctx.db.insert("activityLog", {
            entityType: "client",
            entityId: args.id,
            action: "updated",
            description: `Updated client "${args.name || client.name}"`,
            timestamp: Date.now(),
        });

        return args.id;
    },
});

// Archive client (soft delete)
export const archive = mutation({
    args: { id: v.id("clients") },
    handler: async (ctx, args) => {
        const client = await ctx.db.get(args.id);
        if (!client) {
            throw new Error("Client not found");
        }

        await ctx.db.patch(args.id, {
            status: "inactive",
            archivedAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Log activity
        await ctx.db.insert("activityLog", {
            entityType: "client",
            entityId: args.id,
            action: "archived",
            description: `Archived client "${client.name}"`,
            timestamp: Date.now(),
        });
    },
});

// Internal query to get client for actions
export const getInternal = internalQuery({
    args: { id: v.id("clients") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
