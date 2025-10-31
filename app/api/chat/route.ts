import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
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
5. Do NOT use asterisks (**) or emojis in your responses
6. For currency amounts, do NOT add dollar signs ($) if the placeholder already contains them
7. Keep responses clean and professional without special formatting and without any emojis.

Respond in this JSON format:
{
  "message": "your conversational response without asterisks or emojis",
  "extractedValue": "the formatted value to use",
  "needsConfirmation": true/false
}`;

    const completion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-120b',
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
