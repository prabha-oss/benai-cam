"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Users, Server, Zap, Lock, Loader2 } from "lucide-react";
import { isValidUrl } from "@/lib/utils";

export default function NewClientPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedAgentId = searchParams.get('agentId');

    const createClient = useMutation(api.clients.create);
    const agents = useQuery(api.agents.list);

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Client Info
    const [clientData, setClientData] = useState({
        name: "",
        email: "",
        company: "",
        status: "active" as const
    });

    // Step 2: Deployment Config
    const [deployConfig, setDeployConfig] = useState({
        type: "your_instance" as "your_instance" | "client_instance",
        n8nUrl: "",
        n8nApiKey: ""
    });
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // Step 3: Agent Selection
    const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(preSelectedAgentId ? [preSelectedAgentId] : []);

    // Step 4: Credentials (Placeholder structure for now)
    const [credentials, setCredentials] = useState<Record<string, any>>({});

    const handleNext = async () => {
        if (step === 1) {
            if (!clientData.name || !clientData.email || !clientData.company) {
                return toast.error("Please fill in all required fields");
            }
            setStep(2);
        } else if (step === 2) {
            if (deployConfig.type === 'client_instance') {
                if (!isValidUrl(deployConfig.n8nUrl)) return toast.error("Invalid URL");
                if (!deployConfig.n8nApiKey) return toast.error("API Key required");

                // Mock connection test
                setConnectionStatus('testing');
                setTimeout(() => {
                    setConnectionStatus('success');
                    toast.success("Connected to n8n instance!");
                    setStep(3);
                }, 1500);
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (selectedAgentIds.length === 0) return toast.error("Select at least one agent");
            setStep(4);
        } else if (step === 4) {
            setStep(5);
        }
    };

    const handleDeploy = async () => {
        setIsSubmitting(true);
        try {
            // 1. Create Client
            const clientId = await createClient({
                ...clientData,
                deploymentType: deployConfig.type,
                n8nInstanceUrl: deployConfig.type === 'client_instance' ? deployConfig.n8nUrl : undefined,
                n8nApiKey: deployConfig.type === 'client_instance' ? deployConfig.n8nApiKey : undefined,
            });

            // 2. Mock Agent Deployment (real logic would go here)
            // await deployAgents({...})

            toast.success("Client onboarded and deployments started!");
            router.push(`/clients`); // Go to client list for now, ideally dashboard
        } catch (e) {
            toast.error(`Deployment failed: ${(e as Error).message}`);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="mb-8">
                <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="mb-4 pl-0">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {step > 1 ? "Back" : "Back to Clients"}
                </Button>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold">Onboard New Client</h1>
                        <p className="text-muted-foreground">Step {step} of 5</p>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Form Area */}
                <div className="md:col-span-2">
                    <Card>
                        <CardContent className="pt-6 min-h-[400px]">
                            {step === 1 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <Users className="w-6 h-6" />
                                        <h3 className="text-lg font-semibold">Client Information</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Client Name *</Label>
                                        <Input value={clientData.name} onChange={e => setClientData({ ...clientData, name: e.target.value })} placeholder="Acme Corp" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email *</Label>
                                        <Input value={clientData.email} onChange={e => setClientData({ ...clientData, email: e.target.value })} placeholder="contact@acme.com" type="email" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Company *</Label>
                                        <Input value={clientData.company} onChange={e => setClientData({ ...clientData, company: e.target.value })} placeholder="Acme Inc." />
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <Server className="w-6 h-6" />
                                        <h3 className="text-lg font-semibold">Deployment Target</h3>
                                    </div>

                                    <div className="grid gap-4">
                                        <div
                                            className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-3 ${deployConfig.type === 'your_instance' ? 'border-primary bg-primary/5' : ''}`}
                                            onClick={() => setDeployConfig({ ...deployConfig, type: 'your_instance' })}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${deployConfig.type === 'your_instance' ? 'border-primary' : 'border-gray-400'}`}>
                                                {deployConfig.type === 'your_instance' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                            </div>
                                            <div>
                                                <div className="font-medium">Deploy to your managed n8n instance</div>
                                                <div className="text-sm text-gray-500">Client uses your infrastructure. Easiest for SMBs.</div>
                                            </div>
                                        </div>

                                        <div
                                            className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 flex items-start gap-3 ${deployConfig.type === 'client_instance' ? 'border-primary bg-primary/5' : ''}`}
                                            onClick={() => setDeployConfig({ ...deployConfig, type: 'client_instance' })}
                                        >
                                            <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${deployConfig.type === 'client_instance' ? 'border-primary' : 'border-gray-400'}`}>
                                                {deployConfig.type === 'client_instance' && <div className="w-2 h-2 rounded-full bg-primary" />}
                                            </div>
                                            <div>
                                                <div className="font-medium">Deploy to client's n8n instance</div>
                                                <div className="text-sm text-gray-500">Connect to their existing n8n setup via API.</div>
                                            </div>
                                        </div>
                                    </div>

                                    {deployConfig.type === 'client_instance' && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <div className="space-y-2">
                                                <Label>n8n Instance URL</Label>
                                                <Input value={deployConfig.n8nUrl} onChange={e => setDeployConfig({ ...deployConfig, n8nUrl: e.target.value })} placeholder="https://acme.app.n8n.cloud" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>API Key</Label>
                                                <Input type="password" value={deployConfig.n8nApiKey} onChange={e => setDeployConfig({ ...deployConfig, n8nApiKey: e.target.value })} placeholder="n8n_api_..." />
                                            </div>
                                            {connectionStatus === 'testing' && <div className="text-sm text-blue-600 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Testing connection...</div>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <Zap className="w-6 h-6" />
                                        <h3 className="text-lg font-semibold">Select Agents</h3>
                                    </div>

                                    {!agents ? (
                                        <div className="p-8 text-center">Loading agents...</div>
                                    ) : agents.length === 0 ? (
                                        <div className="p-8 text-center border dashed rounded text-muted-foreground">No agents found. Create one first!</div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {agents.map(agent => (
                                                <div
                                                    key={agent._id}
                                                    className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                                                    onClick={() => {
                                                        const newSet = new Set(selectedAgentIds);
                                                        if (newSet.has(agent._id)) newSet.delete(agent._id);
                                                        else newSet.add(agent._id);
                                                        setSelectedAgentIds(Array.from(newSet));
                                                    }}
                                                >
                                                    <Checkbox checked={selectedAgentIds.includes(agent._id)} />
                                                    <div className="flex-1">
                                                        <div className="font-medium">{agent.name}</div>
                                                        <div className="text-xs text-muted-foreground mt-1 truncate">{agent.description}</div>
                                                        <div className="mt-2 text-xs bg-gray-100 inline-block px-2 py-1 rounded text-gray-600">
                                                            {(agent.credentialSchema.simple.length + agent.credentialSchema.special.length)} credentials required
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <Lock className="w-6 h-6" />
                                        <h3 className="text-lg font-semibold">Configure Credentials</h3>
                                    </div>

                                    <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-sm text-yellow-800 mb-6">
                                        <p><strong>Note:</strong> In this MVP version, credential collection is skipped. </p>
                                        <p className="mt-1">In a real deployment, we would generate a dynamic form here based on the {selectedAgentIds.length} selected agents' schemas.</p>
                                    </div>

                                    <div className="text-center py-12 text-muted-foreground">
                                        Credentials will be configured post-deployment in this version.
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-2 mb-6 text-primary">
                                        <Check className="w-6 h-6" />
                                        <h3 className="text-lg font-semibold">Review & Deploy</h3>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg space-y-4 text-sm">
                                        <div className="grid grid-cols-2 gap-2">
                                            <span className="text-muted-foreground">Client:</span>
                                            <span className="font-medium">{clientData.name}</span>

                                            <span className="text-muted-foreground">Target:</span>
                                            <span className="font-medium">{deployConfig.type === 'your_instance' ? 'Managed Instance' : 'Client Instance'}</span>

                                            <span className="text-muted-foreground">Agents:</span>
                                            <span className="font-medium">{selectedAgentIds.length} selected</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-100">
                                        <Loader2 className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                                        {isSubmitting ? "Deploying workflows..." : "Ready to deploy."}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-between mt-6">
                        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
                        <Button onClick={step === 5 ? handleDeploy : handleNext} disabled={isSubmitting}>
                            {step === 5 ? (isSubmitting ? "Deploying..." : "Confirm & Deploy") : "Next Step"}
                            {step < 5 && <ArrowRight className="w-4 h-4 ml-2" />}
                        </Button>
                    </div>
                </div>

                {/* Sidebar Summary */}
                <div className="hidden md:block">
                    <Card className="bg-gray-50/50 sticky top-6">
                        <CardContent className="pt-6 space-y-4">
                            <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Summary</h4>

                            <div className={`space-y-1 transition-opacity ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}>
                                <div className="text-xs font-semibold text-gray-500">Client</div>
                                <div className="text-sm font-medium">{clientData.name || "-"}</div>
                            </div>

                            <div className={`space-y-1 transition-opacity ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}>
                                <div className="text-xs font-semibold text-gray-500">Strategy</div>
                                <div className="text-sm font-medium">{deployConfig.type === 'your_instance' ? 'Managed' : 'External'}</div>
                            </div>

                            <div className={`space-y-1 transition-opacity ${step >= 3 ? 'opacity-100' : 'opacity-30'}`}>
                                <div className="text-xs font-semibold text-gray-500">Agents</div>
                                <div className="text-sm font-medium">{selectedAgentIds.length} selected</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
