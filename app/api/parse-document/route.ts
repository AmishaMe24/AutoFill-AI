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
        model: 'llama-3.3-70b-versatile',
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
