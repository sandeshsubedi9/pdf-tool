import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/edit/render-clean-page`, {
                method: "POST",
                body: formData,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                { error: "The PDF editing service is not running." },
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
            return NextResponse.json({ error: `Render failed: ${errorBody}` }, { status: pythonResponse.status });
        }

        const data = await pythonResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Render clean page API route error:", error);
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}
