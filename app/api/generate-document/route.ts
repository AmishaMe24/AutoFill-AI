import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';

export async function POST(request: NextRequest) {
  try {
    const { originalBuffer, filledValues } = await request.json();

    // Convert base64 back to buffer
    const buffer = Buffer.from(originalBuffer, 'base64');

    // Load the original docx and perform in-place XML replacements to preserve formatting
    const zip = new PizZip(buffer);

    const files = Object.keys((zip as any).files || {});
    const targetXmlFiles = files.filter((name) =>
      /^word\/(document|header\d*|footer\d*)\.xml$/.test(name)
    );

    const entries = Object.entries(filledValues) as Array<[string, string]>;

    targetXmlFiles.forEach((name) => {
      const xml = zip.file(name)?.asText();
      if (!xml) return;
      let modified = xml;
      for (const [placeholder, value] of entries) {
        // Best-effort literal replacement of tokens like [Company Name] or {CompanyName}
        const safeValue = value ?? '';
        const pattern = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        modified = modified.replace(pattern, safeValue);
      }
      zip.file(name, modified);
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
