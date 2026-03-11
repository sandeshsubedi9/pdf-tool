import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/repair/pdf`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                {
                    error: "The repair service is not running. Please start the Python microservice (see python-service/start.bat).",
                },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            let errorBody = "";
            try {
                errorBody = await pythonResponse.text();
                // try to parse as json
                const jsonErr = JSON.parse(errorBody);
                if (jsonErr.detail) errorBody = jsonErr.detail;
            } catch (e) {
                // Ignore parsing errors
                console.error(e);
            }
            console.error("Python service error:", errorBody);
            return NextResponse.json(
                { error: `Repair failed: ${errorBody}` },
                { status: pythonResponse.status }
            );
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, "-repaired.pdf");

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
            },
        });
    } catch (error) {
        console.error("Repair PDF API route error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
