import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';

interface Placeholder {
  id: string;
  name: string;
  original: string;
  description: string;
  position: number;
}

export async function POST(request: NextRequest) {
  try {
    const { originalBuffer, filledValues, placeholders } = await request.json();

    const buffer = Buffer.from(originalBuffer, 'base64');

    const zip = new PizZip(buffer);

    type ZipObj = { name: string; asText: () => string };
    const targetXmlFiles = zip.file(/^word\/(document|header\d*|footer\d*)\.xml$/) as ZipObj[];

    const placeholderMap = new Map<string, string>();
    if (placeholders && Array.isArray(placeholders)) {
      placeholders.forEach((placeholder: Placeholder) => {
        placeholderMap.set(placeholder.name, placeholder.original);
      });
    }

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

    targetXmlFiles.forEach((fileObj) => {
      const xml = fileObj.asText();
      if (!xml) return;
      let modified = xml;
      
      const sortedEntries = Object.entries(filledValues)
         .map(([placeholderName, value]) => {
           const placeholder = placeholders?.find((p: Placeholder) => p.name === placeholderName);
           return {
             placeholderName,
             value,
             originalText: placeholderMap.get(placeholderName),
             position: placeholder?.position || 0
           };
         })
         .filter(entry => entry.originalText)
         .sort((a, b) => b.position - a.position);
      
      sortedEntries.forEach(({ placeholderName, value, originalText }) => {
        if (originalText) {
          const safeValue = (value ?? '').toString();
          
          const match = placeholderName.match(/_(\d+)$/);
          const occurrenceNumber = match ? parseInt(match[1]) : 1;
          
          const literalPattern = new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          
          let matchCount = 0;
          modified = modified.replace(literalPattern, (match) => {
            matchCount++;
            return matchCount === occurrenceNumber ? safeValue : match;
          });
          
          if (matchCount === 0) {
            const runAgnostic = makeRunAgnosticPattern(originalText);
            matchCount = 0;
            modified = modified.replace(runAgnostic, (match) => {
              matchCount++;
              return matchCount === occurrenceNumber ? safeValue : match;
            });
          }
        }
      });
      
      zip.file(fileObj.name, modified);
    });

    const outBuffer = zip.generate({ type: 'nodebuffer' });
    const base64Doc = outBuffer.toString('base64');

    return NextResponse.json({
      document: base64Doc,
      filename: `completed_document_${Date.now()}.docx`,
    });
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}
