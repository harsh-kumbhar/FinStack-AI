import os
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from openai import AsyncOpenAI
from fastapi import HTTPException

# Configure OpenRouter DeepSeek Client
# (Ensure OPENROUTER_API_KEY is in your .env file)
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY,
)

# ---------------------------------------------------------
# PYDANTIC MODELS FOR STATE TRACKING
# ---------------------------------------------------------

class TaxInterviewSlots(BaseModel):
    gross_salary: Optional[float] = None
    other_income: Optional[float] = None
    deduction_80c: Optional[float] = None
    deduction_80d: Optional[float] = None
    home_loan_interest: Optional[float] = None

class InterviewResponse(BaseModel):
    assistant_reply: str
    extracted_slots: TaxInterviewSlots
    is_complete: bool

# ---------------------------------------------------------
# THE SERVICE CLASS
# ---------------------------------------------------------

class TaxInterviewService:
    
    SYSTEM_PROMPT_TEMPLATE = """
    You are an expert, friendly, and patient Indian Tax Assistant (Chartered Accountant persona).
    Your goal is to gather EXACTLY 5 financial values from the user to estimate their FY 2024-25 tax liability.
    
    THE 5 REQUIRED SLOTS:
    1. gross_salary: Annual salary before deductions.
    2. other_income: Savings interest, fixed deposit interest, dividends, freelancing.
    3. deduction_80c: Investments like PPF, ELSS, EPF, Life Insurance (Statutory Cap is ₹1.5L).
    4. deduction_80d: Medical / Health Insurance premiums (Statutory Cap is ₹25k/₹50k).
    5. home_loan_interest: Section 24(b) interest paid on a home loan.

    CURRENT STATE OF THE SLOTS:
    {current_slots}

    YOUR RULES:
    1. PROGRESSION: Look at the CURRENT STATE. Find the first slot that is `null`. Ask the user for that specific information in plain, conversational English. Ask for ONE thing at a time.
    2. ANSWERING DOUBTS: If the user asks a question (e.g., "Does my Netflix subscription count for 80C?" or "What is other income?"), answer it accurately based on Indian Tax Law, then smoothly re-prompt for the slot you need.
    3. EXTRACTION: If the user provides a number in their message, update the `extracted_slots` object with that number. 
    4. SKIPPING: If the user says "I don't have this", "skip", "none", or "0", set that slot to 0.
    5. PRE-FILLED CONFIRMATION: If the user's first message arrives and some slots are already filled (e.g., from their Document Vault), briefly acknowledge what you already know before asking for the missing ones.
    6. COMPLETION: If all 5 slots have a numeric value (0 is a valid number, null is not), set `is_complete` to true. If `is_complete` is true, your `assistant_reply` should warmly say you have everything needed and are handing it over to the calculation engine.

    OUTPUT FORMAT:
    You MUST output valid, parsable JSON. Do not include markdown blocks like ```json.
    Return EXACTLY this JSON structure:
    {{
        "assistant_reply": "Your conversational text goes here...",
        "extracted_slots": {{
            "gross_salary": float or null,
            "other_income": float or null,
            "deduction_80c": float or null,
            "deduction_80d": float or null,
            "home_loan_interest": float or null
        }},
        "is_complete": boolean
    }}
    """

    @classmethod
    async def process_chat(
        cls, 
        messages: List[Dict[str, str]], 
        current_slots: Dict[str, Any]
    ) -> InterviewResponse:
        """
        Takes the chat history and current known slots, sends them to DeepSeek, 
        and returns the updated JSON state and the assistant's reply.
        """
        if not OPENROUTER_API_KEY:
            raise HTTPException(status_code=500, detail="OpenRouter API key is missing.")

        # 1. Format the system prompt with the live current slots
        slots_json_string = json.dumps(current_slots, indent=2)
        formatted_system_prompt = cls.SYSTEM_PROMPT_TEMPLATE.format(current_slots=slots_json_string)

        # 2. Build the message array for the LLM
        llm_messages = [{"role": "system", "content": formatted_system_prompt}]
        
        # Append the frontend chat history
        # (Filter out any system messages from the frontend to keep it clean)
        for msg in messages:
            if msg.get("role") in ["user", "assistant"]:
                llm_messages.append({
                    "role": msg["role"], 
                    "content": msg["content"]
                })

        # 3. Call DeepSeek via OpenRouter
        try:
            response = await client.chat.completions.create(
                model="deepseek/deepseek-chat",
                messages=llm_messages,
                temperature=0.1, # Low temperature for strict adherence to rules/math
                response_format={"type": "json_object"}
            )
            
            # 4. Parse the JSON response
            raw_response = response.choices[0].message.content
            parsed_json = json.loads(raw_response)
            
            # Validate against our Pydantic model to ensure safety
            interview_result = InterviewResponse(**parsed_json)
            
            return interview_result

        except json.JSONDecodeError:
            raise HTTPException(
                status_code=500, 
                detail="AI returned malformed JSON. Please try again."
            )
        except Exception as exc:
            raise HTTPException(
                status_code=500, 
                detail=f"AI Chat Service Error: {str(exc)}"
            )