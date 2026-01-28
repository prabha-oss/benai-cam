"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    Phone,
    Video,
    MoreVertical,
    Send,
    Smile,
    Mic,
    FileText,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItem {
    id: string;
    user: string;
    avatar: string;
    action: string;
    target: string;
    time: string;
    message?: string;
    file?: { name: string; size: string };
}

interface RightPanelProps {
    isOpen: boolean;
}

export function RightPanel({ isOpen }: RightPanelProps) {
    // Get real data
    const deployments = useQuery(api.deployments.list);

    // Generate activity from real data
    const recentActivity: ActivityItem[] = [];

    if (deployments) {
        // Add recent deployments as activity
        deployments.slice(0, 3).forEach((dep) => {
            recentActivity.push({
                id: `dep-${dep._id}`,
                user: dep.clientName || "Unknown",
                avatar: (dep.clientName || "U").substring(0, 2).toUpperCase(),
                action: "Deployed",
                target: dep.agentName,
                time: new Date(dep.deployedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
        });
    }

    // Fallback activity when no data
    if (recentActivity.length === 0) {
        recentActivity.push(
            {
                id: "1",
                user: "System",
                avatar: "SY",
                action: "Welcome to",
                target: "BenAI CAM",
                time: "Now",
                message: "Start by creating an agent and deploying it to a client!"
            }
        );
    }

    return (
        <div
            className={cn(
                "fixed right-0 top-0 h-screen bg-white border-l border-border/50 shadow-lg transition-all duration-300 ease-in-out flex flex-col z-40",
                isOpen ? "w-80 translate-x-0" : "w-80 translate-x-full"
            )}
        >
            {/* User Profile Section */}
            <div className="p-6 text-center border-b border-border/50 mt-16">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center mb-3">
                    <span className="text-2xl font-bold text-primary">AD</span>
                </div>
                <h3 className="font-semibold text-lg">Admin User</h3>
                <p className="text-sm text-muted-foreground">@admin</p>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-2 mt-4">
                    <button className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="w-4 h-4" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Video className="w-4 h-4" />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="flex-1 overflow-y-auto p-4">
                <h4 className="font-semibold text-sm mb-4">Activity</h4>

                {!deployments ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recentActivity.map((item) => (
                            <div key={item.id} className="space-y-2">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                        {item.avatar}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-sm truncate">{item.user}</span>
                                            <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {item.action} <span className="text-primary">{item.target}</span>
                                        </p>
                                    </div>
                                </div>

                                {item.message && (
                                    <div className="bg-muted rounded-2xl rounded-tl-md p-3 ml-12">
                                        <p className="text-sm">{item.message}</p>
                                    </div>
                                )}

                                {item.file && (
                                    <div className="flex items-center gap-3 bg-muted rounded-xl p-3 ml-12">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{item.file.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.file.size}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border/50">
                <div className="flex items-center gap-2 bg-muted rounded-xl p-2">
                    <button className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Smile className="w-4 h-4" />
                    </button>
                    <input
                        type="text"
                        placeholder="Write a message..."
                        className="flex-1 bg-transparent text-sm outline-none"
                    />
                    <button className="w-8 h-8 rounded-lg hover:bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                        <Mic className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
