import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const pythonFormData = new FormData();
        pythonFormData.append("file", file);

        const response = await fetch(`${PYTHON_SERVICE_URL}/convert/pdf-to-txt`, {
            method: "POST",
            body: pythonFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Python microservice error:", errorText);
            return NextResponse.json(
                { error: `Python service error: ${errorText}` },
                { status: response.status }
            );
        }

        const blob = await response.blob();
        const originalName = file.name.replace(/\.pdf$/i, "");
        const outputFilename = `${originalName}.txt`;

        return new NextResponse(blob, {
            status: 200,
            headers: {
                "Content-Type": "text/plain",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
            },
        });
    } catch (error: any) {
        console.error("API Route Error (pdf-to-txt):", error);
        return NextResponse.json(
            { error: error?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
