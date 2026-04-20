import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        
        // Forward the form data to the Python service
        const response = await fetch(`${PYTHON_SERVICE_URL}/convert/url-to-pdf`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            // Log the raw, detailed error securely in the terminal/server logs
            console.error("Python service error (url-to-pdf):", errorBody);
            
            let userMessage = "We encountered an issue processing this URL. Please try again.";
            
            try {
                const parsed = JSON.parse(errorBody);
                if (parsed.detail) {
                    // If it's a 400 (validation error), it's safe to show
                    if (response.status === 400) {
                        userMessage = typeof parsed.detail === "string" ? parsed.detail : "Invalid request parameters provided.";
                    } 
                    // Otherwise keep the generic 500 message so we don't expose stack traces/internal logic
                }
            } catch (e) {
                // Ignore JSON parse errors, stick to the fallback message
            }

            return NextResponse.json(
                { error: userMessage },
                { status: response.status }
            );
        }

        const buffer = await response.arrayBuffer();
        const outputFilename = response.headers.get("X-Original-Filename") || "document.pdf";

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
            },
        });
    } catch (error: any) {
        console.error("API route error (url-to-pdf):", error);
        return NextResponse.json(
            { error: error.message || "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
