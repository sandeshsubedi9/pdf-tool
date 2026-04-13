import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const fileA = formData.get("file_a") as File | null;
        const fileB = formData.get("file_b") as File | null;

        if (!fileA || !fileB) {
            return NextResponse.json(
                { error: "Both file_a and file_b are required." },
                { status: 400 }
            );
        }

        const forwardForm = new FormData();
        forwardForm.append("file_a", fileA, fileA.name);
        forwardForm.append("file_b", fileB, fileB.name);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/compare/pdf`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                {
                    error: "The compare service is not running. Please start the Python microservice (see python-service/start.bat).",
                },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            const errorBody = await pythonResponse.text();
            console.error("Python service error:", errorBody);
            return NextResponse.json(
                { error: `Compare failed: ${errorBody}` },
                { status: pythonResponse.status }
            );
        }

        const data = await pythonResponse.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Compare PDF API route error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
