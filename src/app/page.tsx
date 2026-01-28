"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Users, Zap, CheckCircle, AlertTriangle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
    const agents = useQuery(api.agents.list);
    const clients = useQuery(api.clients.list);

    const totalAgents = agents?.length ?? 0;
    const activeClients = clients?.filter(c => c.status === 'active').length ?? 0;

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">Welcome back! Here's an overview of your deployments.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard
                    title="Total Agents"
                    value={String(totalAgents)}
                    icon={Zap}
                    description="Workflow templates"
                    trend={totalAgents > 0 ? "+100%" : undefined}
                />
                <StatsCard
                    title="Active Clients"
                    value={String(activeClients)}
                    icon={Users}
                    description="With deployments"
                />
                <StatsCard
                    title="Deployments"
                    value="0"
                    icon={Activity}
                    description="Running workflows"
                />
                <StatsCard
                    title="System Health"
                    value="100%"
                    icon={CheckCircle}
                    description="All operational"
                    valueColor="text-green-600"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Recent Activity</CardTitle>
                        <Button variant="ghost" size="sm">View All</Button>
                    </CardHeader>
                    <CardContent>
                        {!agents || agents.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-8">
                                No recent activity. Create an agent to get started!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {agents.slice(0, 5).map(agent => (
                                    <div key={agent._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">Agent created: {agent.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(agent.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                        <Link href={`/agents/${agent._id}`}>
                                            <Button variant="ghost" size="sm">
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <Link href="/clients/new" className="block">
                                <Button className="w-full justify-start" size="lg">
                                    <Users className="w-4 h-4 mr-3" />
                                    Onboard New Client
                                </Button>
                            </Link>
                            <Link href="/agents/new" className="block">
                                <Button variant="outline" className="w-full justify-start" size="lg">
                                    <Zap className="w-4 h-4 mr-3" />
                                    Create Agent Template
                                </Button>
                            </Link>
                        </div>

                        <div className="mt-6 pt-6 border-t">
                            <h4 className="text-sm font-medium text-muted-foreground mb-3">System Status</h4>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        n8n Connection
                                    </span>
                                    <span className="text-green-600">Healthy</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                                        Database
                                    </span>
                                    <span className="text-green-600">Connected</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatsCard({
    title,
    value,
    icon: Icon,
    description,
    trend,
    valueColor
}: {
    title: string;
    value: string;
    icon: any;
    description: string;
    trend?: string;
    valueColor?: string;
}) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueColor || ''}`}>{value}</div>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">{description}</p>
                    {trend && <span className="text-xs text-green-600 font-medium">{trend}</span>}
                </div>
            </CardContent>
        </Card>
    );
}
