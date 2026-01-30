"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Server, Shield, Save, CheckCircle, Loader2, Edit, AlertTriangle, Bell } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function SettingsPage() {
    const settings = useQuery(api.settings.getMultiple, { keys: ["n8n_url", "n8n_api_key"] });
    const saveSettings = useMutation(api.settings.setMultiple);
    const testConnectionAction = useAction(api.actions.testConnection);

    const [n8nUrl, setN8nUrl] = useState("");
    const [n8nApiKey, setN8nApiKey] = useState("");
    const [isTested, setIsTested] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [showEditConfirm, setShowEditConfirm] = useState(false);

    // Load initial settings
    useEffect(() => {
        if (settings) {
            if (settings.n8n_url) setN8nUrl(settings.n8n_url);
            if (settings.n8n_api_key) setN8nApiKey(settings.n8n_api_key);
            if (settings.n8n_url && settings.n8n_api_key) {
                setIsSaved(true);
                setIsTested(true);
            }
        }
    }, [settings]);

    const handleTest = async () => {
        // Validate inputs
        if (!n8nUrl || !n8nApiKey) {
            toast.error("Please enter both URL and API Key");
            return;
        }

        setIsTesting(true);

        try {
            // Check if the URL is valid
            new URL(n8nUrl);

            // Call the real action
            const result = await testConnectionAction({
                n8nUrl,
                n8nApiKey
            });

            if (result.success) {
                setIsTesting(false);
                setIsTested(true);
                toast.success("Connection successful!");
            } else {
                throw new Error(result.message);
            }
        } catch (e: any) {
            setIsTesting(false);
            setIsTested(false);
            toast.error(e.message || "Connection failed. Check URL and API Key.");
        }
    };

    const handleSave = async () => {
        if (!n8nUrl || !n8nApiKey) return;

        setIsSaving(true);
        try {
            await saveSettings({
                settings: [
                    { key: "n8n_url", value: n8nUrl },
                    { key: "n8n_api_key", value: n8nApiKey },
                ]
            });

            setIsSaved(true);
            toast.success("n8n instance credentials saved successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEdit = () => {
        setShowEditConfirm(true);
    };

    const handleConfirmEdit = () => {
        setShowEditConfirm(false);
        setIsSaved(false);
        setIsTested(false);
        toast.info("You can now edit the credentials");
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Configure your deployment manager.</p>
            </div>

            <div className="grid gap-6 max-w-3xl">
                {/* n8n Instance Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="w-5 h-5" />
                            Your n8n Instance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Configure your managed n8n instance that hosts client deployments.
                        </p>
                        <div className="space-y-2">
                            <Label>Instance URL</Label>
                            <Input
                                placeholder="https://your-instance.app.n8n.cloud"
                                value={n8nUrl}
                                onChange={(e) => setN8nUrl(e.target.value)}
                                disabled={isSaved || !settings}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                                type="password"
                                placeholder="n8n_api_..."
                                value={n8nApiKey}
                                onChange={(e) => setN8nApiKey(e.target.value)}
                                disabled={isSaved || !settings}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-2">
                            {!isSaved ? (
                                <>
                                    {!isTested ? (
                                        <Button
                                            variant="outline"
                                            onClick={handleTest}
                                            disabled={isTesting || !n8nUrl || !n8nApiKey}
                                        >
                                            {isTesting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Testing...
                                                </>
                                            ) : (
                                                "Test Connection"
                                            )}
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2 text-green-700 text-sm">
                                            <CheckCircle className="w-4 h-4" />
                                            Connection Verified
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSave}
                                        disabled={!isTested || isSaving}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Save Changes
                                    </Button>
                                </>
                            ) : (
                                <Button variant="outline" onClick={handleEdit}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit Credentials
                                </Button>
                            )}
                        </div>

                        {isTested && !isSaved && (
                            <p className="text-xs text-green-700 flex items-center gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5" />
                                credentials verified. You can now save them.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Encryption Key</Label>
                            <Input type="password" placeholder="32-byte hex string" disabled />
                            <p className="text-xs text-muted-foreground">
                                Used to encrypt client API keys. Set via <strong>NEXT_PUBLIC_ENCRYPTION_SECRET</strong> environment variable.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Notifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-sm">Health Alerts</div>
                                <div className="text-xs text-muted-foreground">Get notified when deployments fail</div>
                            </div>
                            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-sm">Credential Expiry</div>
                                <div className="text-xs text-muted-foreground">Alert before credentials expire</div>
                            </div>
                            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Edit Confirmation Dialog */}
            {showEditConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-lg">Edit Credentials?</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    There are credentials already configured. Do you want to edit them? You'll need to test the connection again before saving.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowEditConfirm(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleConfirmEdit}>
                                OK, Edit
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
