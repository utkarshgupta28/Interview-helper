import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai
from google.genai import types
import PyPDF2
from docx import Document
import io

import json
from typing import Dict, List

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable not set")

# Initialize Gemini client
client = genai.Client(api_key=API_KEY)

# FastAPI app
app = FastAPI()

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Interview Warmup Backend!"}


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """Extract text from various file formats."""
    file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
    
    if file_extension == 'pdf':
        try:
            pdf_file = io.BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    elif file_extension in ['docx', 'doc']:
        try:
            doc_file = io.BytesIO(file_content)
            doc = Document(doc_file)
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")
    
    elif file_extension == 'txt':
        # Try UTF-8 first, then common encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        for encoding in encodings:
            try:
                return file_content.decode(encoding)
            except UnicodeDecodeError:
                continue
        raise ValueError("Failed to decode text file with common encodings")
    
    else:
        # Try to decode as text with multiple encodings
        encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
        for encoding in encodings:
            try:
                text = file_content.decode(encoding)
                # Check if it looks like text (not binary)
                if len(text) > 0 and not any(ord(c) < 32 and c not in '\n\r\t' for c in text[:1000]):
                    return text.strip()
            except UnicodeDecodeError:
                continue
        raise ValueError(f"Unsupported file format: {file_extension}. Please upload a PDF, DOCX, or TXT file.")


@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    try:
        file_content = await file.read()
        resume_text = extract_text_from_file(file_content, file.filename)
        
        if not resume_text or len(resume_text.strip()) < 10:
            raise ValueError("The uploaded file appears to be empty or contains no readable text.")

        prompt = f"""You are an expert recruiter. Based on this resume, generate 5 interview questions: 3 technical and 2 behavioral.

RESUME:
{resume_text}"""

        # Define the response schema for structured JSON output
        response_schema = {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "question": {
                        "type": "STRING",
                        "description": "The interview question"
                    },
                    "type": {
                        "type": "STRING",
                        "description": "The type of question, either 'technical' or 'behavioral'"
                    }
                },
                "required": ["question", "type"]
            }
        }

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema
            )
        )

        # Extract the text from the response
        response_text = response.text.strip()
        
        # Parse JSON
        try:
            questions = json.loads(response_text)
        except json.JSONDecodeError as json_err:
            # If JSON parsing fails, try to extract JSON from markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            questions = json.loads(response_text)
        
        # Validate that we got a list
        if not isinstance(questions, list):
            raise ValueError(f"Expected a list of questions, got {type(questions)}")
        
        # Validate each question has required fields
        for i, q in enumerate(questions):
            if not isinstance(q, dict) or "question" not in q or "type" not in q:
                raise ValueError(f"Invalid question format at index {i}: {q}")
        
        return {"questions": questions}

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to parse JSON response: {str(e)}. Response was: {response_text[:200] if 'response_text' in locals() else 'N/A'}"
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Error analyzing resume: {str(e)}"
        )


@app.post("/evaluate-answer")
async def evaluate_answer(data: Dict[str, str]):
    try:
        question = data["question"]
        answer = data["answer"]
        question_type = data.get("type", "general")  # Get question type if provided
        
        # Log for debugging
        print(f"Evaluating answer for question: {question[:100]}...")
        print(f"Answer received: {answer[:100]}...")
        print(f"Question type: {question_type}")

        prompt = f"""You are an expert interview coach with years of experience evaluating candidates. Provide comprehensive, constructive feedback on the candidate's answer.

**Interview Question:** "{question}"
**Question Type:** {question_type}
**Candidate's Answer:** "{answer}"

Analyze the answer thoroughly and provide detailed feedback in the following structured format using Markdown:

## Overall Assessment
- A brief 2-3 sentence summary of the answer's quality

## Strengths
- List 2-4 specific strengths of the answer
- Be specific about what was done well (e.g., "You demonstrated strong problem-solving by breaking down the problem into steps")
- Use bullet points

## Areas for Improvement
- List 2-4 specific areas where the answer could be enhanced
- Provide actionable advice (e.g., "Consider adding concrete examples from your experience")
- Use bullet points

## Detailed Analysis
- **Relevance:** How well did the answer address the question? (2-3 sentences)
- **Depth:** Was the answer sufficiently detailed? (2-3 sentences)
- **Clarity:** Was the answer clear and well-structured? (2-3 sentences)
- **Examples/Evidence:** Did the candidate provide concrete examples? (2-3 sentences)

## Recommendations
- Provide 2-3 specific recommendations for improvement
- Include what to do differently next time
- Suggest specific points to include if asked this question again

Keep the feedback encouraging and constructive. The tone should be supportive while being honest about areas for improvement. Use proper Markdown formatting with headers (##), bold text (**text**), and bullet points (-)."""

        # Define the response schema for structured JSON output
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "feedback": {
                    "type": "STRING",
                    "description": "Comprehensive, well-structured feedback in Markdown format with sections: Overall Assessment, Strengths, Areas for Improvement, Detailed Analysis, Recommendations, and Score Breakdown"
                },
                "score": {
                    "type": "NUMBER",
                    "description": "Score out of 10, considering relevance, depth, clarity, examples, and overall quality"
                }
            },
            "required": ["feedback", "score"]
        }

        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=response_schema
                )
            )
        except Exception as api_err:
            print(f"Gemini API call failed: {api_err}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to call Gemini API: {str(api_err)}"
            )

        # Extract the text from the response - handle different response formats
        response_text = None
        try:
            if hasattr(response, 'text'):
                response_text = response.text
            elif hasattr(response, 'candidates') and len(response.candidates) > 0:
                # Try accessing through candidates
                candidate = response.candidates[0]
                if hasattr(candidate, 'content'):
                    if hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'text'):
                                response_text = part.text
                                break
                    elif hasattr(candidate.content, 'text'):
                        response_text = candidate.content.text
            elif isinstance(response, dict):
                # Response might be a dict
                if 'text' in response:
                    response_text = response['text']
                elif 'candidates' in response and len(response['candidates']) > 0:
                    candidate = response['candidates'][0]
                    if 'content' in candidate:
                        content = candidate['content']
                        if 'parts' in content:
                            for part in content['parts']:
                                if 'text' in part:
                                    response_text = part['text']
                                    break
                        elif 'text' in content:
                            response_text = content['text']
            
            if not response_text:
                print(f"Response object structure: {type(response)}")
                print(f"Response attributes: {dir(response)}")
                if hasattr(response, '__dict__'):
                    print(f"Response dict: {response.__dict__}")
                raise ValueError("Could not extract text from Gemini API response")
            
            response_text = response_text.strip()
            print(f"Raw response from Gemini: {response_text[:500]}...")
        except Exception as extract_err:
            print(f"Error extracting text from response: {extract_err}")
            print(f"Response type: {type(response)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract text from Gemini response: {str(extract_err)}"
            )
        
        # Parse JSON
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError as json_err:
            print(f"Initial JSON parse failed: {json_err}")
            # If JSON parsing fails, try to extract JSON from markdown code blocks
            original_text = response_text
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError as e2:
                print(f"Second JSON parse attempt also failed: {e2}")
                print(f"Response text: {original_text[:1000]}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to parse JSON response. Error: {str(e2)}. Response preview: {original_text[:200]}"
                )
        
        # Validate the result structure
        if not isinstance(result, dict):
            raise ValueError(f"Expected dict, got {type(result)}")
        if "feedback" not in result:
            raise ValueError("Missing 'feedback' field in response")
        if "score" not in result:
            raise ValueError("Missing 'score' field in response")
        
        print(f"Successfully parsed response. Score: {result.get('score')}")
        return result

    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to parse JSON response: {str(e)}. Response was: {response_text[:200] if 'response_text' in locals() else 'N/A'}"
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        print(f"Error evaluating answer: {error_msg}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error evaluating answer: {error_msg}"
        )


