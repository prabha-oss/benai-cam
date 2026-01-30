"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Zap, Loader2, Check, AlertCircle, Server, Cloud, Lock } from "lucide-react";
import { toast } from "sonner";
import { isValidUrl } from "@/lib/utils";

export default function DeployAgentPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const clientId = id as Id<"clients">;

    const client = useQuery(api.clients.get, { id: clientId });
    const agents = useQuery(api.agents.list);
    const createDeployment = useMutation(api.deployments.create);
    const deployAgentAction = useAction(api.actions.deployAgentAction);
    const testConnectionAction = useAction(api.actions.testConnection);

    // Step state: 1 = select agents, 2 = deployment target, 3 = credentials, 4 = deploying
    const [step, setStep] = useState(1);
    const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
    const [isDeploying, setIsDeploying] = useState(false);
    const [progress, setProgress] = useState("");

    // Credential values state
    const [credentialValues, setCredentialValues] = useState<Record<string, any>>({});
    const [workflowNames, setWorkflowNames] = useState<Record<string, string>>({}); // New: Store custom names

    // Deployment target config
    const [deploymentType, setDeploymentType] = useState<"your_instance" | "client_instance">("your_instance");
    const [n8nUrl, setN8nUrl] = useState("");
    const [n8nApiKey, setN8nApiKey] = useState("");
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

    // Filter available agents (active and not deleted)
    const availableAgents = agents?.filter(agent =>
        !agent.deletedAt && agent.isActive !== false
    ) || [];

    const handleTestConnection = async () => {
        if (!isValidUrl(n8nUrl)) {
            toast.error("Please enter a valid URL");
            return;
        }
        if (!n8nApiKey) {
            toast.error("Please enter an API key");
            return;
        }

        setConnectionStatus("testing");

        try {
            const result = await testConnectionAction({
                n8nUrl,
                n8nApiKey
            });

            if (result.success) {
                setConnectionStatus("success");
                toast.success("Successfully connected to n8n instance!");
            } else {
                setConnectionStatus("error");
                toast.error(`Connection failed: ${result.message}`);
            }
        } catch (error) {
            setConnectionStatus("error");
            toast.error("Failed to test connection");
            console.error(error);
        }
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (selectedAgentIds.length === 0) {
                toast.error("Please select at least one agent to deploy");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (deploymentType === "client_instance") {
                if (!isValidUrl(n8nUrl)) {
                    toast.error("Please enter a valid n8n URL");
                    return;
                }
                if (!n8nApiKey) {
                    toast.error("Please enter the n8n API key");
                    return;
                }
            }
            setStep(3); // Go to credential collection
        } else if (step === 3) {
            // Validate credentials before deploying
            const allCredentialsFilled = validateCredentials();
            if (!allCredentialsFilled) {
                toast.error("Please fill in all required credentials");
                return;
            }
            handleDeploy();
        }
    };

    const validateCredentials = () => {
        // Check all selected agents' credentials are filled
        for (const agentId of selectedAgentIds) {
            const agent = availableAgents.find(a => a._id === agentId);
            if (!agent) continue;

            // Check simple credentials
            for (const cred of agent.credentialSchema.simple) {
                for (let i = 0; i < cred.instances; i++) {
                    const key = `${agentId}_${cred.type}_${i}`;
                    const values = credentialValues[key];
                    if (!values) return false;

                    // Check required fields
                    for (const field of cred.fields) {
                        if (field.required && !values[field.name]) {
                            return false;
                        }
                    }
                }
            }

            // Check special credentials
            for (const cred of agent.credentialSchema.special) {
                for (let i = 0; i < cred.instances; i++) {
                    const key = `${agentId}_${cred.type}_${i}`;
                    const values = credentialValues[key];
                    if (!values) return false;

                    // Check required fields
                    for (const field of cred.fields) {
                        if (field.required && !values[field.name]) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    };

    const handleDeploy = async () => {
        setStep(4); // Updated to step 4 (deploying)
        setIsDeploying(true);
        const total = selectedAgentIds.length;
        let completed = 0;
        let errors: string[] = [];

        for (const agentId of selectedAgentIds) {
            const agent = availableAgents.find(a => a._id === agentId);
            const agentName = agent?.name || "Agent";

            try {
                setProgress(`Deploying ${agentName} (${completed + 1}/${total})...`);

                // Format credentials for this agent
                const formattedCredentials = [];
                if (agent) {
                    // Process simple credentials
                    for (const cred of agent.credentialSchema.simple) {
                        for (let i = 0; i < cred.instances; i++) {
                            const key = `${agentId}_${cred.type}_${i}`;
                            const values = credentialValues[key] || {};
                            formattedCredentials.push({
                                key: cred.type,
                                n8nCredentialId: "", // Will be set by deployment action
                                displayName: cred.displayName,
                                type: cred.type,
                                values: values,
                                status: "active" as const,
                                createdAt: Date.now(),
                            });
                        }
                    }

                    // Process special credentials
                    for (const cred of agent.credentialSchema.special) {
                        for (let i = 0; i < cred.instances; i++) {
                            const key = `${agentId}_${cred.type}_${i}`;
                            const values = credentialValues[key] || {};
                            formattedCredentials.push({
                                key: cred.keyword,
                                n8nCredentialId: "", // Will be set by deployment action
                                displayName: cred.displayName,
                                type: cred.type,
                                values: values,
                                status: "active" as const,
                                createdAt: Date.now(),
                            });
                        }
                    }
                }

                // Create deployment record with the selected deployment type
                const response = await createDeployment({
                    clientId,
                    agentId: agentId as Id<"agents">,
                    clientId,
                    agentId: agentId as Id<"agents">,
                    deploymentType: deploymentType,
                    workflowId: "",
                    workflowName: workflowNames[agentId] || `${agentName} - ${client?.name}`,
                    credentials: formattedCredentials,
                    // Pass n8n config for client_instance deployments
                    n8nUrl: deploymentType === "client_instance" ? n8nUrl : undefined,
                    n8nApiKey: deploymentType === "client_instance" ? n8nApiKey : undefined,
                }) as { deploymentId: Id<"deployments"> | null, error: string | null };

                if (response.error || !response.deploymentId) {
                    throw new Error(response.error || "Failed to create deployment record");
                }

                const deploymentId = response.deploymentId;

                // Trigger deployment action
                await deployAgentAction({ deploymentId });
                completed++;
            } catch (error) {
                console.error("Deployment error:", error);
                errors.push(`${agentName}: ${(error as Error).message}`);
            }
        }

        setIsDeploying(false);

        if (errors.length === 0) {
            toast.success(`Successfully deployed ${completed} agent(s)!`);
            router.push(`/clients/${id}`);
        } else if (completed > 0) {
            toast.warning(`Deployed ${completed} agent(s), but ${errors.length} failed.`);
            router.push(`/clients/${id}`);
        } else {
            // Show the specific error if available
            toast.error(errors[0] || "Deployment failed. Please try again.");
            setStep(2); // Go back to config step
        }
    };

    const toggleAgent = (agentId: string) => {
        setSelectedAgentIds(prev =>
            prev.includes(agentId)
                ? prev.filter(id => id !== agentId)
                : [...prev, agentId]
        );
    };

    if (!client || agents === undefined) {
        return (
            <div className="p-8 flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => step > 1 && !isDeploying ? setStep(step - 1) : router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Deploy Agent to {client.name}</h1>
                    <p className="text-muted-foreground">
                        Step {step} of 4: {step === 1 ? "Select Agents" : step === 2 ? "Deployment Target" : step === 3 ? "Collect Credentials" : "Deploying"}
                    </p>
                </div>
            </div>

            {/* Step 1: Agent Selection */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-600" />
                            Select Agents to Deploy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {availableAgents.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                                <p className="font-medium">No active agents available</p>
                                <p className="text-sm mt-1">Create an agent first or activate an existing one.</p>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => router.push("/agents/new")}
                                >
                                    Create Agent
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {availableAgents.map(agent => (
                                    <div
                                        key={agent._id}
                                        className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${selectedAgentIds.includes(agent._id)
                                            ? "border-primary bg-primary/5"
                                            : "hover:bg-gray-50"
                                            }`}
                                        onClick={() => toggleAgent(agent._id)}
                                    >
                                        <Checkbox
                                            checked={selectedAgentIds.includes(agent._id)}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <div className="font-medium">{agent.name}</div>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                                {agent.description || "No description"}
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                                                    {agent.credentialSchema.simple.length + agent.credentialSchema.special.length} credentials
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Deployment Target */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Server className="w-5 h-5 text-blue-600" />
                            Select Deployment Target
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Deployment Type Selection */}
                        <div className="grid gap-4">
                            <div
                                className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-3 transition-colors ${deploymentType === 'your_instance' ? 'border-primary bg-primary/5' : ''
                                    }`}
                                onClick={() => setDeploymentType('your_instance')}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${deploymentType === 'your_instance' ? 'border-primary' : 'border-gray-400'
                                    }`}>
                                    {deploymentType === 'your_instance' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Cloud className="w-4 h-4 text-primary" />
                                        <span className="font-medium">Deploy to Your Managed n8n Instance</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Use your centralized n8n instance. Best for managing multiple clients from one place.
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-3 transition-colors ${deploymentType === 'client_instance' ? 'border-primary bg-primary/5' : ''
                                    }`}
                                onClick={() => setDeploymentType('client_instance')}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${deploymentType === 'client_instance' ? 'border-primary' : 'border-gray-400'
                                    }`}>
                                    {deploymentType === 'client_instance' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <Server className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium">Deploy to Client's n8n Instance</span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Connect to the client's own n8n setup. Requires their API credentials.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Client Instance Configuration */}
                        {deploymentType === 'client_instance' && (
                            <div className="space-y-4 pt-4 border-t">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                    <Lock className="w-4 h-4" />
                                    Enter the client's n8n API credentials
                                </div>

                                <div className="space-y-2">
                                    <Label>n8n Instance URL</Label>
                                    <Input
                                        value={n8nUrl}
                                        onChange={e => setN8nUrl(e.target.value)}
                                        placeholder="https://client.app.n8n.cloud"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input
                                        type="password"
                                        value={n8nApiKey}
                                        onChange={e => setN8nApiKey(e.target.value)}
                                        placeholder="n8n_api_..."
                                    />
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={handleTestConnection}
                                    disabled={connectionStatus === "testing"}
                                    className="mt-2"
                                >
                                    {connectionStatus === "testing" ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : connectionStatus === "success" ? (
                                        <>
                                            <Check className="w-4 h-4 mr-2 text-green-600" />
                                            Connected
                                        </>
                                    ) : (
                                        "Test Connection"
                                    )}
                                </Button>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-gray-50 rounded-lg p-4 mt-4">
                            <h4 className="font-medium text-sm mb-2">Deployment Summary</h4>
                            <div className="text-sm text-muted-foreground space-y-1">
                                <p><span className="text-gray-700">Client:</span> {client.name}</p>
                                <p><span className="text-gray-700">Agents:</span> {selectedAgentIds.length} selected</p>
                                <p><span className="text-gray-700">Target:</span> {deploymentType === 'your_instance' ? 'Managed Instance' : 'Client Instance'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Collect Credentials */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600" />
                            Configure Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <p className="text-sm text-muted-foreground">
                            Enter the credential values for the selected agents. These will be securely stored and used when deploying the workflows.
                        </p>

                        {selectedAgentIds.map(agentId => {
                            const agent = availableAgents.find(a => a._id === agentId);
                            if (!agent) return null;

                            const allCredentials = [
                                ...agent.credentialSchema.simple.map(c => ({ ...c, isSpecial: false })),
                                ...agent.credentialSchema.special.map(c => ({ ...c, isSpecial: true }))
                            ];

                            if (allCredentials.length === 0) return null;

                            return (
                                <div key={agentId} className="border rounded-lg p-4 space-y-4">
                                    <h4 className="font-medium text-sm flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-blue-600" />
                                        {agent.name}
                                    </h4>

                                    {/* Workflow Name Configuration */}
                                    <div className="bg-white border rounded-lg p-4 space-y-2">
                                        <Label>Workflow Name</Label>
                                        <Input
                                            value={workflowNames[agentId] || `${agent.name} - ${client?.name}`}
                                            onChange={(e) => setWorkflowNames(prev => ({
                                                ...prev,
                                                [agentId]: e.target.value
                                            }))}
                                            placeholder="e.g. My Agent Workflow"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This name will be used for the workflow in n8n.
                                        </p>
                                    </div>

                                    {allCredentials.map((cred, credIndex) => {
                                        const instances = [];
                                        for (let i = 0; i < cred.instances; i++) {
                                            instances.push(i);
                                        }

                                        return instances.map(instanceIndex => {
                                            const key = `${agentId}_${cred.type}_${instanceIndex}`;
                                            const values = credentialValues[key] || {};

                                            return (
                                                <div key={key} className="bg-gray-50 rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {cred.displayName}
                                                            {instances.length > 1 && ` #${instanceIndex + 1}`}
                                                        </span>
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                            {cred.type}
                                                        </span>
                                                    </div>

                                                    {cred.fields.map(field => (
                                                        <div key={field.name} className="space-y-1.5">
                                                            <Label className="text-xs">
                                                                {field.label}
                                                                {field.required && <span className="text-red-500 ml-1">*</span>}
                                                            </Label>
                                                            <Input
                                                                type={field.type === "password" ? "password" : "text"}
                                                                value={values[field.name] || field.default || ""}
                                                                onChange={(e) => {
                                                                    setCredentialValues(prev => ({
                                                                        ...prev,
                                                                        [key]: {
                                                                            ...prev[key],
                                                                            [field.name]: e.target.value
                                                                        }
                                                                    }));
                                                                }}
                                                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                                                className="h-9 text-sm"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        });
                                    })}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Deployment Progress */}
            {step === 4 && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="py-8">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                            <div className="text-center">
                                <p className="font-medium text-blue-900 text-lg">{progress}</p>
                                <p className="text-sm text-blue-700 mt-1">Please wait while we configure the workflows...</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            {step !== 4 && (
                <div className="flex justify-between items-center pt-4">
                    <Button variant="ghost" onClick={() => router.back()} disabled={isDeploying}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleNextStep}
                        disabled={isDeploying || (step === 1 && selectedAgentIds.length === 0)}
                        className="min-w-[140px]"
                    >
                        {step === 1 || step === 2 ? (
                            <>
                                Next
                                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Deploy ({selectedAgentIds.length})
                            </>
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}
