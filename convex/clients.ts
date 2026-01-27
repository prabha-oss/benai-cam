import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

// Create a new client
export const create = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        company: v.string(),
        deploymentType: v.union(v.literal("client_instance"), v.literal("your_instance")),
        n8nInstanceUrl: v.optional(v.string()),
        n8nApiKey: v.optional(v.string()), // This should be encrypted in a real app
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
            ...args,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return clientId;
    },
});

// Archive client (soft delete)
export const archive = mutation({
    args: { id: v.id("clients") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            status: "inactive",
            archivedAt: Date.now(),
        });
    },
});
