"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Upload, AlertCircle, Loader2, Search, Workflow, RefreshCw } from "lucide-react";
import { extractCredentials, CredentialSchema } from "@/lib/agents/credentialExtractor";

interface N8nWorkflow {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function NewAgentPage() {
    const router = useRouter();
    const createAgent = useMutation(api.agents.create);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        templateJSON: "",
    });

    const [jsonError, setJsonError] = useState<string | null>(null);
    const [parsedSchema, setParsedSchema] = useState<CredentialSchema | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // n8n workflow selector state
    const [inputMode, setInputMode] = useState<"paste" | "n8n">("n8n");
    const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
    const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
    const [workflowError, setWorkflowError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [isLoadingWorkflowJson, setIsLoadingWorkflowJson] = useState(false);

    // Fetch workflows when component mounts or when switching to n8n mode
    useEffect(() => {
        if (inputMode === "n8n" && step === 2 && workflows.length === 0) {
            fetchWorkflows();
        }
    }, [inputMode, step]);

    const fetchWorkflows = async () => {
        setIsLoadingWorkflows(true);
        setWorkflowError(null);

        try {
            const response = await fetch("/api/n8n/workflows");
            const data = await response.json();

            if (response.ok) {
                setWorkflows(data.workflows || []);
            } else {
                setWorkflowError(data.error || "Failed to fetch workflows");
            }
        } catch (error: any) {
            setWorkflowError(error.message);
        } finally {
            setIsLoadingWorkflows(false);
        }
    };

    const selectWorkflow = async (workflowId: string) => {
        setSelectedWorkflowId(workflowId);
        setIsLoadingWorkflowJson(true);

        try {
            const response = await fetch(`/api/n8n/workflows?id=${workflowId}`);
            const data = await response.json();

            if (response.ok && data.workflow) {
                setFormData({
                    ...formData,
                    templateJSON: JSON.stringify(data.workflow, null, 2),
                });
                setJsonError(null);
            } else {
                toast.error(data.error || "Failed to fetch workflow details");
                setSelectedWorkflowId(null);
            }
        } catch (error: any) {
            toast.error(error.message);
            setSelectedWorkflowId(null);
        } finally {
            setIsLoadingWorkflowJson(false);
        }
    };

    const filteredWorkflows = workflows.filter(wf =>
        wf.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNext = async () => {
        if (step === 1) {
            if (!formData.name) return toast.error("Agent name is required");
            setStep(2);
        } else if (step === 2) {
            if (!formData.templateJSON) return toast.error("Template JSON is required");

            try {
                const json = JSON.parse(formData.templateJSON);
                const schema = extractCredentials(json);
                setParsedSchema(schema);
                setJsonError(null);
                setStep(3);
            } catch (e) {
                setJsonError((e as Error).message);
                toast.error("Invalid JSON format");
            }
        } else if (step === 3) {
            setStep(4);
        }
    };

    const handleCreate = async () => {
        if (!parsedSchema) return;

        setIsSubmitting(true);
        try {
            await createAgent({
                name: formData.name,
                description: formData.description,
                templateJSON: JSON.parse(formData.templateJSON),
                credentialSchema: parsedSchema,
                manualCredentials: [],
            });

            toast.success("Agent created successfully!");
            router.push("/agents");
        } catch (e) {
            toast.error(`Failed to create agent: ${(e as Error).message}`);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-12 px-6">
            <div className="mb-8">
                <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    {step > 1 ? "Back" : "Back to Agents"}
                </Button>
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold">Create New Agent</h1>
                        <p className="text-muted-foreground">Step {step} of 4</p>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Agent Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g. SEO Agent"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">A unique name to identify this agent template.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe what this agent does..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Mode Toggle */}
                            <div className="flex gap-4 mb-4">
                                <Button
                                    type="button"
                                    variant={inputMode === "n8n" ? "default" : "outline"}
                                    onClick={() => setInputMode("n8n")}
                                    className="flex-1"
                                >
                                    <Workflow className="w-4 h-4 mr-2" />
                                    Select from n8n
                                </Button>
                                <Button
                                    type="button"
                                    variant={inputMode === "paste" ? "default" : "outline"}
                                    onClick={() => setInputMode("paste")}
                                    className="flex-1"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Paste JSON
                                </Button>
                            </div>

                            {inputMode === "n8n" && (
                                <div className="space-y-4">
                                    {/* Search and Refresh */}
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search workflows..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={fetchWorkflows}
                                            disabled={isLoadingWorkflows}
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isLoadingWorkflows ? "animate-spin" : ""}`} />
                                        </Button>
                                    </div>

                                    {/* Workflow List */}
                                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                                        {isLoadingWorkflows ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                                <span className="ml-2 text-muted-foreground">Loading workflows...</span>
                                            </div>
                                        ) : workflowError ? (
                                            <div className="p-4 text-center">
                                                <AlertCircle className="w-8 h-8 mx-auto text-destructive mb-2" />
                                                <p className="text-sm text-destructive">{workflowError}</p>
                                                <Button variant="link" onClick={fetchWorkflows} className="mt-2">
                                                    Try Again
                                                </Button>
                                            </div>
                                        ) : filteredWorkflows.length === 0 ? (
                                            <div className="p-4 text-center text-muted-foreground">
                                                {searchQuery ? "No workflows match your search" : "No workflows found"}
                                            </div>
                                        ) : (
                                            filteredWorkflows.map((wf) => (
                                                <div
                                                    key={wf.id}
                                                    className={`flex items-center justify-between p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${selectedWorkflowId === wf.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                                                        }`}
                                                    onClick={() => selectWorkflow(wf.id)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {selectedWorkflowId === wf.id && isLoadingWorkflowJson ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                                        ) : selectedWorkflowId === wf.id ? (
                                                            <Check className="w-4 h-4 text-primary" />
                                                        ) : (
                                                            <Workflow className="w-4 h-4 text-muted-foreground" />
                                                        )}
                                                        <span className="font-medium text-sm">{wf.name}</span>
                                                    </div>
                                                    <span className={`text-xs px-2 py-1 rounded-full ${wf.active
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-gray-100 text-gray-600"
                                                        }`}>
                                                        {wf.active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Show loaded JSON preview */}
                                    {formData.templateJSON && selectedWorkflowId && (
                                        <div className="space-y-2">
                                            <Label>Loaded Workflow JSON</Label>
                                            <Textarea
                                                className="font-mono text-xs bg-gray-50"
                                                value={formData.templateJSON}
                                                readOnly
                                                rows={6}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {inputMode === "paste" && (
                                <div className="space-y-2">
                                    <Label>Template Workflow JSON *</Label>
                                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                        <p className="text-sm text-gray-600">Paste your n8n workflow JSON below</p>
                                    </div>

                                    <Textarea
                                        className="font-mono text-xs"
                                        placeholder='{ "nodes": [...], "connections": {...} }'
                                        value={formData.templateJSON}
                                        onChange={(e) => setFormData({ ...formData, templateJSON: e.target.value })}
                                        rows={12}
                                    />
                                    {jsonError && (
                                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            {jsonError}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && parsedSchema && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-medium mb-4">Detected Credentials</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    The following credentials were found in your workflow. Review how they will be matched.
                                </p>

                                {parsedSchema.simple.length > 0 && (
                                    <div className="space-y-4 mb-6">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Simple Match (One-to-All)</h4>
                                        {parsedSchema.simple.map((cred) => (
                                            <div key={cred.type} className="flex items-start gap-3 p-3 border rounded-md bg-gray-50">
                                                <Checkbox checked disabled />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium text-sm">{cred.displayName}</span>
                                                        <span className="text-xs bg-white border px-2 py-0.5 rounded-full text-gray-600">
                                                            {cred.instances} instances
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">Type: {cred.type}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {parsedSchema.special.length > 0 && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Special Match (By Keyword)</h4>
                                        {parsedSchema.special.map((cred) => (
                                            <div key={`${cred.type}-${cred.keyword}`} className="flex items-start gap-3 p-3 border rounded-md bg-amber-50 border-amber-200">
                                                <Checkbox checked disabled />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium text-sm">{cred.displayName}</span>
                                                        <span className="text-xs bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full text-amber-700">
                                                            keyword: {cred.keyword}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">Type: {cred.type} • {cred.instances} instances</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {parsedSchema.simple.length === 0 && parsedSchema.special.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                        <p>No credentials detected in this workflow.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6">
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2">Ready to Create Agent</h3>
                                <p className="text-muted-foreground">Review the details below and create your agent.</p>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-medium">{formData.name}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Description</span>
                                    <span className="font-medium text-right max-w-xs truncate">
                                        {formData.description || "—"}
                                    </span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-muted-foreground">Credentials</span>
                                    <span className="font-medium">
                                        {parsedSchema ? parsedSchema.simple.length + parsedSchema.special.length : 0} detected
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-end mt-8 gap-3">
                        {step < 4 ? (
                            <Button onClick={handleNext} disabled={
                                (step === 1 && !formData.name) ||
                                (step === 2 && !formData.templateJSON)
                            }>
                                Next
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={handleCreate} disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Create Agent
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
