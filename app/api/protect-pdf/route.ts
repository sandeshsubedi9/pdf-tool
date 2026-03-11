import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const password = formData.get("password") as string;

        if (!file || !password) {
            return NextResponse.json({ error: "Missing file or password" }, { status: 400 });
        }

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);
        forwardForm.append("password", password);

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/protect/pdf`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                {
                    error: "The protect service is not running. Please start the Python microservice.",
                },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            let errorBody = "";
            try {
                errorBody = await pythonResponse.text();
                const jsonErr = JSON.parse(errorBody);
                if (jsonErr.detail) errorBody = jsonErr.detail;
            } catch (e) {
                console.error(e);
            }
            console.error("Python service error:", errorBody);
            return NextResponse.json(
                { error: `Protection failed: ${errorBody}` },
                { status: pythonResponse.status }
            );
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, "-protected.pdf");

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
            },
        });
    } catch (error) {
        console.error("Protect PDF API route error:", error);
        return NextResponse.json(
            { error: "An unexpected error occurred." },
            { status: 500 }
        );
    }
}
