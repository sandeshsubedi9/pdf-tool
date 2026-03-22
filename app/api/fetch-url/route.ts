import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

/**
 * Server-side URL fetcher to bypass CORS restrictions.
 * Fetches HTML from a given URL and returns it as plain text.
 */
export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "A valid URL is required." }, { status: 400 });
        }

        const formData = new FormData();
        formData.append("url", url);

        const response = await fetch(`${PYTHON_SERVICE_URL}/convert/url-to-html`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            return NextResponse.json(
                { error: `Failed to fetch rendered URL: ${errorBody}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("fetch-url route error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch the URL." },
            { status: 500 }
        );
    }
}

function extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match ? match[1].trim() : null;
}
