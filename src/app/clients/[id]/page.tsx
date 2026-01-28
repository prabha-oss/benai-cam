"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Server, Zap, CheckCircle, AlertTriangle, Settings, Edit, Trash2, X, Loader2 } from "lucide-react";
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

    // UI State
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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
                                                <div className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Deploying
                                                </div>
                                            ) : d.status === "failed" ? (
                                                <div className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                                                    <AlertTriangle className="w-4 h-4" />
                                                    Failed
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
                                        <Button variant="outline" size="sm">Manage</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
