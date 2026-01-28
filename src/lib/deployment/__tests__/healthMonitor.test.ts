import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthMonitor, createHealthMonitor, performHealthCheck, HealthCheckResult } from '../healthMonitor';

// Mock the n8n client
vi.mock('../../n8n/n8nClient', () => ({
    createN8nClient: vi.fn(() => mockN8nClient),
}));

const mockN8nClient = {
    healthCheck: vi.fn(),
    getWorkflow: vi.fn(),
    getExecutions: vi.fn(),
};

describe('HealthMonitor', () => {
    const baseConfig = {
        n8nUrl: 'https://n8n.example.com',
        n8nApiKey: 'test-api-key',
        workflowId: 'wf-123',
        deploymentId: 'deploy-456',
        clientId: 'client-789',
        agentId: 'agent-012',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('checkHealth', () => {
        it('should return healthy when workflow is active and executions succeed', async () => {
            mockN8nClient.healthCheck.mockResolvedValue({ healthy: true });
            mockN8nClient.getWorkflow.mockResolvedValue({ id: 'wf-123', active: true });
            mockN8nClient.getExecutions.mockResolvedValue([
                { id: 'exec-1', status: 'success', startedAt: new Date().toISOString(), stoppedAt: new Date().toISOString() },
                { id: 'exec-2', status: 'success', startedAt: new Date().toISOString(), stoppedAt: new Date().toISOString() },
            ]);

            const result = await performHealthCheck(baseConfig);

            expect(result.isHealthy).toBe(true);
            expect(result.details?.workflowActive).toBe(true);
            expect(result.details?.successRate).toBe(100);
        });

        it('should return unhealthy when n8n is unreachable', async () => {
            mockN8nClient.healthCheck.mockResolvedValue({ healthy: false, error: 'Connection refused' });

            const result = await performHealthCheck(baseConfig);

            expect(result.isHealthy).toBe(false);
            expect(result.error).toContain('unreachable');
        });

        it('should return unhealthy when workflow is inactive', async () => {
            mockN8nClient.healthCheck.mockResolvedValue({ healthy: true });
            mockN8nClient.getWorkflow.mockResolvedValue({ id: 'wf-123', active: false });
            mockN8nClient.getExecutions.mockResolvedValue([]);

            const result = await performHealthCheck(baseConfig);

            expect(result.isHealthy).toBe(false);
            expect(result.details?.workflowActive).toBe(false);
        });

        it('should return unhealthy when success rate is below threshold', async () => {
            mockN8nClient.healthCheck.mockResolvedValue({ healthy: true });
            mockN8nClient.getWorkflow.mockResolvedValue({ id: 'wf-123', active: true });
            mockN8nClient.getExecutions.mockResolvedValue([
                { id: 'exec-1', status: 'success', startedAt: new Date().toISOString() },
                { id: 'exec-2', status: 'error', startedAt: new Date().toISOString() },
                { id: 'exec-3', status: 'error', startedAt: new Date().toISOString() },
                { id: 'exec-4', status: 'error', startedAt: new Date().toISOString() },
            ]);

            const result = await performHealthCheck(baseConfig);

            expect(result.isHealthy).toBe(false);
            expect(result.details?.successRate).toBeLessThan(80);
        });

        it('should include latency measurement', async () => {
            mockN8nClient.healthCheck.mockImplementation(async () => {
                await new Promise(r => setTimeout(r, 10));
                return { healthy: true };
            });
            mockN8nClient.getWorkflow.mockResolvedValue({ id: 'wf-123', active: true });
            mockN8nClient.getExecutions.mockResolvedValue([
                { id: 'exec-1', status: 'success', startedAt: new Date().toISOString() },
            ]);

            const result = await performHealthCheck(baseConfig);

            expect(result.latencyMs).toBeGreaterThan(0);
        });
    });

    describe('calculateMetrics', () => {
        it('should calculate correct success rate', async () => {
            mockN8nClient.healthCheck.mockResolvedValue({ healthy: true });
            mockN8nClient.getWorkflow.mockResolvedValue({ id: 'wf-123', active: true });
            mockN8nClient.getExecutions.mockResolvedValue([
                { id: '1', status: 'success', startedAt: new Date().toISOString() },
                { id: '2', status: 'success', startedAt: new Date().toISOString() },
                { id: '3', status: 'error', startedAt: new Date().toISOString() },
                { id: '4', status: 'success', startedAt: new Date().toISOString() },
            ]);

            const result = await performHealthCheck(baseConfig);

            expect(result.details?.successRate).toBe(75); // 3/4 = 75%
        });

        it('should handle empty executions list', async () => {
            mockN8nClient.healthCheck.mockResolvedValue({ healthy: true });
            mockN8nClient.getWorkflow.mockResolvedValue({ id: 'wf-123', active: true });
            mockN8nClient.getExecutions.mockResolvedValue([]);

            const result = await performHealthCheck(baseConfig);

            expect(result.details?.recentExecutions).toBe(0);
            expect(result.details?.successRate).toBe(100); // No failures
        });
    });

    describe('generateAlerts', () => {
        it('should generate connection_lost alert when unreachable', async () => {
            mockN8nClient.healthCheck.mockResolvedValue({ healthy: false });

            const monitor = createHealthMonitor(baseConfig);
            const healthResult: HealthCheckResult = {
                deploymentId: baseConfig.deploymentId,
                workflowId: baseConfig.workflowId,
                isHealthy: false,
                timestamp: Date.now(),
                error: 'n8n instance is unreachable',
            };

            const alerts = monitor.generateAlerts(healthResult);

            expect(alerts.some(a => a.type === 'connection_lost')).toBe(true);
            expect(alerts.some(a => a.severity === 'critical')).toBe(true);
        });

        it('should generate workflow_inactive alert', async () => {
            const monitor = createHealthMonitor(baseConfig);
            const healthResult: HealthCheckResult = {
                deploymentId: baseConfig.deploymentId,
                workflowId: baseConfig.workflowId,
                isHealthy: false,
                timestamp: Date.now(),
                details: {
                    workflowActive: false,
                    recentExecutions: 5,
                    successRate: 100,
                    avgExecutionTime: 1000,
                },
            };

            const alerts = monitor.generateAlerts(healthResult);

            expect(alerts.some(a => a.type === 'workflow_inactive')).toBe(true);
        });

        it('should generate high_failure_rate alert', async () => {
            const monitor = createHealthMonitor(baseConfig);
            const healthResult: HealthCheckResult = {
                deploymentId: baseConfig.deploymentId,
                workflowId: baseConfig.workflowId,
                isHealthy: false,
                timestamp: Date.now(),
                details: {
                    workflowActive: true,
                    recentExecutions: 10,
                    successRate: 40,
                    avgExecutionTime: 1000,
                },
            };

            const alerts = monitor.generateAlerts(healthResult);

            expect(alerts.some(a => a.type === 'high_failure_rate')).toBe(true);
            expect(alerts.some(a => a.severity === 'critical')).toBe(true); // <50% is critical
        });

        it('should generate slow_execution alert', async () => {
            const monitor = createHealthMonitor(baseConfig);
            const healthResult: HealthCheckResult = {
                deploymentId: baseConfig.deploymentId,
                workflowId: baseConfig.workflowId,
                isHealthy: true,
                timestamp: Date.now(),
                details: {
                    workflowActive: true,
                    recentExecutions: 10,
                    successRate: 95,
                    avgExecutionTime: 45000, // 45 seconds
                },
            };

            const alerts = monitor.generateAlerts(healthResult);

            expect(alerts.some(a => a.type === 'slow_execution')).toBe(true);
        });

        it('should not generate alerts when everything is healthy', async () => {
            const monitor = createHealthMonitor(baseConfig);
            const healthResult: HealthCheckResult = {
                deploymentId: baseConfig.deploymentId,
                workflowId: baseConfig.workflowId,
                isHealthy: true,
                timestamp: Date.now(),
                details: {
                    workflowActive: true,
                    recentExecutions: 10,
                    successRate: 95,
                    avgExecutionTime: 5000,
                },
                lastExecution: {
                    id: 'exec-1',
                    status: 'success',
                    startedAt: new Date().toISOString(),
                },
            };

            const alerts = monitor.generateAlerts(healthResult);

            expect(alerts).toHaveLength(0);
        });
    });
});
