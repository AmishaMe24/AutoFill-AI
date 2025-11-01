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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const zip = new PizZip(buffer);

    const documentXml = zip.file('word/document.xml');
    if (documentXml) {
      let xml = documentXml.asText();
      
      xml = xml.replace(/\[([^\]]+)\]/g, '{$1}');
      zip.file('word/document.xml', xml);
    }

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });
    const text = doc.getFullText();
    
    let placeholders: Placeholder[] = [];

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'LLM API key not configured. Please set GROQ_API_KEY environment variable.' },
        { status: 500 }
      );
    }

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
4. Text patterns like "By:_______", "Name:______", "Title:______", etc.
5. Form fields and any other fillable content
6. Signature lines, date lines, and other completion fields
7. Any text that appears to be a placeholder even without brackets

CRITICAL NAMING CONVENTION: When you find multiple placeholders with the same concept (like "Name:" appearing in different sections), use a numbering system:
- First occurrence: "name_1"
- Second occurrence: "name_2" 
- Third occurrence: "name_3"
- And so on...

Examples:
- If you find "Name:" in company section and "Name:" in investor section, name them "name_1" and "name_2"
- If you find "Address:" twice, name them "address_1" and "address_2"
- If you find "By:" multiple times, name them "by_1", "by_2", etc.
- If you find "Email:" twice, name them "email_1" and "email_2"

For each placeholder found, determine:
- The exact text as it appears in the document
- A normalized identifier using the numbering system (lowercase, underscores, with _1, _2, etc.)
- A clear description that indicates which occurrence this is (e.g., "First name field", "Second name field")
- The approximate position in the document

Return ONLY a valid JSON array with this exact structure:
[
  {
    "id": "1",
    "name": "name_1", 
    "original": "Name:",
    "description": "First name field in the document",
    "position": 150
  },
  {
    "id": "2",
    "name": "name_2", 
    "original": "Name:",
    "description": "Second name field in the document",
    "position": 250
  }
]

Be thorough - find ALL placeholders and use the numbering system for any duplicates.`,
          },
          {
            role: 'user',
            content: `Analyze this document text and find ALL placeholders that need to be filled:\n\n${text}`,
          },
        ],
        temperature: 0,
        max_tokens: 8000,
      });

      const responseContent = completion.choices[0].message.content || '[]';
      let cleanedContent = responseContent;

      // First try to extract JSON array from response
      const jsonStart = cleanedContent.indexOf('[');
      const jsonEnd = cleanedContent.lastIndexOf(']');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
      } else {
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.slice(7);
        }
        if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.slice(3);
        }
        if (cleanedContent.endsWith('```')) {
          cleanedContent = cleanedContent.slice(0, -3);
        }
      }

      cleanedContent = cleanedContent.trim();
      
      const llmPlaceholders = JSON.parse(cleanedContent);
      if (Array.isArray(llmPlaceholders)) {
        placeholders = llmPlaceholders;
        console.log(`LLM found ${placeholders.length} placeholders`);
        console.log('JSON Placeholders:', JSON.stringify(placeholders, null, 2));
      } else {
        throw new Error('LLM returned invalid format - expected array');
      }
    } catch (error) {
      console.error('LLM placeholder detection failed:', error);
      return NextResponse.json(
        { error: 'Failed to analyze document placeholders', details: String(error) },
        { status: 500 }
      );
    }

    const convertedBuffer = Buffer.from(zip.generate({ type: 'nodebuffer' }));
    const base64Buffer = convertedBuffer.toString('base64');

    return NextResponse.json({
      text,
      placeholders,
      originalBuffer: base64Buffer,
      detectionMethod: 'llm-only',
      totalPlaceholders: placeholders.length,
    });
  } catch (error) {
    console.error('Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse document', details: String(error) },
      { status: 500 }
    );
  }
}
