import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const quality = (formData.get("quality") as string) || "medium";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);
        forwardForm.append("quality", quality);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/compress/pdf`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                {
                    error: "The compression service is not running. Please start the Python microservice (see python-service/start.bat).",
                },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            const errorBody = await pythonResponse.text();
            console.error("Python service error:", errorBody);
            return NextResponse.json(
                { error: `Compression failed: ${errorBody}` },
                { status: pythonResponse.status }
            );
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, "-compressed.pdf");
        const originalSize = pythonResponse.headers.get("X-Original-Size") || "0";
        const compressedSize = pythonResponse.headers.get("X-Compressed-Size") || "0";

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
                "X-Original-Size": originalSize,
                "X-Compressed-Size": compressedSize,
            },
        });
    } catch (error) {
        console.error("Compress PDF API route error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
