"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthStatusBadge, HealthDot, deriveHealthStatus, HealthStatus } from "@/components/HealthStatusBadge";
import { Activity, CheckCircle, AlertTriangle, ExternalLink, Search, XCircle, Clock, Zap, User } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function DeploymentsPage() {
    const deployments = useQuery(api.deployments.list) || [];

    // Calculate stats
    const totalActive = deployments.filter(d => d.status === "deployed").length;
    const healthy = deployments.filter(d => d.health?.isHealthy).length;
    const warnings = deployments.filter(d => {
        const status = deriveHealthStatus(d.health);
        return status === "warning";
    }).length;
    const errors = deployments.filter(d => {
        const status = deriveHealthStatus(d.health);
        return status === "error";
    }).length;

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Deployments</h2>
                    <p className="text-muted-foreground">Monitor all active workflow deployments.</p>
                </div>
            </div>

            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border w-full md:w-1/3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    placeholder="Search deployments..."
                    className="flex-1 outline-none text-sm"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <StatsCard
                    label="Total Active"
                    value={totalActive}
                    icon={Activity}
                />
                <StatsCard
                    label="Healthy"
                    value={healthy}
                    valueColor="text-green-600"
                    icon={CheckCircle}
                    iconColor="text-green-500"
                />
                <StatsCard
                    label="Warnings"
                    value={warnings}
                    valueColor="text-yellow-600"
                    icon={AlertTriangle}
                    iconColor="text-yellow-500"
                />
                <StatsCard
                    label="Errors"
                    value={errors}
                    valueColor="text-red-600"
                    icon={XCircle}
                    iconColor="text-red-500"
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Deployments</CardTitle>
                </CardHeader>
                <CardContent>
                    {deployments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>No deployments yet.</p>
                            <p className="text-sm mt-2">Onboard a client and deploy agents to see them here.</p>
                            <Link href="/clients/new" className="mt-4 inline-block">
                                <Button>Onboard Client</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deployments.map((deployment) => (
                                <DeploymentRow key={deployment._id} deployment={deployment} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatsCard({
    label,
    value,
    valueColor,
    icon: Icon,
    iconColor,
}: {
    label: string;
    value: number;
    valueColor?: string;
    icon: any;
    iconColor?: string;
}) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground">{label}</div>
                        <div className={cn("text-2xl font-bold mt-1", valueColor)}>{value}</div>
                    </div>
                    <Icon className={cn("w-8 h-8 opacity-20", iconColor)} />
                </div>
            </CardContent>
        </Card>
    );
}

function DeploymentRow({ deployment }: { deployment: any }) {
    const healthStatus = deriveHealthStatus(deployment.health);

    return (
        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:border-primary/30 transition-colors">
            {/* Health Indicator */}
            <div className="flex-shrink-0">
                <HealthDot status={healthStatus} size="lg" pulse={healthStatus === "error"} />
            </div>

            {/* Workflow Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm truncate">{deployment.workflowName}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {deployment.clientName}
                    </span>
                    <span>{deployment.clientCompany}</span>
                </div>
            </div>

            {/* Agent Name */}
            <div className="hidden md:block text-sm text-muted-foreground">
                {deployment.agentName}
            </div>

            {/* Health Status */}
            <div className="hidden sm:block">
                <HealthStatusBadge status={healthStatus} size="sm" />
            </div>

            {/* Last Checked */}
            <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {deployment.health?.lastChecked
                    ? formatDistanceToNow(deployment.health.lastChecked, { addSuffix: true })
                    : "Never"
                }
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {deployment.workflowUrl && (
                    <a
                        href={deployment.workflowUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-muted-foreground hover:text-primary transition-colors"
                        title="Open in n8n"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
                <Link href={`/clients/${deployment.clientId}`}>
                    <Button variant="ghost" size="sm">View</Button>
                </Link>
            </div>
        </div>
    );
}
