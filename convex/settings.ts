import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get a setting by key
export const get = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const setting = await ctx.db
            .query("settings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();
        return setting?.value ?? null;
    },
});

// Get multiple settings by keys
export const getMultiple = query({
    args: { keys: v.array(v.string()) },
    handler: async (ctx, args) => {
        const settings: Record<string, any> = {};

        for (const key of args.keys) {
            const setting = await ctx.db
                .query("settings")
                .withIndex("by_key", (q) => q.eq("key", key))
                .first();
            settings[key] = setting?.value ?? null;
        }

        return settings;
    },
});

// Set a setting (upsert)
export const set = mutation({
    args: {
        key: v.string(),
        value: v.any(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("settings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value: args.value,
                updatedAt: Date.now(),
            });
            return existing._id;
        } else {
            return await ctx.db.insert("settings", {
                key: args.key,
                value: args.value,
                description: args.description,
                updatedAt: Date.now(),
            });
        }
    },
});

// Set multiple settings at once
export const setMultiple = mutation({
    args: {
        settings: v.array(v.object({
            key: v.string(),
            value: v.any(),
            description: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        for (const setting of args.settings) {
            const existing = await ctx.db
                .query("settings")
                .withIndex("by_key", (q) => q.eq("key", setting.key))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, {
                    value: setting.value,
                    updatedAt: Date.now(),
                });
            } else {
                await ctx.db.insert("settings", {
                    key: setting.key,
                    value: setting.value,
                    description: setting.description,
                    updatedAt: Date.now(),
                });
            }
        }
    },
});

// Delete a setting
export const remove = mutation({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("settings")
            .withIndex("by_key", (q) => q.eq("key", args.key))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});
