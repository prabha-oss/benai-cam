import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
    try {
        // Get n8n settings from Convex
        const settings = await convex.query(api.settings.getMultiple, {
            keys: ["n8n_url", "n8n_api_key"]
        });

        const n8nUrl = settings?.n8n_url;
        const n8nApiKey = settings?.n8n_api_key;

        if (!n8nUrl || !n8nApiKey) {
            return NextResponse.json(
                { error: "n8n is not configured. Please add your n8n URL and API key in Settings." },
                { status: 400 }
            );
        }

        // Normalize URL
        const baseUrl = n8nUrl.replace(/\/$/, "");

        // Check if specific workflow ID is requested
        const { searchParams } = new URL(request.url);
        const workflowId = searchParams.get("id");

        if (workflowId) {
            // Fetch specific workflow
            const response = await fetch(`${baseUrl}/api/v1/workflows/${workflowId}`, {
                method: "GET",
                headers: {
                    "X-N8N-API-KEY": n8nApiKey,
                    "Accept": "application/json",
                },
            });

            if (!response.ok) {
                return NextResponse.json(
                    { error: `Failed to fetch workflow: ${response.status}` },
                    { status: response.status }
                );
            }

            const workflow = await response.json();
            return NextResponse.json({ workflow });
        }

        // Fetch all workflows (limit to 250 to comply with n8n max limit)
        const response = await fetch(`${baseUrl}/api/v1/workflows?limit=250`, {
            method: "GET",
            headers: {
                "X-N8N-API-KEY": n8nApiKey,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                return NextResponse.json(
                    { error: "Authentication failed. Check your n8n API key in Settings." },
                    { status: 401 }
                );
            }
            return NextResponse.json(
                { error: `Failed to fetch workflows: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Map to simpler format for the dropdown
        const workflows = (data.data || []).map((wf: any) => ({
            id: wf.id,
            name: wf.name,
            active: wf.active,
            createdAt: wf.createdAt,
            updatedAt: wf.updatedAt,
        }));

        return NextResponse.json({ workflows });
    } catch (error: any) {
        console.error("Error fetching n8n workflows:", error);

        if (error.cause?.code === "ENOTFOUND" || error.cause?.code === "ECONNREFUSED") {
            return NextResponse.json(
                { error: "Cannot reach n8n instance. Check the URL in Settings." },
                { status: 502 }
            );
        }

        return NextResponse.json(
            { error: `Failed to fetch workflows: ${error.message}` },
            { status: 500 }
        );
    }
}
