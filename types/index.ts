export interface Placeholder {
  id: string;
  name: string;
  original: string;
  description: string;
  position: number;
  filled?: boolean;
  value?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface DocumentState {
  originalText: string;
  originalBuffer: ArrayBuffer | null;
  placeholders: Placeholder[];
  filledValues: Record<string, string>;
  currentPlaceholderIndex: number;
  isComplete: boolean;
}
