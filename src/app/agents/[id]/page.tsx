"use client";

import { use, useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Play, Settings, Trash2, Edit, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const agentId = id as Id<"agents">;

    const agent = useQuery(api.agents.get, { id: agentId });
    const updateAgent = useMutation(api.agents.update);
    const deleteAgent = useMutation(api.agents.remove);

    // UI State
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: "",
        description: ""
    });

    // Initialize form when agent loads
    useEffect(() => {
        if (agent) {
            setEditForm({
                name: agent.name,
                description: agent.description || ""
            });
        }
    }, [agent]);

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
        if (!editForm.name.trim()) {
            return toast.error("Name is required");
        }

        setIsSubmitting(true);
        try {
            await updateAgent({
                id: agentId,
                name: editForm.name.trim(),
                description: editForm.description.trim()
            });
            toast.success("Agent updated successfully");
            setShowEditModal(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update agent");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setIsSubmitting(true);
        try {
            await deleteAgent({ id: agentId });
            toast.success("Agent deleted successfully");
            router.push("/agents");
        } catch (error: any) {
            toast.error(error.message || "Failed to delete agent");
            setIsSubmitting(false);
        }
    };

    if (agent === undefined) {
        return (
            <div className="p-8 min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (agent === null) {
        return (
            <div className="p-8 min-h-screen">
                <div className="text-center py-16">
                    <h2 className="text-xl font-semibold mb-2">Agent not found</h2>
                    <Button variant="outline" onClick={() => router.push("/agents")}>
                        Back to Agents
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Edit className="w-5 h-5" />
                                Edit Agent
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
                                <Label>Description</Label>
                                <Textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    disabled={isSubmitting}
                                    rows={4}
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
                                Delete Agent
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-muted-foreground">
                                Are you sure you want to delete <strong>"{agent.name}"</strong>? This action cannot be undone.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="rounded-xl"
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                                    ) : (
                                        <><Trash2 className="w-4 h-4 mr-2" />Delete Agent</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl hover:bg-muted"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
                        {agent.isActive === false && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200">
                                INACTIVE
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground">Created on {new Date(agent.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-3">
                    {/* Settings Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <Button
                            variant="outline"
                            className="rounded-xl h-11 px-4"
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
                                    Edit Agent
                                </button>
                                <button
                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
                                    onClick={() => {
                                        setShowDeleteConfirm(true);
                                        setShowSettingsMenu(false);
                                    }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Agent
                                </button>
                            </div>
                        )}
                    </div>

                    <Button
                        className="rounded-xl h-11 px-5 bg-primary hover:bg-primary/90"
                        onClick={() => router.push(`/clients/new?agentId=${agentId}`)}
                    >
                        <Play className="w-4 h-4 mr-2" />
                        Deploy to Client
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-white rounded-2xl shadow-sm border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Description</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">
                                {agent.description || "No description provided."}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white rounded-2xl shadow-sm border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Credential Schema</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold mb-3">Simple Credentials</h4>
                                    {agent.credentialSchema.simple.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">None</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {agent.credentialSchema.simple.map((c: any) => (
                                                <div key={c.type} className="flex justify-between items-center p-4 bg-muted/50 rounded-xl">
                                                    <span className="font-medium text-sm">{c.displayName}</span>
                                                    <span className="text-xs bg-white px-3 py-1.5 rounded-lg border border-border/50">
                                                        {c.instances} instances
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold mb-3">Special Credentials</h4>
                                    {agent.credentialSchema.special.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">None</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {agent.credentialSchema.special.map((c: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                                                    <div>
                                                        <div className="font-medium text-sm mb-1">{c.displayName}</div>
                                                        <div className="text-xs text-muted-foreground">Keyword: "{c.keyword}"</div>
                                                    </div>
                                                    <span className="text-xs bg-white px-3 py-1.5 rounded-lg border border-border/50">
                                                        {c.instances} instances
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="bg-white rounded-2xl shadow-sm border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Deployments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No active deployments.
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white rounded-2xl shadow-sm border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold">Template JSON</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="bg-gray-900 text-gray-100 p-4 rounded-xl text-xs font-mono overflow-auto max-h-60">
                                {JSON.stringify(agent.templateJSON, null, 2)}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
