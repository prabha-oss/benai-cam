"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Users, Loader2 } from "lucide-react";

export default function NewClientPage() {
    const router = useRouter();
    const createClient = useMutation(api.clients.create);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        company: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            return toast.error("Please enter the client name");
        }
        if (!formData.email.trim()) {
            return toast.error("Please enter the email address");
        }
        if (!formData.company.trim()) {
            return toast.error("Please enter the company name");
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return toast.error("Please enter a valid email address");
        }

        setIsSubmitting(true);

        try {
            await createClient({
                name: formData.name.trim(),
                email: formData.email.trim(),
                company: formData.company.trim(),
                status: "active"
            });

            toast.success("Client created successfully!");
            router.push("/clients");
        } catch (error) {
            console.error("Error creating client:", error);
            toast.error((error as Error).message || "Failed to create client");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto py-12 px-6">
            <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-6 pl-0"
            >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clients
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Add New Client</CardTitle>
                            <CardDescription>Enter the client's basic information</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Client Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="John Doe"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                placeholder="john@acme.com"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="company">Company Name *</Label>
                            <Input
                                id="company"
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                placeholder="Acme Corporation"
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    "Create Client"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
