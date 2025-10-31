import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, currentPlaceholder, chatHistory } = await request.json();

    const systemPrompt = `You are helping fill in a legal document placeholder.
Current placeholder: "${currentPlaceholder.original}"
Description: ${currentPlaceholder.description}

Your job:
1. Understand the user's natural language response
2. Extract the exact value to fill in the placeholder
3. Respond conversationally while confirming the value
4. Format the value appropriately (e.g., dates, currency, proper names)

Respond in this JSON format:
{
  "message": "your conversational response",
  "extractedValue": "the formatted value to use",
  "needsConfirmation": true/false
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: message },
      ],
      temperature: 0.7,
    });

    const responseContent = completion.choices[0].message.content || '{}';
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch {
      // Fallback if not JSON
      parsedResponse = {
        message: responseContent,
        extractedValue: message,
        needsConfirmation: false,
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
