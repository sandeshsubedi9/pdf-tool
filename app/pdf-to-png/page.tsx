import { redirect } from "next/navigation";

// PDF to PNG has been replaced by the unified "Image to PDF" tool.
// Redirect legacy users to the new Image to PDF page.
export default function PdfToPngRedirect() {
    redirect("/jpg-to-pdf");
}