@app.post("/check-ats-score")
async def check_ats_score(resume: UploadFile = File(...), job_description_text: str = Form(...)):
    try:
        # Read and extract text from resume
        resume_content = await resume.read()
        resume_text = extract_text_from_file(resume_content, resume.filename)

        # Use the provided job description text directly
        jd_text = job_description_text.strip()

        if not resume_text or len(resume_text.strip()) < 10:
            raise ValueError("The uploaded resume appears to be empty or contains no readable text.")
        if not jd_text or len(jd_text.strip()) < 10:
            raise ValueError("The job description text appears to be empty or contains no readable text.")

        prompt = f"""You are an ATS (Applicant Tracking System) expert. Analyze the following resume against the job description and provide:

1. An overall ATS compatibility score (0-100)
2. A breakdown of the score into three components:
   - Keyword Matching (0-100): How well the resume matches keywords from the job description
   - Skills Alignment (0-100): How well the candidate's skills match the job requirements
   - Formatting (0-100): How ATS-friendly the resume formatting is
3. A brief analysis explaining the overall score and key findings
4. 3-5 specific, actionable tips to improve the resume's ATS performance

Be constructive and specific in your recommendations.

RESUME:
{resume_text}

JOB DESCRIPTION:
{jd_text}"""

        # Define the response schema for structured JSON output
        response_schema = {
            "type": "OBJECT",
            "properties": {
                "score": {
                    "type": "NUMBER",
                    "description": "Overall ATS compatibility score from 0 to 100."
                },
                "breakdown": {
                    "type": "OBJECT",
                    "properties": {
                        "keywordMatching": {
                            "type": "NUMBER",
                            "description": "Score for keyword matching from 0 to 100."
                        },
                        "skillsAlignment": {
                            "type": "NUMBER",
                            "description": "Score for skills alignment from 0 to 100."
                        },
                        "formatting": {
                            "type": "NUMBER",
                            "description": "Score for formatting from 0 to 100."
                        }
                    },
                    "required": ["keywordMatching", "skillsAlignment", "formatting"]
                },
                "analysis": {
                    "type": "STRING",
                    "description": "Brief explanation of the score and key findings."
                },
                "tips": {
                    "type": "ARRAY",
                    "items": {
                        "type": "STRING"
                    },
                    "description": "Array of 3-5 actionable tips to improve ATS performance."
                }
            },
            "required": ["score", "breakdown", "analysis", "tips"]
        }

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_schema
            )
        )

        # Extract the text from the response
        response_text = response.text.strip()

        # Parse JSON
        try:
            result = json.loads(response_text)
        except json.JSONDecodeError as json_err:
            # If JSON parsing fails, try to extract JSON from markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            result = json.loads(response_text)

        # Validate the result structure
        if not isinstance(result, dict):
            raise ValueError(f"Expected dict, got {type(result)}")
        if "score" not in result:
            raise ValueError("Missing 'score' field in response")
        if "analysis" not in result:
            raise ValueError("Missing 'analysis' field in response")
        if "tips" not in result:
            raise ValueError("Missing 'tips' field in response")

        return result

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse JSON response: {str(e)}. Response was: {response_text[:200] if 'response_text' in locals() else 'N/A'}"
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error checking ATS score: {str(e)}"
        )


@app.post("/text-to-speech")
async def text_to_speech(data: Dict[str, str]):
    """
    Text-to-speech endpoint (deprecated - frontend now uses browser TTS).
    This endpoint is kept for backward compatibility but returns an error.
    """
    raise HTTPException(
        status_code=501,
        detail="Text-to-speech is now handled by the browser. This endpoint is deprecated."
    )
