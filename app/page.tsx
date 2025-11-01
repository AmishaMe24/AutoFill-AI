"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import Hero from "@/components/Hero";
import ChatInterface from "@/components/ChatInterface";
import DocumentPreview from "@/components/DocumentPreview";
import type { Placeholder } from "@/types";

export default function Page() {
  const [originalText, setOriginalText] = useState<string>("");
  const [originalBuffer, setOriginalBuffer] = useState<string>("");
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [filledValues, setFilledValues] = useState<Record<string, string>>({});
  const [downloading, setDownloading] = useState(false);

  const handleFileProcessed = (data: {
    text: string;
    placeholders: Placeholder[];
    originalBuffer: string;
  }) => {
    setOriginalText(data.text || "");
    setPlaceholders(Array.isArray(data.placeholders) ? data.placeholders : []);
    setOriginalBuffer(data.originalBuffer || "");
    setFilledValues({});
  };

  const handleValueUpdate = (values: Record<string, string>) => {
    console.log('Page received value update:', values);
    setFilledValues(values || {});
  };

  const handleComplete = (values: Record<string, string>) => {
    console.log('Page received completion:', values);
    setFilledValues(values || {});
  };

  const handleDownload = async () => {
    if (!originalBuffer) return;
    setDownloading(true);
    try {
      const payload = { 
        originalBuffer, 
        filledValues, 
        placeholders 
      };
      
      const res = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const base64Doc: string = data?.document || "";
      const filename: string = data?.filename || `completed_${Date.now()}.docx`;

      if (base64Doc) {
        const byteChars = atob(base64Doc);
        const byteNums = new Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
        const byteArray = new Uint8Array(byteNums);
        const blob = new Blob([byteArray], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        saveAs(blob, filename);
      }
    } catch (err) {
      console.error("Download error", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setOriginalText("");
    setOriginalBuffer("");
    setPlaceholders([]);
    setFilledValues({});
  };

  return (
    <div className="container mx-auto p-6 space-y-6 h-screen overflow-hidden flex flex-col">
      <Hero 
        hasContent={placeholders.length > 0 || !!originalText}
        onFileProcessed={handleFileProcessed}
        onReset={handleReset}
      />

      {(placeholders.length > 0 || !!originalText) && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1 h-full overflow-hidden">
          {placeholders.length > 0 && (
            <div className="md:col-span-4 lg:col-span-4 min-w-0 h-full overflow-hidden">
              <ChatInterface
                placeholders={placeholders}
                onComplete={handleComplete}
                onValueUpdate={handleValueUpdate}
              />
            </div>
          )}
          {originalText && (
            <div className="md:col-span-8 lg:col-span-8 min-w-0 h-full overflow-hidden">
              <DocumentPreview
                originalText={originalText}
                filledValues={filledValues}
                originalBuffer={originalBuffer}
                placeholders={placeholders}
                onDownload={handleDownload}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
