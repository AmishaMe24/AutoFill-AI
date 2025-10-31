'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FileUploadProps {
  onFileProcessed: (data: {
    text: string;
    placeholders: any[];
    originalBuffer: string;
  }) => void;
}

export default function FileUpload({ onFileProcessed }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      alert('Please upload a .docx file');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse document');
      }

      const data = await response.json();
      onFileProcessed(data);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to process document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <Card className="p-8">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-5xl">📄</div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Upload Legal Document
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Drop your .docx file here or click to browse
            </p>
          </div>

          <div>
            <input
              type="file"
              id="file-upload"
              accept=".docx"
              onChange={handleChange}
              disabled={isProcessing}
              className="hidden"
            />
            <label htmlFor="file-upload">
              <Button
                type="button"
                disabled={isProcessing}
                className="cursor-pointer"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                {isProcessing ? 'Processing...' : 'Select File'}
              </Button>
            </label>
          </div>

          <p className="text-xs text-gray-500">
            Supported format: Microsoft Word (.docx)
          </p>
        </div>
      </div>
    </Card>
  );
}
