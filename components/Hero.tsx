"use client";

import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import type { Placeholder } from "@/types";

interface HeroProps {
  hasContent: boolean;
  onFileProcessed: (data: {
    text: string;
    placeholders: Placeholder[];
    originalBuffer: string;
  }) => void;
  onReset: () => void;
}

export default function Hero({ hasContent, onFileProcessed, onReset }: HeroProps) {
  if (hasContent) {
    return (
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Welcome to Voice Based Legal Document Assistant
        </div>
        <Button variant="outline" onClick={onReset}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-8 py-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Legal Document Assistant
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Upload your legal documents and fill them out using the conversational chatbot. 
          Our AI will identify all placeholders and help you complete them efficiently.
        </p>
      </div>
      
      <div className="mx-auto">
        <FileUpload onFileProcessed={onFileProcessed} />
      </div>

      
    </div>
  );
}