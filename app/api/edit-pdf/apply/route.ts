import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8001";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const edits = formData.get("edits") as string | null;
        const editsFile = formData.get("edits_file") as File | null;

        if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });
        if (!edits && !editsFile) return NextResponse.json({ error: "Missing edits payload" }, { status: 400 });

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);
        
        if (editsFile) {
            forwardForm.append("edits_file", editsFile, "edits.json");
        } else if (edits) {
            forwardForm.append("edits", edits);
        }

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/edit/apply-edits`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                { error: "The PDF editing service is not running. Please start the Python microservice." },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            let errorBody = "";
            try {
                errorBody = await pythonResponse.text();
                const jsonErr = JSON.parse(errorBody);
                if (jsonErr.detail) errorBody = jsonErr.detail;
            } catch { /* keep raw text */ }
            return NextResponse.json({ error: `Edit failed: ${errorBody}` }, { status: pythonResponse.status });
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, "_edited.pdf");

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
            },
        });
    } catch (error) {
        console.error("Apply PDF edits API route error:", error);
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}
