"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Server, Pencil, Loader2, AlertTriangle, CheckCircle, Edit } from "lucide-react";
import { toast } from "sonner";
import { encryptCredential, getEncryptionSecret } from "@/lib/crypto";

export default function DeploymentManagePage({ params }: { params: Promise<{ id: string; deploymentId: string }> }) {
    const router = useRouter();
    const { id, deploymentId } = use(params);
    const clientId = id as Id<"clients">;
    const depId = deploymentId as Id<"deployments">;

    const client = useQuery(api.clients.get, { id: clientId });
    const deployment = useQuery(api.deployments.get, { id: depId });
    const updateCredentials = useMutation(api.deployments.updateCredentials);

    const [editMode, setEditMode] = useState<Record<number, boolean>>({});
    const [updatedCredentialValues, setUpdatedCredentialValues] = useState<Record<string, any>>({});
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSaveCredentials = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmCredentialUpdate = async () => {
        if (!deployment) return;

        try {
            setIsSubmitting(true);
            const secret = getEncryptionSecret();

            // Encrypt and update credentials
            const updatedCredentials = await Promise.all(
                deployment.credentials.map(async (cred: any, index: number) => {
                    if (updatedCredentialValues[index]) {
                        // Encrypt the new credential value
                        const encryptedValue = await encryptCredential(updatedCredentialValues[index], secret);
                        return {
                            ...cred,
                            encryptedValue,
                            status: "active" as const,
                        };
                    }
                    return cred;
                })
            );

            await updateCredentials({
                id: depId,
                credentials: updatedCredentials,
            });

            toast.success("Credentials updated successfully");
            setShowConfirmDialog(false);
            setEditMode({}); // Reset all edit modes
            setUpdatedCredentialValues({});
        } catch (error: any) {
            toast.error(error.message || "Failed to update credentials");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!client || !deployment) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            {/* Breadcrumb Navigation */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <button
                        onClick={() => router.push("/clients")}
                        className="hover:text-primary transition-colors"
                    >
                        Clients
                    </button>
                    <span>→</span>
                    <button
                        onClick={() => router.push(`/clients/${id}`)}
                        className="hover:text-primary transition-colors"
                    >
                        {client.name}
                    </button>
                    <span>→</span>
                    <span className="text-foreground font-medium">Deployment</span>
                </div>
            </div>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.push(`/clients/${id}`)}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Deployment</h1>
                    <p className="text-muted-foreground">{deployment.agentName}</p>
                </div>
            </div>

            <div className="max-w-4xl space-y-6">
                {/* Deployment Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Deployment Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-sm text-muted-foreground">Agent:</span>
                                <p className="font-medium">{deployment.agentName}</p>
                            </div>
                            <div>
                                <span className="text-sm text-muted-foreground">Status:</span>
                                <div className="flex items-center gap-2 mt-1">
                                    {deployment.status === "deployed" && (
                                        <div className="flex items-center gap-1.5 text-sm text-green-700">
                                            <CheckCircle className="w-4 h-4" />
                                            Healthy
                                        </div>
                                    )}
                                    {deployment.status === "paused" && (
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <span className="w-2 h-2 bg-gray-400 rounded-full" />
                                            Paused
                                        </div>
                                    )}
                                    {deployment.status === "deploying" && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-1.5 text-sm text-blue-600">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Deploying...
                                            </div>
                                            {deployment.deploymentProgress && (
                                                <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                                                    <p className="text-sm text-blue-700 font-medium">
                                                        {deployment.deploymentProgress.message || deployment.deploymentProgress.stage}
                                                    </p>
                                                    {deployment.deploymentProgress.progress >= 0 && (
                                                        <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-blue-500 transition-all duration-300"
                                                                style={{ width: `${deployment.deploymentProgress.progress}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                    {deployment.deploymentProgress.details && (
                                                        <p className="text-xs text-blue-600">
                                                            {deployment.deploymentProgress.details}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {deployment.status === "failed" && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-1.5 text-sm text-red-600">
                                                <AlertTriangle className="w-4 h-4" />
                                                Failed
                                            </div>
                                            {deployment.deploymentError && (
                                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2 max-w-md">
                                                    <p className="text-sm text-red-700">
                                                        {deployment.deploymentError}
                                                    </p>
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            onClick={() => router.push(`/clients/${id}/deploy`)}
                                                            className="text-xs text-red-600 hover:text-red-800 underline"
                                                        >
                                                            Retry Deployment
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <span className="text-sm text-muted-foreground">Workflow:</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="font-medium text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                        {deployment.workflowId || "N/A"}
                                    </p>
                                    {deployment.workflowUrl && (
                                        <a
                                            href={deployment.workflowUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline text-xs flex items-center gap-1"
                                        >
                                            Open in n8n
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-sm text-muted-foreground">Deployed:</span>
                                <p className="font-medium text-sm">
                                    {deployment.deployedAt ? new Date(deployment.deployedAt).toLocaleDateString() + ' ' + new Date(deployment.deployedAt).toLocaleTimeString() : 'Pending'}
                                </p>
                            </div>
                            {deployment.n8nInstanceUrl && (
                                <div className="col-span-2">
                                    <span className="text-sm text-muted-foreground">n8n Instance:</span>
                                    <p className="font-medium text-sm text-blue-600 truncate">
                                        <a href={deployment.n8nInstanceUrl} target="_blank" rel="noopener noreferrer">
                                            {deployment.n8nInstanceUrl}
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Credentials Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Server className="w-5 h-5 text-blue-600" />
                            Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {deployment.credentials && deployment.credentials.length > 0 ? (
                            <div className="space-y-3">
                                {deployment.credentials.map((cred: any, index: number) => (
                                    <div key={index} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm">{cred.displayName}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                        {cred.type}
                                                    </span>
                                                    {cred.status === "active" && !editMode[index] && (
                                                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                                {!editMode[index] && (
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                        ••••••••••••
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setEditMode(prev => ({
                                                        ...prev,
                                                        [index]: !prev[index]
                                                    }));
                                                    if (editMode[index]) {
                                                        // Clear the value when exiting edit mode
                                                        const { [index]: removed, ...rest } = updatedCredentialValues;
                                                        setUpdatedCredentialValues(rest);
                                                    }
                                                }}
                                            >
                                                {editMode[index] ? (
                                                    <span className="text-xs">Cancel</span>
                                                ) : (
                                                    <>
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        <span className="text-xs">Edit</span>
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        {/* Edit Form - Only shown when in edit mode */}
                                        {editMode[index] && (
                                            <div className="space-y-3 pt-3 border-t">
                                                <p className="text-sm text-muted-foreground">
                                                    Enter new credential value:
                                                </p>
                                                <Input
                                                    type="password"
                                                    placeholder="Enter new credential value"
                                                    value={updatedCredentialValues[index] || ""}
                                                    onChange={(e) => {
                                                        setUpdatedCredentialValues(prev => ({
                                                            ...prev,
                                                            [index]: e.target.value
                                                        }));
                                                    }}
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">No credentials configured</p>
                        )}

                        {/* Action Buttons */}
                        {deployment.credentials && deployment.credentials.length > 0 && (
                            <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/clients/${id}`)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveCredentials}
                                    disabled={isSubmitting || Object.keys(updatedCredentialValues).length === 0}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Confirm Credential Update</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    You're changing the credentials for this deployment. This may affect the workflow's functionality. Are you sure you want to proceed?
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowConfirmDialog(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmCredentialUpdate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Confirm"
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
