import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const format = searchParams.get("format") || "jpg";

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/convert/pdf-to-image?format=${format}`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                {
                    error:
                        "The conversion service is not running. Please start the Python microservice.",
                },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            const errorBody = await pythonResponse.text();
            console.error("Python service error:", errorBody);
            return NextResponse.json(
                { error: `Conversion failed: ${errorBody}` },
                { status: pythonResponse.status }
            );
        }

        const buffer = await pythonResponse.arrayBuffer();
        const outputFilename = pythonResponse.headers.get("X-Original-Filename") ||
            (pythonResponse.headers.get("Content-Type") === "application/zip"
                ? "images.zip"
                : `image.${format}`);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": pythonResponse.headers.get("Content-Type") || "application/octet-stream",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
            },
        });
    } catch (error) {
        console.error("PDF-to-Image API route error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
