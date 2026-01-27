"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Users, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function ClientsPage() {
    const clients = useQuery(api.clients.list);

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
                    <p className="text-muted-foreground">Manage your client roster and their deployments.</p>
                </div>
                <Link href="/clients/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                    </Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border w-full md:w-1/3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    placeholder="Search clients..."
                    className="flex-1 outline-none text-sm"
                />
            </div>

            {!clients ? (
                <div className="text-center py-12">Loading...</div>
            ) : clients.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">No clients yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        Add your first client to start deploying automated workflows.
                    </p>
                    <Link href="/clients/new" className="mt-6 inline-block">
                        <Button variant="outline">Add Client</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {clients.map((client) => (
                        <Card key={client._id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-500">
                                            {client.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{client.name}</h3>
                                            <p className="text-sm text-muted-foreground">{client.company} • {client.email}</p>
                                            <div className="flex gap-2 mt-2">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${client.status === 'active'
                                                    ? 'bg-green-50 text-green-700 border-green-200'
                                                    : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {client.status}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
                                                    {client.deploymentType === 'your_instance' ? 'Managed Instance' : 'Client Instance'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={`/clients/${client._id}`}>
                                            <Button variant="outline" size="sm">Dashboard</Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
