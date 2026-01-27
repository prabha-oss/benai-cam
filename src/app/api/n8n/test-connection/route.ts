import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { url, apiKey } = await request.json();

        if (!url || !apiKey) {
            return NextResponse.json(
                { error: "URL and API key are required" },
                { status: 400 }
            );
        }

        // Normalize URL - remove trailing slash
        const baseUrl = url.replace(/\/$/, "");

        // Test connection by fetching workflows endpoint
        const response = await fetch(`${baseUrl}/api/v1/workflows`, {
            method: "GET",
            headers: {
                "X-N8N-API-KEY": apiKey,
                "Accept": "application/json",
            },
        });

        if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
                success: true,
                workflowCount: data.data?.length || 0,
            });
        } else if (response.status === 401) {
            return NextResponse.json(
                { error: "Authentication failed. Check your API key." },
                { status: 401 }
            );
        } else if (response.status === 403) {
            return NextResponse.json(
                { error: "Access denied. API key may lack required permissions." },
                { status: 403 }
            );
        } else {
            return NextResponse.json(
                { error: `Connection failed: ${response.status} ${response.statusText}` },
                { status: response.status }
            );
        }
    } catch (error: any) {
        console.error("n8n connection test failed:", error);

        if (error.cause?.code === "ENOTFOUND" || error.cause?.code === "ECONNREFUSED") {
            return NextResponse.json(
                { error: "Cannot reach n8n instance. Check the URL." },
                { status: 502 }
            );
        }

        return NextResponse.json(
            { error: `Connection error: ${error.message}` },
            { status: 500 }
        );
    }
}
