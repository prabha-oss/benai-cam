"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Users, Loader2, Grid, List, Eye, Filter } from "lucide-react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";

export default function ClientsPage() {
    const [isMounted, setIsMounted] = useState(false);
    const clients = useQuery(api.clients.list);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "suspended">("all");

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Show loading during hydration
    if (!isMounted) {
        return (
            <div className="p-8 min-h-screen">
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    // Filtered clients
    const filteredClients = clients?.filter(client => {
        if (client.archivedAt) return false;
        const matchesSearch =
            client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || client.status === statusFilter;
        return matchesSearch && matchesStatus;
    }) || [];

    // Loading state
    if (clients === undefined) {
        return (
            <div className="p-8 min-h-screen">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground mt-1">Manage your client roster and their deployments.</p>
                </div>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
                    <p className="text-muted-foreground mt-1">Manage your client roster and their deployments.</p>
                </div>
                <Link href="/clients/new">
                    <Button className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 font-medium">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Client
                    </Button>
                </Link>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-wrap gap-4 items-center mb-6">
                <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-border/50 shadow-sm flex-1 md:flex-none md:w-80">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input
                        placeholder="Search clients..."
                        className="flex-1 outline-none text-sm bg-transparent"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-border/50 shadow-sm">
                    {["all", "active", "inactive", "suspended"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors capitalize ${statusFilter === status
                                ? "bg-primary text-white"
                                : "hover:bg-muted text-muted-foreground"
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-border/50 shadow-sm">
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                            }`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "hover:bg-muted text-muted-foreground"
                            }`}
                    >
                        <Grid className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Client List/Grid */}
            {filteredClients.length === 0 ? (
                <Card className="bg-white rounded-2xl shadow-sm border-border/50 border-dashed">
                    <CardContent className="py-16 text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No clients found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                            {clients.length === 0
                                ? "Add your first client to start deploying automated workflows."
                                : "No clients match your current filters."}
                        </p>
                        {clients.length === 0 && (
                            <Link href="/clients/new">
                                <Button variant="outline" className="rounded-xl">Add Client</Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
                    {filteredClients.map((client) => (
                        <Card key={client._id} className="bg-white rounded-2xl shadow-sm border-border/50 hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className={viewMode === "grid" ? "space-y-4" : "flex justify-between items-center"}>
                                    <div className={viewMode === "grid" ? "" : "flex items-center gap-4 flex-1"}>
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-muted to-muted/60 flex items-center justify-center text-lg font-bold text-muted-foreground flex-shrink-0">
                                            {client.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className={viewMode === "grid" ? "mt-4" : ""}>
                                            <h3 className="font-semibold text-base">{client.name}</h3>
                                            <p className="text-sm text-muted-foreground">{client.company} • {client.email}</p>
                                            <div className={`flex gap-2 flex-wrap ${viewMode === "grid" ? "mt-3" : "mt-2"}`}>
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${client.status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                                                    client.status === 'suspended' ? 'bg-yellow-50 text-yellow-600' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {client.status}
                                                </span>
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium">
                                                    {client.deploymentType === 'your_instance' ? 'Managed' : 'Self-hosted'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={viewMode === "grid" ? "flex gap-2 mt-4" : "flex gap-2"}>
                                        <Link href={`/clients/${client._id}`}>
                                            <Button variant="outline" size="sm" className="rounded-xl h-10 px-4">
                                                <Eye className="w-4 h-4 mr-2" />
                                                View
                                            </Button>
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
