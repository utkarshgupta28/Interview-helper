import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Type as GeminiType } from "@google/genai";
import { ResumeUploader } from './components/ResumeUploader';
import { InterviewScreen } from './components/InterviewScreen';
import { AppState, InterviewStage, Message, InterviewQuestion } from './types';
import { generateQuestions, evaluateAnswer, textToSpeech } from './services/geminiService';
import { decode } from './utils/audioUtils';

// Mock resume text for demonstration purposes as frontend cannot parse files.
const MOCK_RESUME_TEXT = `
John Doe - Senior Software Engineer

Summary:
Experienced Senior Software Engineer with 8+ years in building scalable web applications. Proficient in JavaScript, React, Node.js, and cloud technologies like AWS. Proven track record of leading projects and mentoring junior developers.

Experience:
- Senior Software Engineer, TechCorp (2018-Present)
  - Led the development of a real-time analytics dashboard using React and WebSockets.
  - Architected and implemented a microservices-based backend on AWS Lambda.
- Software Engineer, Innovate LLC (2015-2018)
  - Developed and maintained features for a large-scale e-commerce platform.

Skills:
- Languages: JavaScript, TypeScript, Python
- Frontend: React, Redux, Tailwind CSS
- Backend: Node.js, Express
- Cloud: AWS (EC2, S3, Lambda), Docker
`;

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ai = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } else {
      setError("API_KEY environment variable not set.");
    }
  }, []);

  const handleResumeAnalysis = useCallback(async (file: File) => {
    if (!ai.current) {
        setError("AI Service is not initialized.");
        return;
    }
    setAppState(AppState.ANALYZING);
    setError(null);
    try {
      const generatedQuestions = await generateQuestions(ai.current, MOCK_RESUME_TEXT);
      setQuestions(generatedQuestions);
      setMessages([]);
      setCurrentQuestionIndex(0);
      setAppState(AppState.READY);
    } catch (e) {
      console.error(e);
      setError("Failed to generate questions. Please try again.");
      setAppState(AppState.IDLE);
    }
  }, []);

  const startInterview = useCallback(async () => {
    if (!ai.current) return;
    setAppState(AppState.INTERVIEWING);
    const introText = "I have analyzed your resume and have a few questions. Let's start with the first one.";
    const introMessage: Message = { type: 'ai', stage: InterviewStage.INTRODUCTION, content: introText };
    setMessages([introMessage]);
    
    try {
        const audioData = await textToSpeech(ai.current, introText);
        await playAudio(audioData);
    } catch (e) {
        console.error("TTS failed for intro:", e);
    }
    
    askQuestion(0);
  }, [questions]);

  const askQuestion = useCallback(async (index: number) => {
    if (!ai.current || index >= questions.length) {
        setAppState(AppState.COMPLETED);
        return;
    }
    const question = questions[index];
    const questionMessage: Message = { type: 'ai', stage: InterviewStage.QUESTION, content: question.question };
    setMessages(prev => [...prev, questionMessage]);

    try {
        const audioData = await textToSpeech(ai.current, question.question);
        await playAudio(audioData);
    } catch (e) {
        console.error(`TTS failed for question ${index}:`, e);
    }
  }, [questions]);

  const handleAnswerSubmission = useCallback(async (answer: string) => {
    if (!ai.current) return;
    const answerMessage: Message = { type: 'user', stage: InterviewStage.ANSWER, content: answer };
    setMessages(prev => [...prev, answerMessage]);
    
    // Set a temporary feedback message
    const tempFeedbackMessage: Message = { type: 'ai', stage: InterviewStage.FEEDBACK, content: 'Evaluating your answer...' };
    setMessages(prev => [...prev, tempFeedbackMessage]);

    try {
        const currentQuestion = questions[currentQuestionIndex].question;
        const { feedback, score } = await evaluateAnswer(ai.current, currentQuestion, answer);
        
        // Replace the temporary message with the actual feedback
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { type: 'ai', stage: InterviewStage.FEEDBACK, content: feedback, score };
            return newMessages;
        });

        try {
            const feedbackIntro = "Thank you. Here's some feedback on your response.";
            const audioData = await textToSpeech(ai.current, feedbackIntro);
            await playAudio(audioData);
        } catch (e) {
            console.error("TTS failed for feedback intro:", e);
        }

    } catch (e) {
        console.error("Failed to get feedback:", e);
        const errorMessage = "Sorry, I couldn't evaluate your answer right now.";
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { type: 'ai', stage: InterviewStage.FEEDBACK, content: errorMessage, score: 0 };
            return newMessages;
        });
    }
  }, [currentQuestionIndex, questions]);
  
  const handleNextQuestion = () => {
      const nextIndex = currentQuestionIndex + 1;
      if (nextIndex < questions.length) {
          setCurrentQuestionIndex(nextIndex);
          askQuestion(nextIndex);
      } else {
          setAppState(AppState.COMPLETED);
          const completionMessage: Message = { type: 'ai', stage: InterviewStage.CONCLUSION, content: "That's all the questions I have. The interview is now complete. Well done!" };
          setMessages(prev => [...prev, completionMessage]);
      }
  };

  const playAudio = async (base64Audio: string) => {
    return new Promise<void>((resolve, reject) => {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioData = decode(base64Audio);
            const buffer = new Int16Array(audioData.buffer);
            const frameCount = buffer.length;
            const audioBuffer = audioContext.createBuffer(1, frameCount, 24000);
            const channelData = audioBuffer.getChannelData(0);

            for (let i = 0; i < frameCount; i++) {
                channelData[i] = buffer[i] / 32768.0;
            }

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => {
                audioContext.close();
                resolve();
            };
            source.start();
        } catch (e) {
            console.error("Audio playback failed:", e);
            reject(e);
        }
    });
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.IDLE:
      case AppState.ANALYZING:
        return <ResumeUploader onUpload={handleResumeAnalysis} isLoading={appState === AppState.ANALYZING} error={error} />;
      case AppState.READY:
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h2 className="text-3xl font-bold mb-4 text-cyan-400">Your Interview is Ready</h2>
      <p className="text-lg text-gray-300 mb-8 max-w-2xl">
        I've analyzed your resume and prepared {questions.length} questions to help you practice.
        When you're ready, let's begin.
      </p>
      <button
        onClick={startInterview}
        className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-full shadow-lg transition-transform transform hover:scale-105"
      >
        Start Interview
      </button>
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
