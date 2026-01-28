/**
 * Health Monitoring Service
 * Periodically checks the health of deployed workflows
 */

import { N8nClient, createN8nClient, N8nExecution } from '../n8n/n8nClient';

export interface HealthCheckResult {
    deploymentId: string;
    workflowId: string;
    isHealthy: boolean;
    timestamp: number;
    latencyMs?: number;
    lastExecution?: {
        id: string;
        status: string;
        startedAt: string;
        finishedAt?: string;
    };
    error?: string;
    details?: {
        workflowActive: boolean;
        recentExecutions: number;
        successRate: number;
        avgExecutionTime: number;
    };
}

export interface HealthAlert {
    id: string;
    deploymentId: string;
    clientId: string;
    agentId: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    type: 'workflow_inactive' | 'execution_failed' | 'connection_lost' | 'high_failure_rate' | 'slow_execution';
    message: string;
    timestamp: number;
    acknowledged: boolean;
    resolvedAt?: number;
}

export interface HealthMonitorConfig {
    n8nUrl: string;
    n8nApiKey: string;
    workflowId: string;
    deploymentId: string;
    clientId: string;
    agentId: string;
}

/**
 * Health Monitor class
 * Monitors the health of a deployed workflow
 */
export class HealthMonitor {
    private client: N8nClient;
    private config: HealthMonitorConfig;

    constructor(config: HealthMonitorConfig) {
        this.config = config;
        this.client = createN8nClient({
            baseUrl: config.n8nUrl,
            apiKey: config.n8nApiKey,
        });
    }

    /**
     * Perform a comprehensive health check
     */
    async checkHealth(): Promise<HealthCheckResult> {
        const startTime = Date.now();

        try {
            // 1. Check if n8n is reachable
            const connectionCheck = await this.client.healthCheck();
            if (!connectionCheck.healthy) {
                return {
                    deploymentId: this.config.deploymentId,
                    workflowId: this.config.workflowId,
                    isHealthy: false,
                    timestamp: Date.now(),
                    error: 'n8n instance is unreachable',
                };
            }

            // 2. Get workflow status
            const workflow = await this.client.getWorkflow(this.config.workflowId);

            // 3. Get recent executions
            const executions = await this.client.getExecutions(this.config.workflowId, 20);

            // 4. Calculate health metrics
            const metrics = this.calculateMetrics(executions);

            // 5. Determine overall health
            const isHealthy =
                workflow.active &&
                metrics.successRate >= 80 &&
                metrics.recentExecutions > 0;

            const latencyMs = Date.now() - startTime;

            // Get last execution
            const lastExecution = executions.length > 0 ? {
                id: executions[0].id,
                status: executions[0].status,
                startedAt: executions[0].startedAt,
                finishedAt: executions[0].stoppedAt,
            } : undefined;

            return {
                deploymentId: this.config.deploymentId,
                workflowId: this.config.workflowId,
                isHealthy,
                timestamp: Date.now(),
                latencyMs,
                lastExecution,
                details: {
                    workflowActive: workflow.active,
                    recentExecutions: metrics.recentExecutions,
                    successRate: metrics.successRate,
                    avgExecutionTime: metrics.avgExecutionTime,
                },
            };

        } catch (error: any) {
            return {
                deploymentId: this.config.deploymentId,
                workflowId: this.config.workflowId,
                isHealthy: false,
                timestamp: Date.now(),
                latencyMs: Date.now() - startTime,
                error: error.message,
            };
        }
    }

    /**
     * Calculate health metrics from executions
     */
    private calculateMetrics(executions: N8nExecution[]): {
        recentExecutions: number;
        successRate: number;
        avgExecutionTime: number;
    } {
        if (executions.length === 0) {
            return {
                recentExecutions: 0,
                successRate: 100, // No failures if no executions
                avgExecutionTime: 0,
            };
        }

        const successful = executions.filter(e => e.status === 'success').length;
        const successRate = (successful / executions.length) * 100;

        // Calculate average execution time
        let totalTime = 0;
        let countWithTime = 0;

        for (const exec of executions) {
            if (exec.stoppedAt && exec.startedAt) {
                const duration = new Date(exec.stoppedAt).getTime() - new Date(exec.startedAt).getTime();
                totalTime += duration;
                countWithTime++;
            }
        }

        const avgExecutionTime = countWithTime > 0 ? totalTime / countWithTime : 0;

        return {
            recentExecutions: executions.length,
            successRate: Math.round(successRate),
            avgExecutionTime: Math.round(avgExecutionTime),
        };
    }

    /**
     * Generate alerts based on health check results
     */
    generateAlerts(result: HealthCheckResult): HealthAlert[] {
        const alerts: HealthAlert[] = [];
        const baseAlert = {
            deploymentId: this.config.deploymentId,
            clientId: this.config.clientId,
            agentId: this.config.agentId,
            timestamp: Date.now(),
            acknowledged: false,
        };

        // Connection lost
        if (result.error?.includes('unreachable')) {
            alerts.push({
                ...baseAlert,
                id: `alert-${Date.now()}-connection`,
                severity: 'critical',
                type: 'connection_lost',
                message: 'Cannot reach n8n instance',
            });
        }

        // Workflow inactive
        if (result.details && !result.details.workflowActive) {
            alerts.push({
                ...baseAlert,
                id: `alert-${Date.now()}-inactive`,
                severity: 'warning',
                type: 'workflow_inactive',
                message: 'Workflow is not active',
            });
        }

        // High failure rate
        if (result.details && result.details.successRate < 80) {
            alerts.push({
                ...baseAlert,
                id: `alert-${Date.now()}-failures`,
                severity: result.details.successRate < 50 ? 'critical' : 'error',
                type: 'high_failure_rate',
                message: `High failure rate: ${100 - result.details.successRate}% of recent executions failed`,
            });
        }

        // Slow executions (> 30 seconds average)
        if (result.details && result.details.avgExecutionTime > 30000) {
            alerts.push({
                ...baseAlert,
                id: `alert-${Date.now()}-slow`,
                severity: 'warning',
                type: 'slow_execution',
                message: `Slow execution time: ${Math.round(result.details.avgExecutionTime / 1000)}s average`,
            });
        }

        // Last execution failed
        if (result.lastExecution?.status === 'error') {
            alerts.push({
                ...baseAlert,
                id: `alert-${Date.now()}-execfail`,
                severity: 'error',
                type: 'execution_failed',
                message: 'Last workflow execution failed',
            });
        }

        return alerts;
    }
}

/**
 * Create a health monitor instance
 */
export function createHealthMonitor(config: HealthMonitorConfig): HealthMonitor {
    return new HealthMonitor(config);
}

/**
 * Perform a one-time health check
 */
export async function performHealthCheck(config: HealthMonitorConfig): Promise<HealthCheckResult> {
    const monitor = createHealthMonitor(config);
    return monitor.checkHealth();
}
