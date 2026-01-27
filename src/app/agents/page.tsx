import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Settings, Zap } from "lucide-react";
import Link from "next/link";

export default function AgentsPage() {
    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Agents</h2>
                    <p className="text-muted-foreground">Manage your automation templates.</p>
                </div>
                <Link href="/agents/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Agent
                    </Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border w-full md:w-1/3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    placeholder="Search agents..."
                    className="flex-1 outline-none text-sm"
                />
            </div>

            {/* Empty State / List */}
            <div className="grid gap-6">
                <div className="text-center py-12 bg-white rounded-lg border border-dashed">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium">No agents yet</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-2">
                        Create your first agent template to start deploying workflows to clients.
                    </p>
                    <Link href="/agents/new" className="mt-6 inline-block">
                        <Button variant="outline">Create Agent</Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
