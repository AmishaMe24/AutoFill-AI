import { NextRequest, NextResponse } from 'next/server';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface Placeholder {
  id: string;
  name: string;
  original: string;
  description: string;
  position: number;
}

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

    let placeholders: Placeholder[] = [];

    // Use LLM to comprehensively find all placeholders in the document
    if (process.env.GROQ_API_KEY) {
      try {
        const completion = await groq.chat.completions.create({
          model: 'openai/gpt-oss-20b',
          messages: [
            {
              role: 'system',
              content: `You are an expert document analyzer specializing in identifying ALL types of placeholders and fillable fields in legal and business documents.

Your task is to find EVERY placeholder, variable, or field that needs to be filled in the document, regardless of format. This includes:

1. Bracketed placeholders: [Company Name], [Date], [Amount], etc.
2. Curly brace placeholders: {company}, {investor_name}, {date}, etc.
3. Underscored blanks: ____________, _____, etc.
4. Text patterns like "COMPANY NAME", "DATE:", "AMOUNT:", etc.
5. Form fields and any other fillable content
6. Signature lines, date lines, and other completion fields
7. Any text that appears to be a placeholder even without brackets

For each placeholder found, determine:
- The exact text as it appears in the document
- A normalized identifier (lowercase, underscores)
- A clear description of what should be filled in
- The approximate position in the document

Return ONLY a valid JSON array with this exact structure:
[
  {
    "id": "1",
    "name": "company_name", 
    "original": "[Company Name]",
    "description": "The legal name of the company",
    "position": 150
  }
]

Be thorough - find ALL placeholders, even if they use different formats or are subtle. Include variations of the same concept (e.g., "Company Name" and "COMPANY" should both be found).`,
            },
            {
              role: 'user',
              content: `Analyze this document text and find ALL placeholders that need to be filled:\n\n${text}`,
            },
          ],
          temperature: 0,
          max_tokens: 4000,
        });

        const responseContent = completion.choices[0].message.content || '[]';
        console.log('LLM placeholder detection response:', responseContent);
        
        // Strip markdown code blocks if present
        const cleanedContent = responseContent
          .replace(/^```json\s*/i, '')  // Remove opening ```json
          .replace(/```\s*$/, '')       // Remove closing ```
          .trim();
        
        try {
          const llmPlaceholders = JSON.parse(cleanedContent);
          if (Array.isArray(llmPlaceholders)) {
            placeholders = llmPlaceholders;
            console.log(`LLM found ${placeholders.length} placeholders`);
          } else {
            throw new Error('Response is not an array');
          }
        } catch (parseError) {
          console.warn('LLM response parse failed, falling back to regex detection:', parseError);
          // Fallback to original regex method
          const curlyMatches = text.match(/\{[^}]+\}/g) || [];
          const bracketMatches = text.match(/\[[^\]]+\]/g) || [];
          const tags = [...new Set([...curlyMatches, ...bracketMatches])];

          const normalizeName = (token: string) => {
            const inner = token.slice(1, -1).trim();
            return inner.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          };

          placeholders = tags.map((t, i) => ({
            id: (i + 1).toString(),
            name: normalizeName(t),
            original: t,
            description: `Fill in the ${t.slice(1, -1).trim()} field`,
            position: text.indexOf(t),
          }));
        }
      } catch (aiError) {
        console.warn('LLM placeholder detection failed, using regex fallback:', aiError);
        // Fallback to original regex method
        const curlyMatches = text.match(/\{[^}]+\}/g) || [];
        const bracketMatches = text.match(/\[[^\]]+\]/g) || [];
        const tags = [...new Set([...curlyMatches, ...bracketMatches])];

        const normalizeName = (token: string) => {
          const inner = token.slice(1, -1).trim();
          return inner.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        };

        placeholders = tags.map((t, i) => ({
          id: (i + 1).toString(),
          name: normalizeName(t),
          original: t,
          description: `Fill in the ${t.slice(1, -1).trim()} field`,
          position: text.indexOf(t),
        }));
      }
    } else {
      // No API key, use regex fallback
      const curlyMatches = text.match(/\{[^}]+\}/g) || [];
      const bracketMatches = text.match(/\[[^\]]+\]/g) || [];
      const tags = [...new Set([...curlyMatches, ...bracketMatches])];

      const normalizeName = (token: string) => {
        const inner = token.slice(1, -1).trim();
        return inner.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      };

      placeholders = tags.map((t, i) => ({
        id: (i + 1).toString(),
        name: normalizeName(t),
        original: t,
        description: `Fill in the ${t.slice(1, -1).trim()} field`,
        position: text.indexOf(t),
      }));
    }

    const base64Buffer = buffer.toString('base64');

    return NextResponse.json({
      text,
      placeholders,
      originalBuffer: base64Buffer,
      detectionMethod: process.env.GROQ_API_KEY ? 'llm' : 'regex',
      totalPlaceholders: placeholders.length,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document' },
      { status: 500 }
    );
  }
}
