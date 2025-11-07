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

##  Local Setup Instructions

### Prerequisites

- **Node.js**: v18 or later
- **npm**: v8 or later
- **Python**: v3.8 or later

---

###  Backend Setup

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

###  Frontend Setup

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

and partner with career platforms like LinkedIn. Join us in revolutionizing upskilling—your next great hire or job is just a mock interview away!
