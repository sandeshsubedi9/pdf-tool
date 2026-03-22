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
            console.error("Python service error (url-to-pdf):", errorBody);
            return NextResponse.json(
                { error: `Internal conversion error: ${errorBody}` },
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
