import { NextRequest, NextResponse } from 'next/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse docx using docxtemplater and extract full text
    const zip = new PizZip(buffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    const text = doc.getFullText();

    // Deterministically detect placeholders: {tag} and [tag]
    const curlyMatches = text.match(/\{[^}]+\}/g) || [];
    const bracketMatches = text.match(/\[[^\]]+\]/g) || [];
    const tags = [...new Set([...curlyMatches, ...bracketMatches])];

    const normalizeName = (token: string) => {
      const inner = token.slice(1, -1).trim();
      return inner.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    };

    let placeholders = tags.map((t, i) => ({
      id: (i + 1).toString(),
      name: normalizeName(t),
      original: t,
      description: `Fill in the ${t.slice(1, -1).trim()} field`,
      position: text.indexOf(t),
    }));

    if (process.env.GROQ_API_KEY && placeholders.length > 0) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: `You are a legal document analyzer. For each placeholder provided (which may be in {tag} or [tag] style), give a clear, helpful description of what information should be filled in.
              Return ONLY a valid JSON array with this exact structure, no additional text:
              [{"id": "1", "name": "normalized_key", "original": "{tag} or [tag] as found", "description": "what information is needed", "position": 0}]`,
            },
            {
              role: 'user',
              content: `Enhance these placeholders with better descriptions. Document context (truncated):\n\n${text.substring(0, 2000)}\n\nPlaceholders: ${JSON.stringify(placeholders)}`,
            },
          ],
          temperature: 0,
        });
        const responseContent = completion.choices[0].message.content || '[]';
        try {
          const enhanced = JSON.parse(responseContent);
          if (Array.isArray(enhanced) && enhanced.length === placeholders.length) {
            placeholders = enhanced;
          }
        } catch (e) {
          console.warn('OpenAI enhancement parse failed, using basic placeholders');
        }
      } catch (aiErr) {
        console.warn('OpenAI enhancement failed, using basic placeholders:', aiErr);
      }
    }

    // Convert buffer to base64 for storage in client
    const base64Buffer = buffer.toString('base64');

    return NextResponse.json({
      text,
      placeholders,
      originalBuffer: base64Buffer,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document' },
      { status: 500 }
    );
  }
}
