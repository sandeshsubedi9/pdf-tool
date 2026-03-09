import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Send to Python microservice
        const backendFormData = new FormData();
        backendFormData.append("file", file, file.name);

        const response = await fetch("http://127.0.0.1:8000/convert/word-to-pdf", {
            method: "POST",
            body: backendFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Microservice error: ${response.status} ${errorText}`);
        }

        // Return the converted file
        const blob = await response.blob();
        const headers = new Headers();
        headers.set("Content-Type", "application/pdf");

        let newName = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
        headers.set("Content-Disposition", `attachment; filename="${newName}"`);

        return new NextResponse(blob, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error("Word to PDF API Route Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to convert Word to PDF" },
            { status: 500 }
        );
    }
}
