# Laak AI – Matematiikka-apin

Matematiikan opiskeluapin lääkiksen pääsykokeisiin valmistautumiseen.

## 🚀 Features

- **AI-powered math tutoring** - Single AI agent for all interactions
- **Rich math editor** - LaTeX support with inline formula editing
- **Real-time chat** - ChatGPT-style interface for asking questions
- **Calculator integration** - AI can perform mathematical calculations
- **Multiple difficulty levels** - Perusteet, +, ++, +++
- **Subscription-based** - Stripe integration with 3 tiers

## 🏗️ Architecture

### Single AI Agent System
- **One API endpoint**: `/api/math/coach` handles all AI interactions
- **Two tools**: Calculator and Editor insertion
- **Simple workflow**: User question → AI response → Optional editor insertion

### Core Components
- `MathChat` - Chat interface with LaTeX rendering
- `RichMathEditor` - Word-like editor with inline LaTeX formulas
- `SolveWorkspace` - Dual-pane layout (chat + editor)

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes
- **AI**: OpenAI GPT-4o-mini with function calling
- **Database**: Firebase Firestore
- **Auth**: Google Firebase Auth
- **Payments**: Stripe
- **LaTeX**: KaTeX rendering

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```env
   OPENAI_API_KEY=your_openai_key
   FIREBASE_PROJECT_ID=your_project_id
   STRIPE_SECRET_KEY=your_stripe_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

3. **Run development server**
```bash
npm run dev
   ```

## 📁 Project Structure

```
laakaii/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication
│   │   ├── math/          # Math tutoring APIs
│   │   └── stripe/        # Payment handling
│   └── app/               # Protected app pages
├── components/            # React components
│   ├── MathChat.tsx       # Chat interface
│   ├── RichMathEditor.tsx # Math editor
│   └── SolveWorkspace.tsx # Main workspace
├── lib/                   # Utility functions
│   ├── auth.ts           # Authentication helpers
│   ├── stripe.ts         # Stripe configuration
│   └── firebase/         # Firebase setup
└── types/                # TypeScript definitions
```

## 🎯 How It Works

1. **User selects difficulty level** and gets a math problem
2. **AI automatically inserts the problem** into the editor
3. **User can ask questions** in the chat interface
4. **AI responds with explanations** and can insert formulas into the editor
5. **Calculator tool** ensures accurate mathematical calculations

## 🔧 API Endpoints

- `POST /api/math/coach` - Main AI tutoring endpoint
- `POST /api/math/generate` - Generate new math problems
- `POST /api/auth/session` - Handle authentication
- `POST /api/stripe/checkout` - Create payment sessions

## 🎨 UI/UX

- **Minimalist design** - OpenAI-style interface
- **Responsive layout** - Works on desktop and tablet
- **Intuitive editing** - Click formulas to edit, press Enter to commit
- **Real-time LaTeX** - Formulas render instantly as you type

## 🔒 Security

- **Session-based auth** - Secure cookie handling
- **Protected routes** - Middleware guards app pages
- **Stripe webhooks** - Secure payment processing
- **Input validation** - Safe mathematical expression evaluation

## 🚀 Deployment

Ready for deployment on Vercel, Netlify, or any Next.js-compatible platform.
