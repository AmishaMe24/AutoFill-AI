import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';

export async function POST(request: NextRequest) {
  try {
    const { originalBuffer, filledValues } = await request.json();

    const buffer = Buffer.from(originalBuffer, 'base64');

    const zip = new PizZip(buffer);

    type ZipObj = { name: string; asText: () => string };
    const targetXmlFiles = zip.file(/^word\/(document|header\d*|footer\d*)\.xml$/) as ZipObj[];

    const entries = Object.entries(filledValues) as Array<[string, string]>;

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
      for (const [placeholder, value] of entries) {
        const safeValue = (value ?? '').toString();
        // Try exact literal replacement first (when placeholder is intact within a single run)
        const literalPattern = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        let next = modified.replace(literalPattern, safeValue);
        if (next === modified) {
          // Fallback to run-agnostic replacement allowing XML tags between characters
          const runAgnostic = makeRunAgnosticPattern(placeholder);
          next = modified.replace(runAgnostic, safeValue);
        }
        modified = next;
      }
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
