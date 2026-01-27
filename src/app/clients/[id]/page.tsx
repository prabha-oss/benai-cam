"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Server, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";

export default function ClientDashboardPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const clientId = params.id as Id<"clients">;

    const client = useQuery(api.clients.get, { id: clientId });
    const deployments = useQuery(api.deployments.getByClient, { clientId });

    if (!client || deployments === undefined) {
        return <div className="p-8">Loading...</div>;
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${client.status === 'active'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                            {client.status.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-muted-foreground">{client.company} • {client.email}</p>
                </div>
                <div className="flex gap-2">
                    <Button>
                        <Zap className="w-4 h-4 mr-2" />
                        Deploy New Agent
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Total Deployments</div>
                        <div className="text-2xl font-bold mt-1">{deployments.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Healthy Workflows</div>
                        <div className="text-2xl font-bold mt-1">{deployments.filter(d => d.health.isHealthy).length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Infrastructure</div>
                        <div className="text-lg font-semibold mt-1 flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            {client.deploymentType === 'your_instance' ? 'Managed' : 'External'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Active Deployments</h3>

                {deployments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <p className="text-muted-foreground">No agents deployed to this client yet.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {deployments.map(d => (
                            <Card key={d._id}>
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{d.agentName}</h4>
                                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                                <span>ID: {d.workflowId}</span>
                                                <span>•</span>
                                                <span>Deployed {new Date(d.deployedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            {d.health.isHealthy ? (
                                                <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Healthy
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Issues Detected
                                                </div>
                                            )}
                                        </div>
                                        <Button variant="outline" size="sm">Manage</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
