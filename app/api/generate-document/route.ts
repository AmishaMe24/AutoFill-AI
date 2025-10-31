import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const { originalBuffer, filledValues } = await request.json();

    // Convert base64 back to buffer
    const buffer = Buffer.from(originalBuffer, 'base64');

    // Extract text with formatting info
    const result = await mammoth.extractRawText({ buffer });
    let text = result.value;

    // Replace all placeholders with filled values
    Object.entries(filledValues).forEach(([placeholder, value]) => {
      text = text.replace(new RegExp(placeholder, 'g'), value as string);
    });

    // Create new document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: text.split('\n').map(
            (line) =>
              new Paragraph({
                children: [new TextRun(line)],
              })
          ),
        },
      ],
    });

    // Generate buffer
    const docBuffer = await Packer.toBuffer(doc);

    // Convert to base64 for response
    const base64Doc = docBuffer.toString('base64');

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
