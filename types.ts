export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  INTERVIEWING = 'INTERVIEWING',
  COMPLETED = 'COMPLETED',
  ATS_UPLOAD = 'ATS_UPLOAD',
  ATS_RESULT = 'ATS_RESULT',
}

export enum InterviewStage {
  INTRODUCTION = 'INTRODUCTION',
  QUESTION = 'QUESTION',
  ANSWER = 'ANSWER',
  FEEDBACK = 'FEEDBACK',
  CONCLUSION = 'CONCLUSION',
}

export interface Message {
  type: 'ai' | 'user';
  stage: InterviewStage;
  content: string;
  score?: number;
}

export interface InterviewQuestion {
  question: string;
  type: 'technical' | 'behavioral';
}

export interface AnswerFeedback {
  feedback: string;
  score: number;
}

export interface ResumeUploaderProps {
  onUpload: (file: File) => void;
  onCheckATS: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface ATSScoreResult {
  score: number;
  tips: string[];
  analysis: string;
}
