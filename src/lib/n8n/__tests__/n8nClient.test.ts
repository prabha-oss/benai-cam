import { describe, it, expect, vi, beforeEach } from 'vitest';
import { N8nClient, createN8nClient } from '../n8nClient';

// Mock fetch responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('N8nClient', () => {
    let client: N8nClient;

    beforeEach(() => {
        vi.clearAllMocks();
        client = createN8nClient({
            baseUrl: 'https://n8n.example.com',
            apiKey: 'test-api-key',
        });
    });

    describe('testConnection', () => {
        it('should return success when connection is valid', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 'ok' }),
            });

            const result = await client.testConnection();

            expect(result.success).toBe(true);
            expect(result.message).toContain('successful');
        });

        it('should return failure when connection fails', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await client.testConnection();

            expect(result.success).toBe(false);
            expect(result.message).toContain('error');
        });
    });

    describe('Credentials CRUD', () => {
        it('should create a credential', async () => {
            const mockCredential = {
                id: 'cred-123',
                name: 'Test Credential',
                type: 'oAuth2Api',
                data: { accessToken: 'token123' },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockCredential),
            });

            const result = await client.createCredential({
                name: 'Test Credential',
                type: 'oAuth2Api',
                data: { accessToken: 'token123' },
            });

            expect(result.id).toBe('cred-123');
            expect(result.name).toBe('Test Credential');
            expect(mockFetch).toHaveBeenCalledWith(
                'https://n8n.example.com/api/v1/credentials',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should get all credentials', async () => {
            const mockCredentials = [
                { id: 'cred-1', name: 'Cred 1', type: 'oAuth2Api' },
                { id: 'cred-2', name: 'Cred 2', type: 'httpBasicAuth' },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ data: mockCredentials }),
            });

            const result = await client.getCredentials();

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('cred-1');
        });

        it('should delete a credential', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({}),
            });

            await expect(client.deleteCredential('cred-123')).resolves.not.toThrow();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://n8n.example.com/api/v1/credentials/cred-123',
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });
    });

    describe('Workflows CRUD', () => {
        it('should create a workflow', async () => {
            const mockWorkflow = {
                id: 'wf-123',
                name: 'Test Workflow',
                active: false,
                nodes: [],
                connections: {},
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockWorkflow),
            });

            const result = await client.createWorkflow({
                name: 'Test Workflow',
                active: false,
                nodes: [],
                connections: {},
            });

            expect(result.id).toBe('wf-123');
        });

        it('should activate a workflow', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 'wf-123', active: true }),
            });

            const result = await client.activateWorkflow('wf-123');

            expect(result.active).toBe(true);
        });

        it('should deactivate a workflow', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 'wf-123', active: false }),
            });

            const result = await client.deactivateWorkflow('wf-123');

            expect(result.active).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle 401 unauthorized error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ message: 'Invalid API key' }),
            });

            await expect(client.getWorkflows()).rejects.toThrow();
        });

        it('should handle 404 not found error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                json: () => Promise.resolve({ message: 'Workflow not found' }),
            });

            await expect(client.getWorkflow('nonexistent')).rejects.toThrow();
        });

        it('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network unreachable'));

            await expect(client.healthCheck()).resolves.toEqual(
                expect.objectContaining({
                    healthy: false,
                })
            );
        });
    });

    describe('healthCheck', () => {
        it('should return healthy when n8n is reachable', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 'ok' }),
            });

            const result = await client.healthCheck();

            expect(result.healthy).toBe(true);
            expect(result.latency).toBeGreaterThanOrEqual(0);
        });

        it('should return unhealthy when n8n is unreachable', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

            const result = await client.healthCheck();

            expect(result.healthy).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
});
