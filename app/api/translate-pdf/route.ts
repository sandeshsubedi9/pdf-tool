import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const targetLang = formData.get("target_lang") as string;

        if (!file) {
            return NextResponse.json({ error: "Missing file" }, { status: 400 });
        }
        if (!targetLang) {
            return NextResponse.json({ error: "Missing target_lang" }, { status: 400 });
        }

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);
        forwardForm.append("target_lang", targetLang);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/translate/pdf`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                { error: "The translation service is not running. Please start the Python python-service." },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            let errorBody = "";
            try {
                errorBody = await pythonResponse.text();
                const jsonErr = JSON.parse(errorBody);
                if (jsonErr.detail) errorBody = jsonErr.detail;
            } catch {
                // Keep raw text
            }
            console.error("Python service error:", errorBody);
            return NextResponse.json(
                { error: `Translation failed: ${errorBody}` },
                { status: pythonResponse.status }
            );
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, `_${targetLang}.pdf`);

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
            },
        });
    } catch (error) {
        console.error("Translate PDF API route error:", error);
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}
