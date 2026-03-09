import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dpi = searchParams.get("dpi") || "150";

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(
                `${PYTHON_SERVICE_URL}/convert/pdf-pages-to-jpg?dpi=${dpi}`,
                { method: "POST", body: forwardForm }
            );
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                { error: "The conversion service is not running. Please start the Python microservice." },
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

        const data = await pythonResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("PDF-pages-to-JPG API route error:", error);
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}
