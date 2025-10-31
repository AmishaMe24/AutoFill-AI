'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ChatMessage, Placeholder } from '@/types';

interface ChatInterfaceProps {
  placeholders: Placeholder[];
  onComplete: (filledValues: Record<string, string>) => void;
}

export default function ChatInterface({
  placeholders,
  onComplete,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filledValues, setFilledValues] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentPlaceholder = placeholders[currentIndex];

  useEffect(() => {
    if (placeholders.length > 0) {
      const welcomeMessage: ChatMessage = {
        id: '0',
        role: 'assistant',
        content: `Great! I found ${placeholders.length} placeholder${
          placeholders.length > 1 ? 's' : ''
        } in your document. Let's fill them in together. 

${currentPlaceholder.description}`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
  }, [placeholders]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          currentPlaceholder,
          chatHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      const newFilledValues = {
        ...filledValues,
        [currentPlaceholder.original]: data.extractedValue,
      };
      setFilledValues(newFilledValues);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      if (currentIndex < placeholders.length - 1) {
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
          const nextPlaceholder = placeholders[currentIndex + 1];
          const nextMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content: `Perfect! Next: ${nextPlaceholder.description}`,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, nextMessage]);
        }, 1000);
      } else {
        setTimeout(() => {
          const doneMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            role: 'assistant',
            content:
              'All placeholders filled! Your document is ready. Click "Download Document".',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, doneMessage]);
          onComplete(newFilledValues);
        }, 1000);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Progress indicator */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium">
            Progress: {currentIndex + 1} / {placeholders.length}
          </span>
          <span className="text-gray-600">
            {Math.round(
              ((currentIndex + 1) / placeholders.length) * 100
            )}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{
              width: `${((currentIndex + 1) / placeholders.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your response..."
            disabled={isProcessing || currentIndex >= placeholders.length}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
          >
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
