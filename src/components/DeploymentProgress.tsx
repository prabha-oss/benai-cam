"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, AlertCircle, Zap, Key, Play, Server } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeploymentStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'success' | 'error';
    detail?: string;
}

interface DeploymentProgressProps {
    steps: DeploymentStep[];
    isComplete: boolean;
    error?: string;
}

export function DeploymentProgress({ steps, isComplete, error }: DeploymentProgressProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {steps.map((step, idx) => (
                    <div
                        key={step.id}
                        className={cn(
                            "flex items-center gap-4 p-4 rounded-lg border transition-all duration-300",
                            step.status === 'running' && "bg-blue-50 border-blue-200",
                            step.status === 'success' && "bg-green-50 border-green-200",
                            step.status === 'error' && "bg-red-50 border-red-200",
                            step.status === 'pending' && "bg-gray-50 border-gray-100 opacity-60"
                        )}
                    >
                        <div className="flex-shrink-0">
                            {step.status === 'pending' && (
                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                    {idx + 1}
                                </div>
                            )}
                            {step.status === 'running' && (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                            )}
                            {step.status === 'success' && (
                                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <Check className="w-4 h-4" />
                                </div>
                            )}
                            {step.status === 'error' && (
                                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className={cn(
                                "font-medium text-sm",
                                step.status === 'success' && "text-green-700",
                                step.status === 'error' && "text-red-700",
                                step.status === 'running' && "text-blue-700"
                            )}>
                                {step.label}
                            </div>
                            {step.detail && (
                                <div className="text-xs text-muted-foreground mt-0.5">{step.detail}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {isComplete && !error && (
                <div className="bg-green-100 text-green-800 p-4 rounded-lg flex items-center gap-3 animate-in fade-in duration-500">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Deployment completed successfully!</span>
                </div>
            )}

            {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <div className="font-medium">Deployment failed</div>
                        <div className="text-sm mt-1">{error}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Hook to simulate deployment progress
export function useDeploymentSimulator() {
    const [steps, setSteps] = useState<DeploymentStep[]>([
        { id: 'connect', label: 'Connecting to n8n instance', status: 'pending' },
        { id: 'credentials', label: 'Creating credentials', status: 'pending' },
        { id: 'workflow', label: 'Deploying workflow', status: 'pending' },
        { id: 'activate', label: 'Activating workflow', status: 'pending' },
    ]);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | undefined>();

    const startDeployment = async () => {
        const stepIds = ['connect', 'credentials', 'workflow', 'activate'];

        for (let i = 0; i < stepIds.length; i++) {
            // Set current step to running
            setSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: 'running' } : s
            ));

            // Simulate work
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

            // Set to success
            setSteps(prev => prev.map((s, idx) =>
                idx === i ? { ...s, status: 'success' } : s
            ));
        }

        setIsComplete(true);
    };

    return { steps, isComplete, error, startDeployment };
}
