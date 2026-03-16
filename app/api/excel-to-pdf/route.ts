import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const backendFormData = new FormData();
        backendFormData.append("file", file, file.name);

        const response = await fetch(`${PYTHON_SERVICE_URL}/convert/excel-to-pdf`, {
            method: "POST",
            body: backendFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Microservice error: ${response.status} ${errorText}`);
        }

        const blob = await response.blob();
        const headers = new Headers();
        headers.set("Content-Type", "application/pdf");

        const newName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
        headers.set("Content-Disposition", `attachment; filename="${newName}"`);

        return new NextResponse(blob, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error("Excel to PDF API Route Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to convert Excel to PDF" },
            { status: 500 }
        );
    }
}
