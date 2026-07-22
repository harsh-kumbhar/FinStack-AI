"""
=========================================================
LLM Engine
---------------------------------------------------------
Generates AI-powered financial summaries using Gemini.
If Gemini fails, returns None so the application
continues to work.
=========================================================
"""
import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import errors

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

class LLMEngine:

    @staticmethod
    def generate_summary(
        persona: str,
        score: float,
        health_status: str,
        strengths: list[str],
        weaknesses: list[str],
        risks: list[str],
        recommendations: list[str],
    ):

        prompt = f"""
You are an experienced financial advisor.

Financial Persona: {persona}
Financial Health Score: {score:.2f}
Health Status: {health_status}

Strengths:
{chr(10).join("- " + s for s in strengths)}

Weaknesses:
{chr(10).join("- " + w for w in weaknesses)}

Risks:
{chr(10).join("- " + r for r in risks)}

Recommendations:
{chr(10).join("- " + rec for rec in recommendations)}

Instructions:
- Write a financial report in about 150 words.
- Use simple language.
- Encourage the user.
- Never change the financial score.
- Never invent information.
- Explain why the user received this score.
"""

        max_retries = 3
        
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model="gemini-3.5-flash",
                    contents=prompt,
                )
                return response.text
                
            except errors.ServerError as e:
                # Handle temporary server overloads gracefully
                if e.code == 503:
                    print(f"Gemini Server busy (503). Retrying {attempt + 1}/{max_retries} in 5 seconds...")
                    time.sleep(5)
                else:
                    print(f"Gemini Server Error: {e}")
                    break
            except Exception as e:
                # Catch general network drops (like getaddrinfo failed) or SSL timeouts
                print(f"Gemini Unexpected Error (Attempt {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    time.sleep(5)
                else:
                    break

        # Fallback to None if all retries fail so the frontend doesn't crash
        print("LLMEngine failed to generate summary. Returning None.")
        return None