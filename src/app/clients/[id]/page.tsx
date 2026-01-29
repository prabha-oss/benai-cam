"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Server, Zap, CheckCircle, AlertTriangle, Settings, Edit, Trash2, X, Loader2, Pencil, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function ClientDashboardPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const clientId = id as Id<"clients">;

    const client = useQuery(api.clients.get, { id: clientId });
    const deployments = useQuery(api.deployments.getByClient, { clientId });
    const updateClient = useMutation(api.clients.update);
    const archiveClient = useMutation(api.clients.archive);
    const toggleDeployment = useMutation(api.deployments.toggleActive);
    const updateCredentials = useMutation(api.deployments.updateCredentials);

    // UI State
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Deployment management state
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedDeployment, setSelectedDeployment] = useState<any>(null);
    const [editingCredentialIndex, setEditingCredentialIndex] = useState<number | null>(null);
    const [updatedCredentialValues, setUpdatedCredentialValues] = useState<Record<string, any>>({});
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        company: ""
    });

    // Initialize form when client loads
    useEffect(() => {
        if (client) {
            setEditForm({
                name: client.name,
                email: client.email,
                company: client.company
            });
        }
    }, [client]);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowSettingsMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleUpdate = async () => {
        if (!editForm.name.trim() || !editForm.email.trim() || !editForm.company.trim()) {
            return toast.error("All fields are required");
        }

        setIsSubmitting(true);
        try {
            await updateClient({
                id: clientId,
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                company: editForm.company.trim()
            });
            toast.success("Client updated successfully");
            setShowEditModal(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update client");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await archiveClient({ id: clientId });
            toast.success("Client archived successfully");
            router.push("/clients");
        } catch (error: any) {
            toast.error(error.message || "Failed to archive client");
            setIsSubmitting(false);
        }
    };

    const handleToggleDeployment = async (deploymentId: Id<"deployments">, currentStatus: string) => {
        try {
            const newStatus = await toggleDeployment({ id: deploymentId });
            toast.success(newStatus === "deployed" ? "Deployment activated" : "Deployment paused");
        } catch (error: any) {
            toast.error(error.message || "Failed to toggle deployment");
        }
    };

    const handleOpenManage = (deployment: any) => {
        setSelectedDeployment(deployment);
        setEditingCredentialIndex(null);
        setUpdatedCredentialValues({});
        setShowManageModal(true);
    };

    const handleSaveCredentials = () => {
        setShowConfirmDialog(true);
    };

    const handleConfirmCredentialUpdate = async () => {
        if (!selectedDeployment) return;

        try {
            setIsSubmitting(true);
            // Update the credentials with the modified values
            const updatedCredentials = selectedDeployment.credentials.map((cred: any, index: number) => {
                if (updatedCredentialValues[index]) {
                    return {
                        ...cred,
                        // Note: We're not storing actual credential values on the client
                        // This is just for demonstration - in production, values would be encrypted
                        status: "active" as const,
                    };
                }
                return cred;
            });

            await updateCredentials({
                id: selectedDeployment._id,
                credentials: updatedCredentials,
            });

            toast.success("Credentials updated successfully");
            setShowConfirmDialog(false);
            setShowManageModal(false);
            setEditingCredentialIndex(null);
            setUpdatedCredentialValues({});
        } catch (error: any) {
            toast.error(error.message || "Failed to update credentials");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!client || deployments === undefined) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Edit className="w-5 h-5" />
                                Edit Client
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setShowEditModal(false)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Company</Label>
                                <Input
                                    value={editForm.company}
                                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowEditModal(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleUpdate} disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-red-600 flex items-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Archive Client
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Are you sure you want to archive <strong>"{client.name}"</strong>?
                                This will deactivate all their deployments.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Archiving...</>
                                    ) : (
                                        <><Trash2 className="w-4 h-4 mr-2" />Archive Client</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${client.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-700'
                            }`}>
                            {client.status.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-muted-foreground">{client.company} • {client.email}</p>
                </div>
                <div className="flex gap-2">
                    {/* Settings Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <Button
                            variant="outline"
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>

                        {showSettingsMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-border/50 py-2 z-50">
                                <button
                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-muted transition-colors"
                                    onClick={() => {
                                        setShowEditModal(true);
                                        setShowSettingsMenu(false);
                                    }}
                                >
                                    <Edit className="w-4 h-4 text-muted-foreground" />
                                    Edit Client
                                </button>
                                <button
                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
                                    onClick={() => {
                                        setShowDeleteConfirm(true);
                                        setShowSettingsMenu(false);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Archive Client
                                </button>
                            </div>
                        )}
                    </div>

                    <Button onClick={() => router.push(`/clients/${id}/deploy`)}>
                        <Zap className="w-4 h-4 mr-2" />
                        Deploy New Agent
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Total Deployments</div>
                        <div className="text-2xl font-bold mt-1">{deployments.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Healthy Workflows</div>
                        <div className="text-2xl font-bold mt-1">{deployments.filter(d => d.health.isHealthy).length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Infrastructure</div>
                        <div className="text-lg font-semibold mt-1 flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            {client.deploymentType === 'your_instance' ? 'Managed' : 'External'}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Created</div>
                        <div className="text-lg font-semibold mt-1">
                            {new Date(client.createdAt).toLocaleDateString()}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Active Deployments</h3>

                {deployments.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                        <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-muted-foreground mb-4">No agents deployed to this client yet.</p>
                        <Button variant="outline" onClick={() => router.push(`/clients/${id}/deploy`)}>
                            <Zap className="w-4 h-4 mr-2" />
                            Deploy First Agent
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {deployments.map(d => (
                            <Card key={d._id}>
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{d.agentName}</h4>
                                            <div className="text-sm text-gray-500 flex items-center gap-2">
                                                <span>ID: {d.workflowId || "Pending"}</span>
                                                <span>•</span>
                                                <span>Deployed {new Date(d.deployedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            {d.status === "deploying" ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Deploying
                                                    </div>
                                                    {d.deploymentProgress && (
                                                        <div className="flex flex-col items-end gap-0.5">
                                                            <span className="text-xs text-blue-600">
                                                                {d.deploymentProgress.message || d.deploymentProgress.stage}
                                                            </span>
                                                            {d.deploymentProgress.progress >= 0 && (
                                                                <div className="w-24 h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-blue-500 transition-all duration-300"
                                                                        style={{ width: `${d.deploymentProgress.progress}%` }}
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : d.status === "failed" ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        Failed
                                                    </div>
                                                    {d.deploymentError && (
                                                        <span className="text-xs text-red-500 max-w-[200px] truncate" title={d.deploymentError}>
                                                            {d.deploymentError}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : d.status === "paused" ? (
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-full">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                                                    Paused
                                                </div>
                                            ) : d.health.isHealthy ? (
                                                <div className="flex items-center gap-1.5 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Healthy
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Issues Detected
                                                </div>
                                            )}
                                        </div>

                                        {/* Toggle Switch */}
                                        <div className="flex items-center gap-3">
                                            <Switch
                                                checked={d.status === "deployed"}
                                                onCheckedChange={() => handleToggleDeployment(d._id, d.status)}
                                                disabled={d.status === "deploying" || d.status === "failed"}
                                            />
                                            <span className="text-sm text-muted-foreground">
                                                {d.status === "deployed" ? "Active" : d.status === "paused" ? "Inactive" : ""}
                                            </span>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => router.push(`/clients/${id}/deployments/${d._id}`)}
                                        >
                                            Manage
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Deployment Management Modal */}
            {showManageModal && selectedDeployment && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b sticky top-0 bg-white">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Manage Deployment</h2>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setShowManageModal(false)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Deployment Info */}
                            <div className="space-y-2">
                                <h3 className="font-medium text-sm text-muted-foreground">Deployment Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-muted-foreground">Agent:</span>
                                        <p className="font-medium">{selectedDeployment.agentName}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">Status:</span>
                                        <p className="font-medium capitalize">{selectedDeployment.status}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">Workflow ID:</span>
                                        <p className="font-medium text-xs">{selectedDeployment.workflowId || "N/A"}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground">Deployed:</span>
                                        <p className="font-medium text-sm">
                                            {new Date(selectedDeployment.deployedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Credentials Section */}
                            <div className="space-y-3">
                                <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                                    <Server className="w-4 h-4" />
                                    Credentials
                                </h3>

                                {selectedDeployment.credentials && selectedDeployment.credentials.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedDeployment.credentials.map((cred: any, index: number) => (
                                            <div key={index} className="border rounded-lg p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-sm">{cred.displayName}</span>
                                                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                                {cred.type}
                                                            </span>
                                                        </div>
                                                        {editingCredentialIndex !== index && (
                                                            <div className="text-sm text-muted-foreground mt-1">
                                                                ••••••••••••
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (editingCredentialIndex === index) {
                                                                setEditingCredentialIndex(null);
                                                            } else {
                                                                setEditingCredentialIndex(index);
                                                            }
                                                        }}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                {/* Edit Form */}
                                                {editingCredentialIndex === index && (
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
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No credentials configured</p>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowManageModal(false)}
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
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {showConfirmDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
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
