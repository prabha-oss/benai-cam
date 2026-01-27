"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Zap, CheckCircle, AlertTriangle, Clock, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function DeploymentsPage() {
    const deployments = useQuery(api.deployments.list);

    const getStatusBadge = (status: string, isHealthy: boolean) => {
        if (status === "deployed" && isHealthy) {
            return (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle className="w-3 h-3" />
                    Healthy
                </span>
            );
        } else if (status === "deployed" && !isHealthy) {
            return (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3 h-3" />
                    Issues
                </span>
            );
        } else if (status === "deploying") {
            return (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    <Clock className="w-3 h-3" />
                    Deploying
                </span>
            );
        } else if (status === "failed") {
            return (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                    <AlertTriangle className="w-3 h-3" />
                    Failed
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                {status}
            </span>
        );
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Deployments</h2>
                    <p className="text-muted-foreground">Monitor all agent deployments across clients.</p>
                </div>
                <Link href="/clients/new">
                    <Button>
                        <Zap className="w-4 h-4 mr-2" />
                        New Deployment
                    </Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border w-full md:w-1/3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    placeholder="Search deployments..."
                    className="flex-1 outline-none text-sm"
                />
            </div>

            {!deployments ? (
                <div className="text-center py-12">Loading...</div>
            ) : deployments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <LayoutDashboard className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">No deployments yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        Deploy an agent to a client to see it here.
                    </p>
                    <Link href="/clients/new" className="mt-6 inline-block">
                        <Button variant="outline">Create Deployment</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {deployments.map((deployment) => (
                        <Card key={deployment._id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                            <Zap className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{deployment.agentName}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Deployed to {deployment.clientName}
                                                {deployment.clientCompany && ` • ${deployment.clientCompany}`}
                                            </p>
                                            <div className="flex gap-2 mt-2 items-center">
                                                {getStatusBadge(deployment.status, deployment.health.isHealthy)}
                                                <span className="text-xs text-gray-500">
                                                    ID: {deployment.workflowId}
                                                </span>
                                                <span className="text-xs text-gray-500">•</span>
                                                <span className="text-xs text-gray-500">
                                                    Deployed {new Date(deployment.deployedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/clients/${deployment.clientId}`}>
                                            <Button variant="outline" size="sm">View Client</Button>
                                        </Link>
                                        <Button variant="outline" size="sm">Manage</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
