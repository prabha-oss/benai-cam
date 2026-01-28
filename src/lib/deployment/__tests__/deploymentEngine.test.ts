import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeploymentEngine, deployAgent, testN8nConnection, DeploymentConfig } from '../deploymentEngine';

// Mock the n8n client
vi.mock('../../n8n/n8nClient', () => ({
    createN8nClient: vi.fn(() => mockN8nClient),
    N8nClient: vi.fn(),
}));

const mockN8nClient = {
    testConnection: vi.fn(),
    createCredential: vi.fn(),
    deleteCredential: vi.fn(),
    createWorkflow: vi.fn(),
    deleteWorkflow: vi.fn(),
    activateWorkflow: vi.fn(),
    deactivateWorkflow: vi.fn(),
};

describe('DeploymentEngine', () => {
    const baseConfig: DeploymentConfig = {
        clientId: 'client-123',
        agentId: 'agent-456',
        n8nUrl: 'https://n8n.example.com',
        n8nApiKey: 'test-api-key',
        credentials: [
            { type: 'googleApi', name: 'Google', data: { accessToken: 'token1' } },
            { type: 'slackApi', name: 'Slack', data: { token: 'token2' } },
        ],
        templateJSON: {
            nodes: [
                { id: '1', type: 'n8n-nodes-base.start', parameters: {}, credentials: { googleApi: { id: '__CREDENTIAL_googleApi__' } } },
                { id: '2', type: 'n8n-nodes-base.slack', parameters: {}, credentials: { slackApi: { id: '__CREDENTIAL_slackApi__' } } },
            ],
            connections: { '1': { main: [[{ node: '2', type: 'main', index: 0 }]] } },
        },
        workflowName: 'Test Workflow',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('deploy', () => {
        it('should complete deployment successfully', async () => {
            // Setup mocks for successful deployment
            mockN8nClient.testConnection.mockResolvedValue({ success: true });
            mockN8nClient.createCredential
                .mockResolvedValueOnce({ id: 'cred-google', name: 'Google' })
                .mockResolvedValueOnce({ id: 'cred-slack', name: 'Slack' });
            mockN8nClient.createWorkflow.mockResolvedValue({ id: 'wf-123', name: 'Test Workflow' });
            mockN8nClient.activateWorkflow.mockResolvedValue({ id: 'wf-123', active: true });

            const result = await deployAgent(baseConfig);

            expect(result.success).toBe(true);
            expect(result.workflowId).toBe('wf-123');
            expect(result.credentialIds).toHaveLength(2);
        });

        it('should track progress through stages', async () => {
            const progressUpdates: string[] = [];
            const onProgress = vi.fn((progress) => {
                progressUpdates.push(progress.stage);
            });

            mockN8nClient.testConnection.mockResolvedValue({ success: true });
            mockN8nClient.createCredential.mockResolvedValue({ id: 'cred-1' });
            mockN8nClient.createWorkflow.mockResolvedValue({ id: 'wf-123' });
            mockN8nClient.activateWorkflow.mockResolvedValue({ id: 'wf-123', active: true });

            await deployAgent(baseConfig, onProgress);

            expect(onProgress).toHaveBeenCalled();
            expect(progressUpdates).toContain('initializing');
            expect(progressUpdates).toContain('creating_credentials');
            expect(progressUpdates).toContain('deploying');
        });

        it('should rollback on credential creation failure', async () => {
            mockN8nClient.testConnection.mockResolvedValue({ success: true });
            mockN8nClient.createCredential
                .mockResolvedValueOnce({ id: 'cred-google' }) // First credential succeeds
                .mockRejectedValueOnce(new Error('API limit reached')); // Second fails
            mockN8nClient.deleteCredential.mockResolvedValue(undefined);

            const result = await deployAgent(baseConfig);

            expect(result.success).toBe(false);
            expect(result.error).toContain('API limit');
            // Verify rollback was attempted
            expect(mockN8nClient.deleteCredential).toHaveBeenCalledWith('cred-google');
        });

        it('should rollback on workflow creation failure', async () => {
            mockN8nClient.testConnection.mockResolvedValue({ success: true });
            mockN8nClient.createCredential.mockResolvedValue({ id: 'cred-123' });
            mockN8nClient.createWorkflow.mockRejectedValue(new Error('Workflow validation failed'));
            mockN8nClient.deleteCredential.mockResolvedValue(undefined);

            const result = await deployAgent(baseConfig);

            expect(result.success).toBe(false);
            expect(result.error).toContain('validation');
            expect(mockN8nClient.deleteCredential).toHaveBeenCalled();
        });

        it('should rollback on workflow activation failure', async () => {
            mockN8nClient.testConnection.mockResolvedValue({ success: true });
            mockN8nClient.createCredential.mockResolvedValue({ id: 'cred-123' });
            mockN8nClient.createWorkflow.mockResolvedValue({ id: 'wf-123' });
            mockN8nClient.activateWorkflow.mockRejectedValue(new Error('Cannot activate'));
            mockN8nClient.deleteCredential.mockResolvedValue(undefined);
            mockN8nClient.deleteWorkflow.mockResolvedValue(undefined);

            const result = await deployAgent(baseConfig);

            expect(result.success).toBe(false);
            expect(mockN8nClient.deleteWorkflow).toHaveBeenCalledWith('wf-123');
        });
    });

    describe('credential replacement', () => {
        it('should replace credential placeholders in workflow template', async () => {
            mockN8nClient.testConnection.mockResolvedValue({ success: true });
            mockN8nClient.createCredential
                .mockResolvedValueOnce({ id: 'real-google-id' })
                .mockResolvedValueOnce({ id: 'real-slack-id' });
            mockN8nClient.createWorkflow.mockResolvedValue({ id: 'wf-123' });
            mockN8nClient.activateWorkflow.mockResolvedValue({ id: 'wf-123', active: true });

            await deployAgent(baseConfig);

            // Check that createWorkflow was called with replaced credentials
            const createWorkflowCall = mockN8nClient.createWorkflow.mock.calls[0][0];
            expect(createWorkflowCall.nodes[0].credentials.googleApi.id).toBe('real-google-id');
            expect(createWorkflowCall.nodes[1].credentials.slackApi.id).toBe('real-slack-id');
        });
    });

    describe('testN8nConnection', () => {
        it('should return success for valid connection', async () => {
            mockN8nClient.testConnection.mockResolvedValue({
                success: true,
                message: 'Connected',
                version: '1.0.0'
            });

            const result = await testN8nConnection('https://n8n.example.com', 'api-key');

            expect(result.success).toBe(true);
        });

        it('should return failure for invalid connection', async () => {
            mockN8nClient.testConnection.mockResolvedValue({
                success: false,
                message: 'Invalid API key'
            });

            const result = await testN8nConnection('https://n8n.example.com', 'bad-key');

            expect(result.success).toBe(false);
        });
    });
});
