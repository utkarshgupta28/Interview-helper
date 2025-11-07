import React, { useState, useEffect, useRef } from 'react';
import { Message, InterviewStage } from '../types';
import { MicrophoneIcon, StopIcon, SendIcon, RobotIcon, UserIcon } from './Icons';
import { Spinner } from './Spinner';

interface InterviewScreenProps {
  messages: Message[];
  onAnswerSubmit: (answer: string) => void;
  onNextQuestion: () => void;
  isCompleted: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
}

const MarkdownRenderer = ({ content }: { content: string }) => {
    
    let htmlContent = content;
    
    const lines = htmlContent.split('\n');
    const processedLines: string[] = [];
    let inList = false;
    let listItems: string[] = [];
    let listType: 'ul' | 'ol' = 'ul';
    
    const flushList = () => {
        if (listItems.length > 0) {
            const tag = listType === 'ul' ? 'ul' : 'ol';
            const listClass = listType === 'ul' ? 'list-disc' : 'list-decimal';
            processedLines.push(`<${tag} class="${listClass} ml-6 mb-3 space-y-1">`);
            processedLines.push(...listItems);
            processedLines.push(`</${tag}>`);
            listItems = [];
            inList = false;
        }
    };
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
    
        if (trimmed.startsWith('### ')) {
            flushList();
            processedLines.push(`<h3 class="text-lg font-semibold mt-3 mb-2 text-cyan-200">${trimmed.substring(4)}</h3>`);
            continue;
        }
        if (trimmed.startsWith('## ')) {
            flushList();
            processedLines.push(`<h2 class="text-xl font-bold mt-4 mb-2 text-cyan-300">${trimmed.substring(3)}</h2>`);
            continue;
        }
        
  
        if (trimmed.startsWith('- ')) {
            if (!inList || listType !== 'ul') {
                flushList();
                inList = true;
                listType = 'ul';
            }
            let itemText = trimmed.substring(2);
            
            itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
            listItems.push(`<li class="ml-4 mb-1">${itemText}</li>`);
            continue;
        }
        
        
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
            if (!inList || listType !== 'ol') {
                flushList();
                inList = true;
                listType = 'ol';
            }
            let itemText = numberedMatch[2];
          
            itemText = itemText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
            listItems.push(`<li class="ml-4 mb-1">${itemText}</li>`);
            continue;
        }
        
        
        if (trimmed === '') {
            flushList();
            processedLines.push('');
            continue;
        }
        
      
        flushList();
        let paraText = trimmed;
        paraText = paraText.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
        processedLines.push(`<p class="mb-2 text-gray-200">${paraText}</p>`);
    }
    
    flushList();
    
    htmlContent = processedLines.join('\n');
    
    return (
        <div 
            className="prose prose-invert max-w-none text-gray-200"
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
    );
};

export const InterviewScreen: React.FC<InterviewScreenProps> = ({
  messages,
  onAnswerSubmit,
  onNextQuestion,
  isCompleted,
  currentQuestionIndex,
  totalQuestions
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length-1];
  const isFeedbackStage = lastMessage?.stage === 'FEEDBACK' && lastMessage.content !== 'Evaluating your answer...';

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      // Check if browser supports Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.");
        return;
      }

      // Initialize speech recognition
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript((prev) => {
          const prevFinal = prev.replace(/\s*\[listening\.\.\.\]\s*$/, '');
          return prevFinal + finalTranscript + (interimTranscript ? ' [listening...]' : '');
        });
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === 'no-speech') {
          return;
        }
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          alert("Microphone permission denied. Please allow microphone access and try again.");
        } else {
          alert(`Speech recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      console.error("Error starting speech recognition:", err);
      alert("Could not start speech recognition. Please check your browser permissions.");
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    setTranscript((prev) => prev.replace(/\s*\[listening\.\.\.\]\s*$/, '').trim());
    setIsRecording(false);
  };

  const handleSubmit = () => {
    
    const cleanedTranscript = transcript.replace(/\s*\[listening\.\.\.\]\s*$/, '').trim();
    if (cleanedTranscript) {
      // Stop recording if active
      if (isRecording && recognitionRef.current) {
        handleStopRecording();
      }
      setIsEvaluating(true);
      onAnswerSubmit(cleanedTranscript);
      setTranscript("");
    }
  };

  useEffect(() => {
    if (lastMessage?.stage === 'FEEDBACK' && lastMessage.content !== 'Evaluating your answer...') {
        setIsEvaluating(false);
    }
  }, [lastMessage])


  const renderMessage = (msg: Message, index: number) => {
    const isAi = msg.type === 'ai';
    const isFeedback = msg.stage === 'FEEDBACK';
    const maxWidth = isFeedback ? 'max-w-3xl' : 'max-w-xl';
    
    return (
      <div key={index} className={`flex gap-4 p-4 ${isAi ? '' : 'justify-end'}`}>
        {isAi && <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center"><RobotIcon className="w-6 h-6 text-cyan-400"/></div>}
        <div className={`${maxWidth} p-5 rounded-2xl text-white ${isAi ? 'bg-gray-700' : 'bg-cyan-600'} ${isFeedback ? 'shadow-lg border border-gray-600' : ''}`}>
          {isFeedback && msg.content !== 'Evaluating your answer...' ? (
            <MarkdownRenderer content={msg.content} />
          ) : isFeedback && msg.content === 'Evaluating your answer...' ? (
            <div className="flex items-center gap-2"><Spinner/> <span>Evaluating...</span></div>
          ) : (
            <div className="text-gray-200">{msg.content}</div>
          )}
        </div>
        {!isAi && <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center"><UserIcon className="w-6 h-6 text-gray-300"/></div>}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map(renderMessage)}
        <div ref={scrollRef}></div>
      </div>
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        {!isCompleted && !isFeedbackStage && !isEvaluating && (
          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`p-4 rounded-full transition-colors ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'}`}
            >
              {isRecording ? <StopIcon className="w-6 h-6 text-white"/> : <MicrophoneIcon className="w-6 h-6 text-white"/>}
            </button>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && transcript.trim()) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={isRecording ? "Speak your answer... (transcription will appear here)" : "Click the mic to record your answer, or type here"}
              className="flex-grow bg-gray-700 rounded-lg px-4 py-3 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none min-h-[48px] max-h-[120px]"
              rows={2}
              readOnly={isRecording}
            />
            <button
              onClick={handleSubmit}
              disabled={!transcript.trim()}
              className="p-4 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <SendIcon className="w-6 h-6 text-white"/>
            </button>
          </div>
        )}
        {isFeedbackStage && !isCompleted && !isEvaluating && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onNextQuestion();
              }}
              className="w-full px-6 py-3 bg-cyan-500 text-white font-bold rounded-full shadow-lg transition-colors hover:bg-cyan-600 active:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              {currentQuestionIndex >= totalQuestions - 1 ? 'Finish Interview' : 'Next Question'}
            </button>
        )}
        {isCompleted && (
            <p className="text-center font-semibold text-green-400">Interview Completed!</p>
        )}
      </div>
    </div>
  );
};
