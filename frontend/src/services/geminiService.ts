import { GoogleGenAI, Type as GeminiType, Modality } from "@google/genai";
import { InterviewQuestion, AnswerFeedback, ATSScoreResult } from "../types";

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

export async function checkATSScore(ai: GoogleGenAI, resumeText: string, jobDescriptionText: string): Promise<ATSScoreResult> {
  const model = "gemini-2.5-flash";
  const prompt = `You are an ATS (Applicant Tracking System) expert. Analyze the following resume against the job description and provide:

1. An overall ATS compatibility score (0-100)
2. A breakdown of the score into three components:
   - Keyword Matching (0-100): How well the resume matches keywords from the job description
   - Skills Alignment (0-100): How well the candidate's skills match the job requirements
   - Formatting (0-100): How ATS-friendly the resume formatting is
3. A brief analysis explaining the overall score and key findings
4. 3-5 specific, actionable tips to improve the resume's ATS performance

Be constructive and specific in your recommendations.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescriptionText}`;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: GeminiType.OBJECT,
        properties: {
          score: {
            type: GeminiType.NUMBER,
            description: "Overall ATS compatibility score from 0 to 100."
          },
          breakdown: {
            type: GeminiType.OBJECT,
            properties: {
              keywordMatching: {
                type: GeminiType.NUMBER,
                description: "Score for keyword matching from 0 to 100."
              },
              skillsAlignment: {
                type: GeminiType.NUMBER,
                description: "Score for skills alignment from 0 to 100."
              },
              formatting: {
                type: GeminiType.NUMBER,
                description: "Score for formatting from 0 to 100."
              }
            },
            required: ["keywordMatching", "skillsAlignment", "formatting"]
          },
          analysis: {
            type: GeminiType.STRING,
            description: "Brief explanation of the score and key findings."
          },
          tips: {
            type: GeminiType.ARRAY,
            items: {
              type: GeminiType.STRING
            },
            description: "Array of 3-5 actionable tips to improve ATS performance."
          }
        },
        required: ["score", "breakdown", "analysis", "tips"]
      }
    }
  });

  try {
    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as ATSScoreResult;
  } catch (error) {
    console.error("Error parsing ATS score JSON:", error);
    console.error("Received text:", response.text);
    // Fallback in case of parsing error
    return {
      score: 50,
      breakdown: {
        keywordMatching: 50,
        skillsAlignment: 50,
        formatting: 50
      },
      analysis: "Unable to analyze ATS score due to processing error. Please try again.",
      tips: [
        "Ensure your resume uses standard fonts and formatting",
        "Include relevant keywords from the job description",
        "Use a clean, simple layout without complex graphics"
      ]
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
