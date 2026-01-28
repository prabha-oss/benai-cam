import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/Sidebar";
import { AppLayout } from "@/components/AppLayout";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
});

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
        <html lang="en" suppressHydrationWarning>
            <body className={manrope.className} suppressHydrationWarning>
                <ConvexClientProvider>
                    <div className="flex min-h-screen bg-background text-foreground">
                        <Sidebar />
                        <AppLayout>
                            {children}
                        </AppLayout>
                    </div>
                    <Toaster />
                </ConvexClientProvider>
            </body>
        </html>
    );
}
