# AI Resume Analyzer

A ready-to-run MERN-style project for AI-powered resume analysis.

## Features
- Upload a PDF resume
- Extract resume text
- AI analysis with ATS-style score, strengths, weaknesses, missing keywords, skills and recommendations
- Paste a job description for job-match analysis
- Clean React dashboard
- Optional MongoDB storage
- Works with OpenAI Responses API when `OPENAI_API_KEY` is configured
- Includes a local fallback analyzer so the UI can be tested without an API key

## Requirements
- Node.js 20+ recommended
- MongoDB is optional
- OpenAI API key is optional for the fallback mode

## Run

### Backend
```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

On PowerShell, `copy` can also be:
```powershell
Copy-Item .env.example .env
```

### Frontend
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally http://localhost:5173.

## Environment variables

Backend `.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_resume_analyzer
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
CLIENT_URL=http://localhost:5173
```

If `OPENAI_API_KEY` is empty, the app uses the built-in rule-based fallback. For real AI analysis, add your own API key on the backend only.

## Important
Never put your API key in the React frontend or commit `.env` to GitHub.
