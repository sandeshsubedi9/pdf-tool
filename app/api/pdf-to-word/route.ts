import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Forward the file to the Python microservice
        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/convert/pdf-to-word`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                {
                    error:
                        "The conversion service is not running. Please start the Python microservice (see python-service/start.bat).",
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

        // Stream the DOCX back to the browser
        const docxBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, ".docx");

        return new NextResponse(docxBuffer, {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
            },
        });
    } catch (error) {
        console.error("PDF-to-Word API route error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}

