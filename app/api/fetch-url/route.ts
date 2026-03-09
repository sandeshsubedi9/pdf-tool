import { NextRequest, NextResponse } from "next/server";

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

        // Basic URL validation
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(url);
        } catch {
            return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
        }

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
            return NextResponse.json({ error: "Only HTTP and HTTPS URLs are supported." }, { status: 400 });
        }

        const response = await fetch(parsedUrl.toString(), {
            method: "GET",
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            // Abort after 15 seconds
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch URL: HTTP ${response.status} ${response.statusText}` },
                { status: 502 }
            );
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
            return NextResponse.json(
                { error: `URL does not return HTML content (got: ${contentType})` },
                { status: 415 }
            );
        }

        const html = await response.text();
        const title = extractTitle(html) || parsedUrl.hostname;

        return NextResponse.json({ html, title, url: parsedUrl.toString() });
    } catch (error: any) {
        console.error("fetch-url route error:", error);
        if (error?.name === "TimeoutError" || error?.code === "ABORT_ERR") {
            return NextResponse.json({ error: "Request timed out. The URL took too long to respond." }, { status: 504 });
        }
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
