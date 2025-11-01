'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import PizZip from 'pizzip';
import { renderAsync } from 'docx-preview';
import type { Placeholder } from '@/types';

interface DocumentPreviewProps {
  originalText: string;
  filledValues: Record<string, string>;
  originalBuffer: string;
  placeholders: Placeholder[];
  onDownload: () => void;
}

export default function DocumentPreview({
  originalText,
  filledValues,
  originalBuffer,
  placeholders,
  onDownload,
}: DocumentPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const base64ToArrayBuffer = (b64: string): ArrayBuffer => {
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  };

  const escapeChar = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const makeRunAgnosticPattern = (token: string) => {
    const chars = Array.from(token);
    const parts = chars.map((c) => {
      if (/\s/.test(c)) {
        return `\\s+(?:<[^>]+>)*`;
      }
      return `${escapeChar(c)}(?:<[^>]+>)*`;
    });
    return new RegExp(parts.join(''), 'g');
  };

  useEffect(() => {
    const renderDoc = async () => {
      setRenderError(null);
      try {
        const buf = base64ToArrayBuffer(originalBuffer);
        const zip = new PizZip(buf);

        type ZipObj = { name: string; asText: () => string };
        const xmlFiles = zip.file(/^word\/(document|header\d*|footer\d*)\.xml$/) as ZipObj[];

        const entries = Object.entries(filledValues) as Array<[string, string]>;
        xmlFiles.forEach((fileObj) => {
          const xml = fileObj.asText();
          if (!xml) return;
          let modified = xml;
          for (const [placeholder, value] of entries) {
            const safeValue = (value ?? '').toString();
            const literalPattern = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            let next = modified.replace(literalPattern, safeValue);
            if (next === modified) {
              const runAgnostic = makeRunAgnosticPattern(placeholder);
              next = modified.replace(runAgnostic, safeValue);
            }
            modified = next;
          }
          zip.file(fileObj.name, modified);
        });

        const out = zip.generate({ type: 'arraybuffer' });
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await renderAsync(out, containerRef.current, undefined, {
            inWrapper: true,
          });
        }
      } catch (e: unknown) {
        console.warn('Preview render failed, falling back to text preview', e);
        setRenderError('preview-failed');
      }
    };

    if (originalBuffer) renderDoc();
  }, [originalBuffer, filledValues]);

  return (
    <Card className="p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Document Preview</h3>
        <Button onClick={onDownload}>Download .docx</Button>
      </div>

      <div className="border rounded-lg p-6 bg-white flex-1 overflow-y-auto">
        <div ref={containerRef} className="docx-preview" />
        {renderError && (
          <div className="prose prose-sm max-w-none mt-4">
            <p className="text-xs text-gray-500">Rich preview failed; showing text fallback.</p>
            {originalText.split('\n').map((line, idx) => {
              const placeholderMap = new Map<string, string>();
              placeholders.forEach(placeholder => {
                placeholderMap.set(placeholder.name, placeholder.original);
              });

              let processedLine = line;
              Object.entries(filledValues).forEach(([placeholderName, value]) => {
                const originalText = placeholderMap.get(placeholderName);
                if (originalText) {
                  const escapedPlaceholder = originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                  processedLine = processedLine.replace(new RegExp(escapedPlaceholder, 'g'), value ?? '');
                }
              });

              return (
                <p key={idx} className="mb-2 text-sm leading-relaxed">
                  {processedLine}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
