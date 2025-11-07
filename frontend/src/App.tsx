import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ResumeUploader } from './components/ResumeUploader';
import { JobDescriptionUploader } from './components/JobDescriptionUploader';
import { ATSScoreDisplay } from './components/ATSScoreDisplay';
import { InterviewScreen } from './components/InterviewScreen';
import { AppState, InterviewStage, Message, InterviewQuestion, ATSScoreResult } from './types';
import { generateQuestions, evaluateAnswer } from './services/geminiService';

// Resume text will be read from uploaded file

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [atsResult, setAtsResult] = useState<ATSScoreResult | null>(null);
  const ai = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    // Initialize AI for TTS if API key is available
    if (import.meta.env.VITE_API_KEY) {
      ai.current = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });
    }
    
    // Load voices for speech synthesis (some browsers need this)
    if ('speechSynthesis' in window) {
      // Chrome needs voices to be loaded
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  const handleResumeAnalysis = useCallback(async (file: File) => {
    setResumeFile(file);
    setAppState(AppState.ANALYZING);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:8000/analyze-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();

      // Validate response structure
      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid response format from server');
      }

      setQuestions(data.questions);
      setMessages([]);
      setCurrentQuestionIndex(0);
      setAppState(AppState.READY);
    } catch (e) {
      console.error('Resume analysis error:', e);
      const errorMessage = e instanceof Error ? e.message : "Failed to generate questions. Please try again.";
      setError(errorMessage);
      setAppState(AppState.IDLE);
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1;
      utterance.volume = 1;
      
      // Try to use a more natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google') || 
        voice.name.includes('Natural') ||
        voice.lang.startsWith('en')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported in this browser');
    }
  }, []);

  const askQuestion = useCallback(async (index: number) => {
    if (index >= questions.length) {
        setAppState(AppState.COMPLETED);
        return;
    }
    const question = questions[index];
    const questionMessage: Message = { type: 'ai', stage: InterviewStage.QUESTION, content: question.question };
    setMessages(prev => [...prev, questionMessage]);

    // Read out the question using browser TTS
    speakText(question.question);
  }, [questions, speakText]);

  const startInterview = useCallback(async () => {
    setAppState(AppState.INTERVIEWING);
    const introText = "I have analyzed your resume and have a few questions. Let's start with the first one.";
    const introMessage: Message = { type: 'ai', stage: InterviewStage.INTRODUCTION, content: introText };
    setMessages([introMessage]);

    // Read out the introduction
    speakText(introText);

    // Wait a bit before asking the first question so intro can finish
    setTimeout(() => {
      askQuestion(0);
    }, 4000); // Increased from 2000 to 4000 to allow full reading
  }, [questions, askQuestion, speakText]);

  const handleAnswerSubmission = useCallback(async (answer: string) => {
    const answerMessage: Message = { type: 'user', stage: InterviewStage.ANSWER, content: answer };
    setMessages(prev => [...prev, answerMessage]);

    // Set a temporary feedback message
    const tempFeedbackMessage: Message = { type: 'ai', stage: InterviewStage.FEEDBACK, content: 'Evaluating your answer...' };
    setMessages(prev => [...prev, tempFeedbackMessage]);

    try {
        const currentQuestion = questions[currentQuestionIndex];
        console.log('Submitting answer for evaluation:', {
            question: currentQuestion.question,
            answer: answer.substring(0, 100) + '...',
            type: currentQuestion.type
        });
        
        const response = await fetch('http://localhost:8000/evaluate-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                question: currentQuestion.question, 
                answer,
                type: currentQuestion.type 
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to evaluate answer');
        }

        const { feedback, score } = await response.json();

        // Replace the temporary message with the actual feedback
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { type: 'ai', stage: InterviewStage.FEEDBACK, content: feedback, score };
            return newMessages;
        });

        // Use browser TTS for feedback intro
        speakText("Thank you. Here's some feedback on your response.");

    } catch (e) {
        console.error("Failed to get feedback:", e);
        const errorMessage = "Sorry, I couldn't evaluate your answer right now.";
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { type: 'ai', stage: InterviewStage.FEEDBACK, content: errorMessage, score: 0 };
            return newMessages;
        });
    }
  }, [currentQuestionIndex, questions, speakText]);
  
  const handleNextQuestion = useCallback(() => {
      console.log('handleNextQuestion called', { currentQuestionIndex, totalQuestions: questions.length });
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
          setCurrentQuestionIndex(nextIndex);
          askQuestion(nextIndex);
      } else {
          setAppState(AppState.COMPLETED);
          const completionMessage: Message = { type: 'ai', stage: InterviewStage.CONCLUSION, content: "That's all the questions I have. The interview is now complete. Well done!" };
          setMessages(prev => [...prev, completionMessage]);
      }
  }, [currentQuestionIndex, questions.length, askQuestion]);


  const handleCheckATS = useCallback((file: File) => {
    setResumeFile(file);
    setAppState(AppState.ATS_UPLOAD);
    setError(null);
  }, []);

  const handleBackToResume = useCallback(() => {
    setAppState(AppState.IDLE);
  }, []);

  const handleJobDescriptionUpload = useCallback(async (jobDescriptionText: string) => {
  if (!resumeFile) {
    setError("No resume file found. Please upload a resume first.");
    return;
  }

  setAppState(AppState.ANALYZING);
  setError(null);

  try {
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('job_description_text', jobDescriptionText); // ✅ send text instead of file

    const response = await fetch('http://localhost:8000/check-ats-score', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    const result = await response.json();

    if (typeof result.score !== 'number' || !result.analysis || !Array.isArray(result.tips)) {
      throw new Error('Invalid response format from server');
    }

    setAtsResult(result);
    setAppState(AppState.ATS_RESULT);
  } catch (e) {
    console.error('ATS score check error:', e);
    const errorMessage = e instanceof Error ? e.message : "Failed to check ATS score. Please try again.";
    setError(errorMessage);
    setAppState(AppState.ATS_UPLOAD);
  }
}, [resumeFile]);

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
      case AppState.ANALYZING:
        return <ResumeUploader onUpload={handleResumeAnalysis} onCheckATS={handleCheckATS} isLoading={appState === AppState.ANALYZING} error={error} resumeFile={resumeFile} />;
      case AppState.ATS_UPLOAD:
  return (
    <JobDescriptionUploader
      onUpload={handleJobDescriptionUpload} // ✅ now expects string
      onBack={handleBackToResume}
      isLoading={false}
      error={error}
    />
  );

        case AppState.ATS_RESULT:
        return atsResult ? <ATSScoreDisplay result={atsResult} onBack={handleBackToResume} /> : <div>Loading...</div>;
      case AppState.READY:
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <h2 className="text-3xl font-bold mb-4 text-cyan-400">Your Interview is Ready</h2>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl">
              I've analyzed your resume and prepared {questions.length} questions to help you practice. When you're ready, let's begin.
            </p>
            <div className="flex flex-row space-x-4">
              <button
                onClick={startInterview}
                className="flex-1 px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                Start Interview
              </button>
              <button
                onClick={() => handleCheckATS(resumeFile!)}
                className="flex-1 px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-full shadow-lg transition-transform transform hover:scale-105"
              >
                Check ATS Score
              </button>
            </div>
          </div>
        );
      case AppState.INTERVIEWING:
      case AppState.COMPLETED:
        return (
          <InterviewScreen
            messages={messages}
            onAnswerSubmit={handleAnswerSubmission}
            onNextQuestion={handleNextQuestion}
            isCompleted={appState === AppState.COMPLETED}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
          />
        );
      default:
        return <div className="text-center p-8">Something went wrong.</div>;
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-gray-800 rounded-2xl shadow-2xl flex flex-col border border-gray-700">
        <header className="p-4 border-b border-gray-700 flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-cyan-400 animate-pulse"></div>
            <h1 className="text-xl font-bold text-gray-200">AI Interview Warmup</h1>
        </header>
        <div className="flex-grow overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </main>
  );
}