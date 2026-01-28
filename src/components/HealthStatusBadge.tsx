"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, AlertTriangle, XCircle, Clock, Loader2 } from "lucide-react";

export type HealthStatus = "healthy" | "warning" | "error" | "unknown" | "checking";

interface HealthStatusBadgeProps {
    status: HealthStatus;
    lastChecked?: number;
    showTime?: boolean;
    size?: "sm" | "md" | "lg";
    className?: string;
}

const statusConfig: Record<HealthStatus, {
    icon: any;
    label: string;
    bgColor: string;
    textColor: string;
    dotColor: string;
}> = {
    healthy: {
        icon: CheckCircle,
        label: "Healthy",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        dotColor: "bg-green-500",
    },
    warning: {
        icon: AlertTriangle,
        label: "Warning",
        bgColor: "bg-yellow-50",
        textColor: "text-yellow-700",
        dotColor: "bg-yellow-500",
    },
    error: {
        icon: XCircle,
        label: "Error",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        dotColor: "bg-red-500",
    },
    unknown: {
        icon: Clock,
        label: "Unknown",
        bgColor: "bg-gray-50",
        textColor: "text-gray-600",
        dotColor: "bg-gray-400",
    },
    checking: {
        icon: Loader2,
        label: "Checking...",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        dotColor: "bg-blue-500",
    },
};

const sizeClasses = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
    lg: "px-3 py-1.5 text-sm gap-2",
};

const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
};

export function HealthStatusBadge({
    status,
    lastChecked,
    showTime = false,
    size = "md",
    className,
}: HealthStatusBadgeProps) {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className={cn("inline-flex items-center", className)}>
            <span
                className={cn(
                    "inline-flex items-center rounded-full font-medium",
                    config.bgColor,
                    config.textColor,
                    sizeClasses[size]
                )}
            >
                <Icon className={cn(iconSizes[size], status === "checking" && "animate-spin")} />
                <span>{config.label}</span>
            </span>

            {showTime && lastChecked && (
                <span className="ml-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(lastChecked, { addSuffix: true })}
                </span>
            )}
        </div>
    );
}

// Simple dot indicator for compact displays
interface HealthDotProps {
    status: HealthStatus;
    size?: "sm" | "md" | "lg";
    pulse?: boolean;
    className?: string;
}

const dotSizes = {
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
};

export function HealthDot({ status, size = "md", pulse = false, className }: HealthDotProps) {
    const config = statusConfig[status];

    return (
        <span
            className={cn(
                "rounded-full inline-block",
                config.dotColor,
                dotSizes[size],
                pulse && "animate-pulse",
                className
            )}
            title={config.label}
        />
    );
}

// Helper to derive status from health data
export function deriveHealthStatus(health?: {
    isHealthy: boolean;
    consecutiveErrors?: number;
    errorCount?: number;
}): HealthStatus {
    if (!health) return "unknown";
    if (health.isHealthy) return "healthy";
    if (health.consecutiveErrors && health.consecutiveErrors >= 3) return "error";
    if (health.errorCount && health.errorCount > 0) return "warning";
    return "error";
}
