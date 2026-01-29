"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Search,
    Activity,
    Users,
    Zap,
    LayoutDashboard,
    Clock,
    ArrowRight,
    Loader2,
    Filter,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

type EntityType = "all" | "agent" | "client" | "deployment";

const entityTypeConfig = {
    agent: { icon: Zap, color: "text-purple-600", bgColor: "bg-purple-50" },
    client: { icon: Users, color: "text-blue-600", bgColor: "bg-blue-50" },
    deployment: { icon: LayoutDashboard, color: "text-green-600", bgColor: "bg-green-50" },
};

const actionBadgeColors: Record<string, string> = {
    created: "bg-green-100 text-green-700",
    updated: "bg-blue-100 text-blue-700",
    deploying: "bg-yellow-100 text-yellow-700",
    deployed: "bg-green-100 text-green-700",
    activated: "bg-green-100 text-green-700",
    paused: "bg-gray-100 text-gray-700",
    failed: "bg-red-100 text-red-700",
    archived: "bg-gray-100 text-gray-700",
    credentials_updated: "bg-blue-100 text-blue-700",
};

export default function ActivityPage() {
    const [mounted, setMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [entityFilter, setEntityFilter] = useState<EntityType>("all");
    const [actionFilter, setActionFilter] = useState<string>("all");

    useEffect(() => {
        setMounted(true);
    }, []);

    const activityLogs = useQuery(api.activityLog.list, {
        limit: 50,
        entityType: entityFilter === "all" ? undefined : entityFilter,
        action: actionFilter === "all" ? undefined : actionFilter,
    });

    const actionTypes = useQuery(api.activityLog.getActionTypes);

    // Filter by search query
    const filteredLogs = activityLogs?.filter(log =>
        log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!mounted) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
                <p className="text-muted-foreground mt-1">
                    Track all changes and events across your workspace
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border/50 shadow-sm flex-1 md:flex-none md:w-80">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input
                        placeholder="Search activity..."
                        className="flex-1 outline-none text-sm bg-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Entity Type Filter */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-border/50 shadow-sm">
                    {(["all", "client", "agent", "deployment"] as EntityType[]).map((type) => (
                        <button
                            key={type}
                            onClick={() => setEntityFilter(type)}
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors capitalize ${
                                entityFilter === type
                                    ? "bg-primary text-white"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                        >
                            {type === "all" ? "All" : `${type}s`}
                        </button>
                    ))}
                </div>

                {/* Action Filter */}
                {actionTypes && actionTypes.length > 0 && (
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-border/50 shadow-sm">
                        <Filter className="w-4 h-4 text-muted-foreground ml-2" />
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="text-sm bg-transparent outline-none pr-2 py-2"
                        >
                            <option value="all">All Actions</option>
                            {actionTypes.map((action) => (
                                <option key={action} value={action} className="capitalize">
                                    {action.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Activity List */}
            {activityLogs === undefined ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredLogs && filteredLogs.length > 0 ? (
                <Card className="bg-white rounded-2xl shadow-sm border-border/50">
                    <CardContent className="p-0 divide-y divide-border/50">
                        {filteredLogs.map((log) => {
                            const config = entityTypeConfig[log.entityType as keyof typeof entityTypeConfig];
                            const IconComponent = config?.icon || Activity;
                            const badgeColor = actionBadgeColors[log.action] || "bg-gray-100 text-gray-700";

                            return (
                                <div
                                    key={log._id}
                                    className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors"
                                >
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config?.bgColor || "bg-gray-50"}`}>
                                        <IconComponent className={`w-5 h-5 ${config?.color || "text-gray-600"}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm truncate">
                                                {log.entityName}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badgeColor}`}>
                                                {log.action.replace(/_/g, " ")}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">
                                                {log.entityType}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                            {log.description}
                                        </p>
                                    </div>

                                    {/* Timestamp */}
                                    <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                                        <Clock className="w-3.5 h-3.5" />
                                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                                    </div>

                                    {/* Link */}
                                    {log.entityLink && (
                                        <Link
                                            href={log.entityLink}
                                            className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                                        >
                                            View
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            ) : (
                <Card className="bg-white rounded-2xl shadow-sm border-border/50 border-dashed">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto">
                            {searchQuery || entityFilter !== "all" || actionFilter !== "all"
                                ? "No activity matches your filters. Try adjusting your search."
                                : "Activity will appear here as you create clients, agents, and deployments."}
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
