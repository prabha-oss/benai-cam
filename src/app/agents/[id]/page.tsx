"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";

export default function AgentDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const agentId = params.id as Id<"agents">;

    const agent = useQuery(api.agents.get, { id: agentId });
    // Pass correct arg structure if needed. Based on convex/agents.ts: args: { id: v.id("agents") }
    // The useQuery hook should handle this if types are generated. 
    // Note: params.id is string, likely needs validation as ID. 
    // For now assuming it works or useQuery handles validation.

    // Also get deployments (mocked for now since table is empty/function incomplete)
    // const deployments = useQuery(api.deployments.getByAgent, { agentId });

    if (agent === undefined) {
        return <div className="p-8">Loading...</div>;
    }

    if (agent === null) {
        return <div className="p-8">Agent not found</div>;
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold tracking-tight">{agent.name}</h2>
                    <p className="text-muted-foreground">Created on {new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                    <Button onClick={() => router.push(`/clients/new?agentId=${agentId}`)}>
                        <Play className="w-4 h-4 mr-2" />
                        Deploy to Client
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Info */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-600">
                                {agent.description || "No description provided."}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Credential Schema</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Simple Credentials</h4>
                                    {agent.credentialSchema.simple.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">None</p>
                                    ) : (
                                        <div className="grid gap-2">
                                            {agent.credentialSchema.simple.map((c: any) => (
                                                <div key={c.type} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                                                    <span className="font-medium text-sm">{c.displayName}</span>
                                                    <span className="text-xs bg-white px-2 py-1 rounded border">
                                                        {c.instances} instances
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold mb-2">Special Credentials</h4>
                                    {agent.credentialSchema.special.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">None</p>
                                    ) : (
                                        <div className="grid gap-2">
                                            {agent.credentialSchema.special.map((c: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center p-3 border rounded bg-yellow-50/50 border-yellow-100">
                                                    <div>
                                                        <div className="font-medium text-sm mb-1">{c.displayName}</div>
                                                        <div className="text-xs text-muted-foreground">Keyword: "{c.keyword}"</div>
                                                    </div>
                                                    <span className="text-xs bg-white px-2 py-1 rounded border">
                                                        {c.instances} instances
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Deployments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-6 text-muted-foreground text-sm">
                                No active deployments.
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Template JSON</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs font-mono overflow-auto max-h-60">
                                {JSON.stringify(agent.templateJSON, null, 2)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
