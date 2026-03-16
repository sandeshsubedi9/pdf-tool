import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const language = (formData.get("language") as string) || "eng";
        const force = (formData.get("force") as string) || "false";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);
        forwardForm.append("language", language);
        forwardForm.append("force", force);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/ocr/pdf`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                {
                    error: "The OCR service is not running. Please start the Python microservice (see python-service/start.bat).",
                },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            // We consciously avoid console.error here because the user is tracking 
            // backend issues within the Python terminal directly.
            // Also, we return a generic message so users don't see stack traces.
            return NextResponse.json(
                { error: "Something went wrong while processing the document." },
                { status: pythonResponse.status }
            );
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, "-searchable.pdf");
        const alreadyHadText = pythonResponse.headers.get("X-Already-Had-Text") || "false";

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
                "X-Already-Had-Text": alreadyHadText,
            },
        });
    } catch (error) {
        console.error("OCR PDF API route error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
