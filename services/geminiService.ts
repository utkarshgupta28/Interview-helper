import { GoogleGenAI, Type as GeminiType, Modality } from "@google/genai";
import { InterviewQuestion, AnswerFeedback } from "../types";

export async function generateQuestions(ai: GoogleGenAI, resumeText: string): Promise<InterviewQuestion[]> {
  const model = "gemini-2.5-flash";
  const prompt = `Based on the following resume, generate 5 interview questions. 3 should be technical and 2 should be behavioral. Ensure the questions are relevant to the skills and experience listed.`;
  
  const response = await ai.models.generateContent({
    model: model,
    contents: `${prompt}\n\nRESUME:\n${resumeText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: GeminiType.ARRAY,
        items: {
          type: GeminiType.OBJECT,
          properties: {
            question: {
              type: GeminiType.STRING,
              description: "The interview question."
            },
            type: {
              type: GeminiType.STRING,
              description: "The type of question, either 'technical' or 'behavioral'."
            }
          },
          required: ["question", "type"]
        }
      }
    }
  });

  try {
    const jsonText = response.text.trim();
    const questions = JSON.parse(jsonText) as InterviewQuestion[];
    return questions;
  } catch (error) {
    console.error("Error parsing questions JSON:", error);
    console.error("Received text:", response.text);
    // Fallback in case of parsing error
    return [
        { question: "Can you walk me through a challenging project from your resume?", type: "behavioral" },
        { question: "How would you design a real-time analytics dashboard?", type: "technical" },
    ];
  }
}

export async function evaluateAnswer(ai: GoogleGenAI, question: string, answer: string): Promise<AnswerFeedback> {
  const model = "gemini-2.5-flash";
  const prompt = `You are an expert interview coach. Your tone is encouraging and constructive. The interview question was: "${question}". The candidate's answer was: "${answer}". 
  
  Provide feedback on the answer and a score out of 10. The score should reflect the quality of the answer based on clarity, relevance, and depth.
  
  Structure your feedback in Markdown with these sections:
  - **Overall Impression:** A brief summary.
  - **What Went Well:** 1-2 bullet points on strengths.
  - **Areas for Improvement:** 1-2 bullet points with actionable advice.
  
  Keep the feedback concise and helpful.`;
  
  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: GeminiType.OBJECT,
            properties: {
                feedback: {
                    type: GeminiType.STRING,
                    description: "Constructive feedback on the user's answer in Markdown format."
                },
                score: {
                    type: GeminiType.NUMBER,
                    description: "A score from 0 to 10 evaluating the answer."
                }
            },
            required: ["feedback", "score"]
        }
    }
  });

  try {
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as AnswerFeedback;
  } catch (e) {
    console.error("Error parsing feedback JSON:", e);
    return {
        feedback: "Sorry, I had trouble evaluating that response. Let's try the next question.",
        score: 0
    };
  }
}

export async function textToSpeech(ai: GoogleGenAI, text: string): Promise<string> {
    const model = "gemini-2.5-flash-preview-tts";
    const response = await ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Puck' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("No audio data received from TTS API.");
    }
    return base64Audio;
}
