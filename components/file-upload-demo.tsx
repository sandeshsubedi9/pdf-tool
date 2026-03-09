"use client";
import React, { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";
import { IconLoader2, IconSparkles } from "@tabler/icons-react";

export default function FileUploadDemo() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = (files: File[]) => {
    setFiles(files);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await fetch("/api/edit", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Processing failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited_${files[0].name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error(error);
      alert("Failed to process PDF on the server.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="w-full min-h-64 border border-dashed bg-white border-neutral-200 rounded-xl overflow-hidden">
        <FileUpload
          files={files}
          setFiles={setFiles}
          onChange={handleFileUpload}
          title="Select PDF to Edit"
          description="Drop your PDF here and we'll handle the rest"
          accept={{ "application/pdf": [".pdf"] }}
        />
      </div>

      {files.length > 0 && (
        <button
          onClick={handleProcess}
          disabled={processing}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-brand-teal text-white font-bold rounded-xl hover:bg-[#036649] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(4,124,88,0.3)]"
        >
          {processing ? (
            <>
              <IconLoader2 size={20} className="animate-spin" />
              Processing on Server...
            </>
          ) : (
            <>
              <IconSparkles size={20} />
              Start Backend Editing
            </>
          )}
        </button>
      )}
    </div>
  );
}
