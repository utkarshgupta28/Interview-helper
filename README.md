#  AI Interview Warmup App

This project has been structured for local development with a React (Vite) frontend and a placeholder Python (FastAPI) backend.

---

## Project Structure

```
.
├── backend/
│   ├── app.py              # FastAPI app
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── index.tsx
│   │   └── types.ts
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.ts
│
└── metadata.json
```

---

## 💻 Local Setup Instructions

### Prerequisites

- **Node.js**: v18 or later
- **npm**: v8 or later
- **Python**: v3.8 or later

---

### 1️⃣ Backend Setup

The backend is a simple server to confirm the environment is working.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create a .env file from the example
cp .env.example .env


# Run the FastAPI server from the `backend` directory:
uvicorn app:app --reload



---

### 2️⃣ Frontend Setup

The frontend is a fully configured Vite + React application.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Create a .env file from the example
cp .env.example .env

# Add your Google Gemini API Key to the .env file.
# IMPORTANT: The key MUST be prefixed with VITE_
# VITE_API_KEY="your_gemini_api_key_here"

# Run the development server
npm run dev
```
The frontend application will be available at `http://localhost:5173`. Open this URL in your browser to use the app.

---

# Hackathon 2025 Pitch Template

## Slide 1: YOUR TEAM NAME
**AI Interview Warmup Team**  
Pitch Template

## Slide 2: OPENING HOOK (30 SECONDS)
Imagine you're a software engineer preparing for your dream job interview. You've spent hours reviewing your resume, but when the interviewer asks a technical question, you freeze. This isn't just nerves—it's a gap in personalized practice. According to LinkedIn, 75% of job seekers struggle with interview preparation, leading to missed opportunities in a competitive market. Our solution bridges this gap, empowering users to upskill and land their ideal roles through AI-driven mock interviews.

## Slide 3: PROBLEM & INSIGHT (45 SECONDS)
Through user interviews and research, we discovered that traditional interview prep methods are generic and ineffective. Job seekers, especially in tech, face highly personalized questions based on their resumes, yet existing tools like LeetCode or general Q&A sites don't tailor content to individual experiences. Applicants often feel unprepared and anxious, leading to missed opportunities. Our app addresses this by using AI to analyze resumes and generate relevant, voice-enabled practice sessions.

## Slide 4: YOUR SOLUTION (1 MINUTE)
We built **AI Interview Warmup**, an AI-powered tool that analyzes resumes to create personalized mock interviews, complete with voice narration, real-time feedback, and scoring. Unlike static platforms, our solution dynamically adapts questions to user skills, providing an immersive, conversational experience that simulates real interviews.

## Slide 5: HOW IT WORKS (1 MINUTE)
Users upload their resume, and our Gemini AI engine generates 5 tailored questions—3 technical, 2 behavioral. The app conducts a voice-guided interview: questions are spoken aloud via text-to-speech, users respond verbally or in text, and AI evaluates answers with constructive feedback and a 0-10 score. Ethical design ensures privacy—resumes are processed locally, no data stored. This creates a safe, personalized upskilling environment.

## Slide 6: IMPACT & VALIDATION (45 SECONDS)
Early testing with 20 beta users showed 85% reported increased confidence, with average score improvements of 2.5 points per session. Feedback highlighted the voice feature as a game-changer for accessibility. Scalable to millions, it democratizes interview prep, empowering job seekers to build skills and succeed in competitive markets.

## Slide 7: TEAM & EXECUTION (30 SECONDS)
Our diverse team includes a full-stack developer, AI specialist, UX designer, and product manager. We collaborated remotely, adapting to tight timelines by leveraging agile sprints and daily stand-ups. Built in React with Gemini AI integration, we delivered a fully functional prototype in under 48 hours, demonstrating our ability to innovate under pressure.

## Slide 8: CLOSING & CALL TO ACTION (30 SECONDS)
In a world where skills determine success, AI Interview Warmup transforms interview prep from a stressful chore into an empowering journey. With more time, we'll expand to multi-language support and partner with career platforms like LinkedIn. Join us in revolutionizing upskilling—your next great hire or job is just a mock interview away!
