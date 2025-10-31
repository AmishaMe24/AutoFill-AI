import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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

    // Extract text from docx
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    // Use OpenAI to detect placeholders
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a legal document analyzer. Identify all placeholders in documents that need to be filled. 
          Placeholders can be in formats like: [PLACEHOLDER], {{placeholder}}, __PLACEHOLDER__, or similar patterns.
          Return ONLY a valid JSON array with this exact structure, no additional text:
          [{"id": "1", "name": "descriptive_name", "original": "[EXACT TEXT]", "description": "what information is needed", "position": 0}]`,
        },
        {
          role: 'user',
          content: `Analyze this legal document and extract all placeholders:\n\n${text}`,
        },
      ],
      temperature: 0.3,
    });

    const responseContent = completion.choices[0].message.content || '[]';
    
    // Parse the JSON response
    let placeholders;
    try {
      placeholders = JSON.parse(responseContent);
    } catch (parseError) {
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = responseContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        placeholders = JSON.parse(jsonMatch[0]);
      } else {
        placeholders = [];
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
