# Legal Document Filler

<img width="1814" height="1080" alt="image" src="https://github.com/user-attachments/assets/03c246e1-2357-422c-b2dc-88624534a709" />
<img width="1814" height="1080" alt="image" src="https://github.com/user-attachments/assets/0d8d7ed9-d460-4104-9627-ff9d1fc148b0" />


This is a [Next.js](https://nextjs.org) application that helps you fill legal documents by automatically detecting placeholders and providing an interactive chat interface to collect the required information.

## Features

- Upload .docx legal documents
- Automatic detection of placeholders in `{{placeholder}}` and `[placeholder]` formats
- Interactive chat interface powered by Groq AI to collect placeholder values
- Document preview with filled values
- Download completed documents with original formatting preserved

## Environment Variables

Create a `.env.local` file in the root directory and add your Groq API key:

```
GROQ_API_KEY=your_groq_api_key_here
```

You can get a free API key from [Groq Console](https://console.groq.com/).

## Getting Started

First, install dependencies and run the development server:

```bash
npm install
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
