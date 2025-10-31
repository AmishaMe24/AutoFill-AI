'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DocumentPreviewProps {
  originalText: string;
  filledValues: Record<string, string>;
  originalBuffer: string;
  onDownload: () => void;
}

export default function DocumentPreview({
  originalText,
  filledValues,
  onDownload,
}: DocumentPreviewProps) {
  let previewText = originalText;
  Object.entries(filledValues).forEach(([placeholder, value]) => {
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    previewText = previewText.replace(
      new RegExp(escapedPlaceholder, 'g'),
      `**${value}**`
    );
  });

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Document Preview</h3>
        <Button onClick={onDownload}>Download .docx</Button>
      </div>

      <div className="border rounded-lg p-6 bg-white max-h-[700px] overflow-y-auto">
        <div className="prose prose-sm max-w-none">
          {previewText.split('\n').map((line, idx) => (
            <p key={idx} className="mb-2 text-sm leading-relaxed">
              {line.split(/(\*\*.*?\*\*)/).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <span key={i} className="bg-yellow-200 font-semibold px-1">
                      {part.slice(2, -2)}
                    </span>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </p>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Filled values are highlighted in yellow
      </p>
    </Card>
  );
}
