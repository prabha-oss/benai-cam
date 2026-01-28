"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Zap } from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function AgentsPage() {
    const agents = useQuery(api.agents.list);
    const setActive = useMutation(api.agents.setActive);

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    // Filter agents based on search and status
    const filteredAgents = agents?.filter(agent => {
        // Skip deleted agents
        if (agent.deletedAt) return false;

        // Search filter
        const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (agent.description || "").toLowerCase().includes(searchQuery.toLowerCase());

        // Status filter (treat undefined as active for backwards compatibility)
        const isAgentActive = agent.isActive !== false;
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "active" && isAgentActive) ||
            (statusFilter === "inactive" && !isAgentActive);

        return matchesSearch && matchesStatus;
    }) || [];

    const handleToggleActive = async (agentId: Id<"agents">, currentStatus: boolean | undefined) => {
        const isCurrentlyActive = currentStatus !== false;
        try {
            await setActive({ id: agentId, isActive: !isCurrentlyActive });
            toast.success(`Agent ${isCurrentlyActive ? "deactivated" : "activated"} successfully`);
        } catch (error) {
            toast.error("Failed to update agent status");
        }
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
                    <p className="text-muted-foreground">Manage your automation templates.</p>
                </div>
                <Link href="/agents/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Agent
                    </Button>
                </Link>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border flex-1 md:flex-none md:w-80">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                        placeholder="Search agents..."
                        className="flex-1 outline-none text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-lg border">
                    {(["all", "active", "inactive"] as const).map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors capitalize ${statusFilter === status
                                    ? "bg-primary text-white"
                                    : "hover:bg-gray-100 text-gray-600"
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {!agents ? (
                <div className="text-center py-12">Loading...</div>
            ) : filteredAgents.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">
                        {agents.filter(a => !a.deletedAt).length === 0
                            ? "No agents yet"
                            : "No agents match your filters"}
                    </h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        {agents.filter(a => !a.deletedAt).length === 0
                            ? "Create your first agent template to start deploying workflows to clients."
                            : "Try adjusting your search or filter criteria."}
                    </p>
                    {agents.filter(a => !a.deletedAt).length === 0 && (
                        <Link href="/agents/new" className="mt-6 inline-block">
                            <Button variant="outline">Create Agent</Button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAgents.map((agent) => {
                        const isActive = agent.isActive !== false;
                        return (
                            <Card
                                key={agent._id}
                                className={`transition-all h-full relative ${isActive
                                        ? "hover:shadow-lg hover:border-primary/30 cursor-pointer"
                                        : "opacity-60 bg-gray-50 border-gray-200"
                                    }`}
                            >
                                <Link href={`/agents/${agent._id}`} className="block">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive
                                                    ? "bg-blue-50 text-blue-600"
                                                    : "bg-gray-100 text-gray-400"
                                                }`}>
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            {/* Active/Inactive Toggle */}
                                            <div
                                                className="flex items-center gap-2"
                                                onClick={(e) => e.preventDefault()}
                                            >
                                                <span className={`text-xs font-medium ${isActive ? "text-emerald-600" : "text-gray-400"
                                                    }`}>
                                                    {isActive ? "Active" : "Inactive"}
                                                </span>
                                                <Switch
                                                    checked={isActive}
                                                    onCheckedChange={() => handleToggleActive(agent._id, agent.isActive)}
                                                    className="data-[state=checked]:bg-emerald-500"
                                                />
                                            </div>
                                        </div>
                                        <CardTitle className={`text-lg mt-3 ${!isActive ? "text-gray-500" : ""}`}>
                                            {agent.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className={`text-sm line-clamp-2 mb-4 ${isActive ? "text-muted-foreground" : "text-gray-400"
                                            }`}>
                                            {agent.description || "No description provided."}
                                        </p>
                                        <div className="flex gap-2 flex-wrap">
                                            <span className={`text-xs px-2 py-1 rounded-md ${isActive ? "bg-gray-100" : "bg-gray-200 text-gray-500"
                                                }`}>
                                                {agent.credentialSchema.simple.length + agent.credentialSchema.special.length} credentials
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-md ${isActive
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "bg-gray-200 text-gray-500"
                                                }`}>
                                                0 deployments
                                            </span>
                                            {!isActive && (
                                                <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md">
                                                    Inactive
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Link>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
