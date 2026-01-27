"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Server,
    Bell,
    Shield,
    Database,
    ExternalLink,
    CheckCircle,
    Loader2,
    AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function SettingsPage() {
    const [n8nUrl, setN8nUrl] = useState("");
    const [n8nApiKey, setN8nApiKey] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from Convex
    const settings = useQuery(api.settings.getMultiple, {
        keys: ["n8n_url", "n8n_api_key"]
    });

    // Mutation to save settings
    const setMultipleSettings = useMutation(api.settings.setMultiple);

    // Populate form when settings load
    useEffect(() => {
        if (settings !== undefined) {
            if (settings.n8n_url) setN8nUrl(settings.n8n_url);
            if (settings.n8n_api_key) setN8nApiKey(settings.n8n_api_key);
            setIsLoaded(true);
        }
    }, [settings]);

    const handleTestConnection = async () => {
        if (!n8nUrl || !n8nApiKey) {
            toast.error("Please enter both URL and API Key");
            return;
        }

        setIsTesting(true);
        setConnectionStatus("idle");

        try {
            const response = await fetch("/api/n8n/test-connection", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: n8nUrl,
                    apiKey: n8nApiKey,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setConnectionStatus("success");
                toast.success(`Connected! Found ${data.workflowCount} workflows.`);
            } else {
                setConnectionStatus("error");
                toast.error(data.error || "Connection failed");
            }
        } catch (error: any) {
            setConnectionStatus("error");
            toast.error(`Connection error: ${error.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async () => {
        if (!n8nUrl) {
            toast.error("Please enter the n8n Instance URL");
            return;
        }

        setIsSaving(true);
        try {
            await setMultipleSettings({
                settings: [
                    { key: "n8n_url", value: n8nUrl, description: "n8n Instance URL" },
                    { key: "n8n_api_key", value: n8nApiKey, description: "n8n API Key" },
                ]
            });
            toast.success("Settings saved successfully!");
        } catch (error: any) {
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Show loading state while settings are being fetched
    if (!isLoaded) {
        return (
            <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                        <p className="text-muted-foreground">Configure your deployment environment.</p>
                    </div>
                </div>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="ml-3 text-muted-foreground">Loading settings...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                    <p className="text-muted-foreground">Configure your deployment environment.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Settings Area */}
                <div className="md:col-span-2 space-y-6">
                    {/* n8n Instance Configuration */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Server className="w-5 h-5 text-primary" />
                                <CardTitle>Managed n8n Instance</CardTitle>
                            </div>
                            <CardDescription>
                                Configure your primary n8n instance for managed deployments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="n8n-url">Instance URL</Label>
                                <Input
                                    id="n8n-url"
                                    placeholder="https://your-instance.app.n8n.cloud"
                                    value={n8nUrl}
                                    onChange={(e) => setN8nUrl(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="n8n-api-key">API Key</Label>
                                <Input
                                    id="n8n-api-key"
                                    type="password"
                                    placeholder="n8n_api_..."
                                    value={n8nApiKey}
                                    onChange={(e) => setN8nApiKey(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleTestConnection}
                                    disabled={isTesting || !n8nUrl || !n8nApiKey}
                                >
                                    {isTesting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : connectionStatus === "success" ? (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                                            Connected
                                        </>
                                    ) : connectionStatus === "error" ? (
                                        <>
                                            <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
                                            Failed
                                        </>
                                    ) : (
                                        "Test Connection"
                                    )}
                                </Button>
                                <Button size="sm" onClick={handleSave} disabled={isSaving || connectionStatus !== "success"}>
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Settings */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-primary" />
                                <CardTitle>Notifications</CardTitle>
                            </div>
                            <CardDescription>
                                Configure how you receive alerts and notifications.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div className="font-medium text-sm">Health Alerts</div>
                                    <div className="text-xs text-muted-foreground">
                                        Get notified when deployments fail health checks
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Enabled
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div className="font-medium text-sm">Credential Expiry</div>
                                    <div className="text-xs text-muted-foreground">
                                        Alert when credentials are about to expire
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-green-600 text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Enabled
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Security Settings */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <CardTitle>Security</CardTitle>
                            </div>
                            <CardDescription>
                                Manage security and access settings.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground py-4 text-center">
                                Authentication settings coming soon.
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Links */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Quick Links</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <a
                                href="https://dashboard.convex.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Database className="w-4 h-4" />
                                Convex Dashboard
                                <ExternalLink className="w-3 h-3 ml-auto" />
                            </a>
                            <a
                                href="https://docs.n8n.io/api/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                <Server className="w-4 h-4" />
                                n8n API Docs
                                <ExternalLink className="w-3 h-3 ml-auto" />
                            </a>
                        </CardContent>
                    </Card>

                    {/* System Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">System Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Version</span>
                                <span className="font-mono">0.1.0</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Environment</span>
                                <span className="font-mono">Development</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Convex</span>
                                <span className="text-green-600 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    Connected
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
