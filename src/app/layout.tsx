import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "BenAI Client Deployment Manager",
    description: "Manage and deploy n8n agents to clients",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ConvexClientProvider>
                    <div className="flex min-h-screen bg-background text-foreground">
                        <Sidebar />
                        <main className="flex-1 ml-64">
                            {children}
                        </main>
                    </div>
                    <Toaster />
                </ConvexClientProvider>
            </body>
        </html>
    );
}
