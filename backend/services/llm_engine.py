"""
=========================================================
LLM Engine
---------------------------------------------------------
Handles communication with the LLM provider (OpenRouter).

Responsibilities:
- Build request to OpenRouter
- Send prompt
- Receive AI response
- Handle all API/network errors gracefully

NOTE:
Prompt generation is handled separately by PromptBuilder.
=========================================================
"""

import os
import requests

from dotenv import load_dotenv

from services.prompt_builder import PromptBuilder

load_dotenv()


class LLMEngine:
    """
    LLM Engine for generating AI-powered financial summaries.
    """

    API_URL = "https://openrouter.ai/api/v1/chat/completions"

    API_KEY = os.getenv("OPENROUTER_API_KEY")

    MODEL = os.getenv(
        "LLM_MODEL",
        "deepseek/deepseek-chat"
    )

    @classmethod
    def generate_summary(
        cls,
        persona: str,
        score: float,
        health_status: str,
        strengths: list[str],
        weaknesses: list[str],
        risks: list[str],
        recommendations: list[str],
    ) -> str | None:
        """
        Generates an AI-powered financial summary.

        Returns:
            str  -> AI generated report
            None -> If any error occurs
        """

        # ----------------------------
        # Build Prompt
        # ----------------------------

        prompt = PromptBuilder.financial_summary_prompt(
            persona=persona,
            score=score,
            health_status=health_status,
            strengths=strengths,
            weaknesses=weaknesses,
            risks=risks,
            recommendations=recommendations,
        )

        # ----------------------------
        # Request Payload
        # ----------------------------
        if not cls.API_KEY:
            print("[LLM ERROR] OPENROUTER_API_KEY not found.")
            return None

        payload = {
            "model": cls.MODEL,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        headers = {
            "Authorization": f"Bearer {cls.API_KEY}",
            "Content-Type": "application/json"
        }

        # ----------------------------
        # API Request
        # ----------------------------

        try:

            response = requests.post(
                cls.API_URL,
                headers=headers,
                json=payload,
                timeout=30,
            )

            response.raise_for_status()

            data = response.json()

            return data["choices"][0]["message"]["content"]

        # ----------------------------
        # Error Handling
        # ----------------------------

        except requests.exceptions.Timeout:

            print("\n[LLM ERROR] Request timed out.")

            return None

        except requests.exceptions.ConnectionError:

            print("\n[LLM ERROR] Unable to connect to OpenRouter.")

            return None

        except requests.exceptions.HTTPError:

            print(f"\n[LLM ERROR] HTTP {response.status_code}")

            try:
                error = response.json()

                print(error)

            except Exception:

                print(response.text)

            return None

        except KeyError:

            print("\n[LLM ERROR] Unexpected response format.")

            try:
                print(response.json())

            except Exception:
                pass

            return None

        except Exception as e:

            print(f"\n[LLM ERROR] {type(e).__name__}: {e}")

            return None