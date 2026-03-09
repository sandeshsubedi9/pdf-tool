import { redirect } from "next/navigation";

// png-to-pdf has been replaced by the unified "Image to PDF" tool.
export default function PngToPdfRedirect() {
    redirect("/jpg-to-pdf");
}
