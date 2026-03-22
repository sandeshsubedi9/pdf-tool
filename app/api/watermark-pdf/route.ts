import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);

        const fields = [
            "watermark_type", "text", "font_name", "font_size",
            "bold", "italic", "underline", "text_color",
            "image_data", "image_width_pct",
            "position", "opacity", "rotation", "layer", "page_range",
        ];
        for (const field of fields) {
            const val = formData.get(field);
            if (val !== null) forwardForm.append(field, val as string);
        }

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/edit/add-watermark`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                { error: "The watermark service is not running. Please start the Python microservice." },
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
            return NextResponse.json({ error: `Watermarking failed: ${errorBody}` }, { status: pythonResponse.status });
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, "-watermarked.pdf");

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
            },
        });
    } catch (error) {
        console.error("Watermark PDF API route error:", error);
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}
