"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Zap, Settings, LogOut, HelpCircle, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/agents", label: "Agents", icon: Zap },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/deployments", label: "Deployments", icon: LayoutDashboard },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col w-64 border-r bg-card h-screen fixed left-0 top-0">
            <div className="p-6">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                        B
                    </div>
                    BenAI
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto space-y-4">
                <div className="bg-primary/5 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Upgrade to Pro</h4>
                    <p className="text-xs text-muted-foreground">
                        Get more agents and advanced analytics.
                    </p>
                    <button className="w-full text-xs bg-primary text-primary-foreground py-1.5 rounded-md mt-2">
                        Upgrade
                    </button>
                </div>

                <div className="space-y-1">
                    <Link
                        href="/help"
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <HelpCircle className="w-5 h-5" />
                        Help & Information
                    </Link>
                    <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors">
                        <LogOut className="w-5 h-5" />
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
}
