"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Server, Key, Bell, Shield, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const handleSave = () => {
        toast.success("Settings saved successfully!");
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
                            <Input placeholder="https://your-instance.app.n8n.cloud" />
                        </div>
                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input type="password" placeholder="n8n_api_..." />
                        </div>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
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
                                Used to encrypt client API keys. Set via ENCRYPTION_KEY environment variable.
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
        </div>
    );
}
