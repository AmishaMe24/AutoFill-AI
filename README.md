# Legal Document Filler

<img width="1814" height="1080" alt="Legal Document Filler Interface" src="https://github.com/user-attachments/assets/03c246e1-2357-422c-b2dc-88624534a709" />
<img width="1814" height="1080" alt="Document Preview with Chat Interface" src="https://github.com/user-attachments/assets/0d8d7ed9-d460-4104-9627-ff9d1fc148b0" />

## Overview

Legal Document Filler is an intelligent web application that streamlines the process of filling legal documents by automatically detecting placeholders and providing an AI-powered chat interface to collect required information. The application combines document processing, natural language processing, and real-time preview capabilities to create a seamless document completion experience.

## 🚀 Features

- **Smart Document Upload**: Support for .docx legal documents with automatic placeholder detection
- **AI-Powered Placeholder Detection**: Automatically identifies placeholders in multiple formats (`{{placeholder}}`, `[placeholder]`, `{placeholder}`)
- **Intelligent Chat Interface**: Groq AI-powered conversational interface that guides users through filling each placeholder
- **Real-Time Document Preview**: Live preview showing filled values as they're entered, with both rich (docx-preview) and text fallback modes
- **Position-Based Replacement**: Advanced numbering system that handles duplicate placeholder names correctly
- **Document Generation**: Download completed documents with original formatting preserved
- **Responsive Design**: Modern, mobile-friendly interface built with Tailwind CSS

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.0.1** - React framework with App Router
- **React 19.2.0** - UI library with latest features
- **TypeScript 5** - Type safety and developer experience
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Beautiful and accessible component library built on Shadcn UI
- **Lucide React** - Modern icon library

### Backend & APIs
- **Next.js API Routes** - Serverless API endpoints
- **Groq SDK** - AI model integration for chat and document analysis
- **OpenAI GPT-OSS-20B** - High-performance language model for document processing

### Document Processing
- **Docxtemplater** - DOCX template processing and manipulation
- **PizZip** - ZIP file handling for DOCX structure
- **docx-preview** - Rich document preview rendering
- **file-saver** - Client-side file downloads

### Development Tools
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **tw-animate-css** - Animation utilities

## 🏗️ Architecture & Flow

### Application Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Upload   │───▶│  Document Parser │───▶│  AI Processor   │
│   Component     │    │     (API)        │    │     (Groq)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Document      │◀───│   Main Page      │───▶│  Chat Interface │
│   Preview       │    │   (State Mgmt)   │    │   Component     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Document Gen    │
                       │     (API)        │
                       └──────────────────┘
```

### Data Flow
1. **Document Upload**: User uploads .docx file via FileUpload component
2. **Parsing**: `/api/parse-document` extracts text and identifies placeholders using AI
3. **State Management**: Main page manages placeholders, filled values, and document state
4. **Interactive Filling**: ChatInterface guides users through each placeholder with AI assistance
5. **Real-Time Preview**: DocumentPreview shows live updates as values are filled
6. **Document Generation**: `/api/generate-document` creates final document with filled values

## 🎯 Technical Challenges & Solutions

### 1. **Placeholder Numbering System**
**Challenge**: Handling duplicate placeholder names (e.g., multiple `{Company Name}` instances)
**Solution**: Implemented position-based numbering system that creates unique identifiers (`company_name_1`, `company_name_2`) while maintaining original text positions for accurate replacement.

### 2. **Real-Time Document Preview**
**Challenge**: Updating document preview in real-time while maintaining DOCX formatting
**Solution**: Dual preview system with rich docx-preview for formatted view and text fallback, both using the same position-based replacement logic.

### 3. **AI-Powered Placeholder Detection**
**Challenge**: Accurately identifying and describing various placeholder formats in legal documents with the initial GPT-OSS-20B model showing suboptimal performance
**Solution**: Upgraded to GPT-OSS-20B model for significantly better accuracy and implemented comprehensive prompt engineering for legal document understanding.

### 4. **Smart Chat Progression**
**Challenge**: Efficiently handling related placeholders and avoiding redundant questions
**Solution**: Implemented automatic filling of related numbered placeholders and smart progression that skips already-filled fields.

### 5. **Document Structure Preservation**
**Challenge**: Maintaining original DOCX formatting while replacing placeholders
**Solution**: Used Docxtemplater with PizZip to manipulate document XML structure directly, preserving all formatting, styles, and layout.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm
- Groq API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd legal-doc-filler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
   Get your free API key from [Groq Console](https://console.groq.com/)

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Usage

1. **Upload Document**: Click "Upload Document" and select a .docx file with placeholders
2. **AI Processing**: The system automatically detects and analyzes placeholders
3. **Fill Information**: Use the chat interface to provide values for each placeholder
4. **Preview**: Watch the document update in real-time as you fill in values
5. **Download**: Click "Download Completed Document" to get your filled document

## 📁 Project Structure

```
legal-doc-filler/
├── app/
│   ├── api/
│   │   ├── chat/              # AI chat endpoint
│   │   ├── generate-document/ # Document generation API
│   │   └── parse-document/    # Document parsing API
│   ├── globals.css           # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main application page
├── components/
│   ├── ChatInterface.tsx    # AI chat component
│   ├── DocumentPreview.tsx  # Document preview component
│   ├── FileUpload.tsx       # File upload component
│   ├── Hero.tsx             # Landing section
│   └── ui/                  # Reusable UI components
├── lib/
│   └── utils.ts             # Utility functions
├── types/
│   └── index.ts             # TypeScript type definitions
└── public/                  # Static assets
```

## 🔧 API Endpoints

- `POST /api/parse-document` - Analyzes uploaded document and extracts placeholders
- `POST /api/chat` - Handles AI chat interactions for placeholder filling
- `POST /api/generate-document` - Generates final document with filled values

## 🚀 Deployment

The application is optimized for deployment on Vercel:

```bash
npm run build
```

For other platforms, ensure environment variables are properly configured.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for high-performance AI inference
- [Docxtemplater](https://docxtemplater.com/) for document processing capabilities
- [shadcn/ui](https://ui.shadcn.com/) for beautiful and accessible component library

