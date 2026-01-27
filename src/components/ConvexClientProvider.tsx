"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

    const convex = useMemo(() => {
        if (!convexUrl) return null;
        return new ConvexReactClient(convexUrl);
    }, [convexUrl]);

    if (!convex) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
                <div className="max-w-md text-center space-y-4">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                        ⚠️
                    </div>
                    <h1 className="text-2xl font-bold">Convex Not Configured</h1>
                    <p className="text-gray-600">
                        To run this application, you need to set up Convex:
                    </p>
                    <div className="text-left bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono space-y-2">
                        <p className="text-gray-400"># 1. Run Convex dev server</p>
                        <p>npx convex dev</p>
                        <p className="text-gray-400 mt-3"># 2. This will create .env.local with:</p>
                        <p>NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud</p>
                    </div>
                    <p className="text-sm text-gray-500">
                        After running <code className="bg-gray-100 px-1 rounded">npx convex dev</code>, refresh this page.
                    </p>
                </div>
            </div>
        );
    }

    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

