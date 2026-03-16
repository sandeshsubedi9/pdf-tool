import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const conformanceLevel = (formData.get("conformance_level") as string | null) ?? "1b";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const microserviceUrl = `${PYTHON_SERVICE_URL}/convert/pdf-to-pdfa`;

        const proxyFormData = new FormData();
        proxyFormData.append("file", file);
        proxyFormData.append("conformance_level", conformanceLevel);

        const response = await fetch(microserviceUrl, {
            method: "POST",
            body: proxyFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Microservice error:", errorText);
            return NextResponse.json(
                { error: `Microservice failed: ${response.statusText}` },
                { status: response.status }
            );
        }

        const pdfaBuffer = await response.arrayBuffer();
        const originalFilename = file.name.replace(/\.[^/.]+$/, "");
        const outputFilename = `${originalFilename}_pdfa.pdf`;

        return new NextResponse(pdfaBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
            },
        });
    } catch (error: any) {
        console.error("PDF to PDF/A API error:", error);
        return NextResponse.json(
            { error: "Internal server error during conversion." },
            { status: 500 }
        );
    }
}
