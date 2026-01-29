"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Zap, Settings, LogOut, HelpCircle, LayoutDashboard, Plus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/agents", label: "Agents", icon: Zap, hasAdd: true },
    { href: "/clients", label: "Clients", icon: Users, hasAdd: true },
    { href: "/deployments", label: "Deployments", icon: LayoutDashboard },
    { href: "/activity", label: "Activity", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex flex-col w-64 bg-white border-r border-border/50 h-screen fixed left-0 top-0 shadow-sm">
            {/* Logo */}
            <div className="p-6 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl flex items-center justify-center font-bold text-lg shadow-sm">
                        B
                    </div>
                    <span className="font-bold text-xl tracking-tight">BenAI</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
                    return (
                        <div key={item.href} className="flex items-center group">
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 flex-1",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                    isActive ? "bg-primary/15" : "bg-muted group-hover:bg-muted"
                                )}>
                                    <item.icon className="w-4 h-4" />
                                </div>
                                {item.label}
                            </Link>
                            {item.hasAdd && (
                                <Link
                                    href={`${item.href}/new`}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Plus className="w-4 h-4" />
                                </Link>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Upgrade Card */}
            <div className="p-4 mt-auto space-y-4">
                <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 space-y-3 border border-primary/10">
                    <h4 className="font-semibold text-sm">Upgrade to Pro</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Get 1 month free and unlock advanced features.
                    </p>
                    <button className="w-full text-sm bg-primary text-primary-foreground py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm">
                        Upgrade
                    </button>
                </div>

                {/* Bottom Links */}
                <div className="space-y-1">
                    <Link
                        href="/help"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition-colors"
                    >
                        <HelpCircle className="w-5 h-5" />
                        Help & Information
                    </Link>
                    <button className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive rounded-xl hover:bg-destructive/10 transition-colors">
                        <LogOut className="w-5 h-5" />
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
}
