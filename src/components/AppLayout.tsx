"use client";

import { useState, useEffect } from "react";
import { Header } from "./Header";
import { RightPanel } from "./RightPanel";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
    children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Prevent hydration mismatch
    if (!isMounted) {
        return (
            <div className="flex-1 ml-64">
                <div className="h-16 bg-white border-b border-border/50" />
                <main className="min-h-[calc(100vh-4rem)]">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <>
            <div className={cn(
                "flex-1 ml-64 transition-all duration-300 ease-in-out",
                isRightPanelOpen ? "mr-80" : "mr-0"
            )}>
                <Header
                    isRightPanelOpen={isRightPanelOpen}
                    onToggleRightPanel={() => setIsRightPanelOpen(!isRightPanelOpen)}
                />
                <main className="min-h-[calc(100vh-4rem)]">
                    {children}
                </main>
            </div>
            <RightPanel isOpen={isRightPanelOpen} />
        </>
    );
}
