import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);

        // Add a simple edit: Add a watermark or label to the first page
        const pages = pdfDoc.getPages();
        if (pages.length > 0) {
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            firstPage.drawText("EDITED VIA BACKEND", {
                x: 50,
                y: height - 50,
                size: 30,
                font: helveticaFont,
                color: rgb(0.015, 0.486, 0.345), // Brand Teal
                opacity: 0.5,
            });
        }

        const pdfBytes = await pdfDoc.save();

        return new NextResponse(Buffer.from(pdfBytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="edited_${file.name}"`,
            },
        });
    } catch (error) {
        console.error("PDF Processing Error:", error);
        return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
    }
}
