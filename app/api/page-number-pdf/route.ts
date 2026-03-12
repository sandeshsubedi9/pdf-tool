import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "Missing file" }, { status: 400 });
        }

        // Forward all fields to Python service as-is
        const forwardForm = new FormData();
        forwardForm.append("file", file, file.name);

        // Pass through all optional form fields
        const fields = [
            "position", "margin", "first_number", "from_page", "to_page",
            "text_template", "custom_text",
            "font_name", "font_size", "bold", "italic", "underline", "text_color",
        ];
        for (const field of fields) {
            const val = formData.get(field);
            if (val !== null) forwardForm.append(field, val as string);
        }

        let pythonResponse: Response;
        try {
            pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/edit/add-page-numbers`, {
                method: "POST",
                body: forwardForm,
            });
        } catch (networkErr) {
            console.error("Could not reach Python service:", networkErr);
            return NextResponse.json(
                { error: "The page-number service is not running. Please start the Python microservice." },
                { status: 503 }
            );
        }

        if (!pythonResponse.ok) {
            let errorBody = "";
            try {
                errorBody = await pythonResponse.text();
                const jsonErr = JSON.parse(errorBody);
                if (jsonErr.detail) errorBody = jsonErr.detail;
            } catch {
                // keep raw text
            }
            console.error("Python service error:", errorBody);
            return NextResponse.json(
                { error: `Page numbering failed: ${errorBody}` },
                { status: pythonResponse.status }
            );
        }

        const pdfBuffer = await pythonResponse.arrayBuffer();
        const outputFilename =
            pythonResponse.headers.get("X-Original-Filename") ||
            file.name.replace(/\.pdf$/i, "-numbered.pdf");

        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${outputFilename}"`,
                "X-Original-Filename": outputFilename,
            },
        });
    } catch (error) {
        console.error("Page number PDF API route error:", error);
        return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
    }
}
