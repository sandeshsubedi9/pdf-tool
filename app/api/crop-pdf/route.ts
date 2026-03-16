import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        // Forward the request to the Python microservice
        const backendRes = await fetch(`${PYTHON_SERVICE_URL}/crop/pdf`, {
            method: "POST",
            body: formData,
        });

        if (!backendRes.ok) {
            let errorMsg = "Crop failed.";
            try {
                const errBody = await backendRes.json();
                errorMsg = errBody.detail || errorMsg;
            } catch {
                errorMsg = (await backendRes.text()) || errorMsg;
            }
            return NextResponse.json({ error: errorMsg }, { status: backendRes.status });
        }

        const pdfBuffer = await backendRes.arrayBuffer();
        const filename =
            backendRes.headers.get("X-Original-Filename") || "cropped.pdf";

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "X-Original-Filename": filename,
            },
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: err?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
