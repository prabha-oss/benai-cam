"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HealthStatusBadge, HealthStatus, deriveHealthStatus } from "./HealthStatusBadge";
import {
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    TrendingUp,
    AlertTriangle,
    RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface HealthError {
    timestamp: number;
    message: string;
    type: string;
    severity: string;
}

interface HealthData {
    lastChecked: number;
    isHealthy: boolean;
    errorCount: number;
    consecutiveErrors: number;
    errors: HealthError[];
    lastExecutionTime?: number;
    lastExecutionStatus?: "success" | "error" | "warning";
}

interface HealthDetailsCardProps {
    health: HealthData;
    workflowName?: string;
    onRefresh?: () => void;
    isRefreshing?: boolean;
    className?: string;
}

export function HealthDetailsCard({
    health,
    workflowName,
    onRefresh,
    isRefreshing = false,
    className,
}: HealthDetailsCardProps) {
    const status = deriveHealthStatus(health);

    return (
        <Card className={cn("", className)}>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                        Health Status
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <HealthStatusBadge status={status} />
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={isRefreshing}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors disabled:opacity-50"
                                title="Refresh health status"
                            >
                                <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                            </button>
                        )}
                    </div>
                </div>
                {workflowName && (
                    <p className="text-sm text-muted-foreground">{workflowName}</p>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Health Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <MetricItem
                        icon={Clock}
                        label="Last Checked"
                        value={formatDistanceToNow(health.lastChecked, { addSuffix: true })}
                    />
                    <MetricItem
                        icon={health.isHealthy ? CheckCircle : XCircle}
                        label="Status"
                        value={health.isHealthy ? "Operational" : "Issues Detected"}
                        valueColor={health.isHealthy ? "text-green-600" : "text-red-600"}
                    />
                    <MetricItem
                        icon={AlertTriangle}
                        label="Error Count"
                        value={String(health.errorCount)}
                        valueColor={health.errorCount > 0 ? "text-yellow-600" : "text-green-600"}
                    />
                    <MetricItem
                        icon={Activity}
                        label="Last Execution"
                        value={
                            health.lastExecutionTime
                                ? formatDistanceToNow(health.lastExecutionTime, { addSuffix: true })
                                : "Never"
                        }
                    />
                </div>

                {/* Last Execution Status */}
                {health.lastExecutionStatus && (
                    <div className="pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Last Execution Status</span>
                            <ExecutionStatusBadge status={health.lastExecutionStatus} />
                        </div>
                    </div>
                )}

                {/* Error History */}
                {health.errors && health.errors.length > 0 && (
                    <div className="pt-3 border-t">
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            Recent Errors
                        </h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                            {health.errors.slice(0, 5).map((error, idx) => (
                                <div
                                    key={idx}
                                    className="text-xs p-2 bg-red-50 rounded-md border border-red-100"
                                >
                                    <div className="flex justify-between items-start">
                                        <span className="text-red-700 font-medium">{error.type}</span>
                                        <span className="text-red-500">
                                            {formatDistanceToNow(error.timestamp, { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-red-600 mt-1 line-clamp-2">{error.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Clear Message */}
                {health.isHealthy && health.errors.length === 0 && (
                    <div className="pt-3 border-t">
                        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                            <CheckCircle className="w-4 h-4" />
                            <span>All systems operational. No issues detected.</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Helper Components
function MetricItem({
    icon: Icon,
    label,
    value,
    valueColor,
}: {
    icon: any;
    label: string;
    value: string;
    valueColor?: string;
}) {
    return (
        <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
            <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={cn("text-sm font-medium", valueColor)}>{value}</p>
            </div>
        </div>
    );
}

function ExecutionStatusBadge({ status }: { status: "success" | "error" | "warning" }) {
    const config = {
        success: { bg: "bg-green-100", text: "text-green-700", label: "Success" },
        error: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
        warning: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Warning" },
    };

    const c = config[status];

    return (
        <span className={cn("px-2 py-0.5 rounded text-xs font-medium", c.bg, c.text)}>
            {c.label}
        </span>
    );
}

// Compact version for list views
interface HealthStatusCompactProps {
    health: HealthData;
    className?: string;
}

export function HealthStatusCompact({ health, className }: HealthStatusCompactProps) {
    const status = deriveHealthStatus(health);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <HealthStatusBadge status={status} size="sm" />
            {health.consecutiveErrors > 0 && (
                <span className="text-xs text-red-500">
                    ({health.consecutiveErrors} consecutive)
                </span>
            )}
        </div>
    );
}
