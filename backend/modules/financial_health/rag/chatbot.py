from .retriever import retrieve_context
from .context_builder import build_context
from .prompts import SYSTEM_PROMPT

from modules.financial_health.llm_engine import LLMEngine


class FinancialChatbot:

    @staticmethod
    def chat(
        question: str,
        report: dict
    ) -> str:

        retrieved_chunks = retrieve_context(
            question,
            top_k=5
        )

        context = build_context(
            question=question,
            report=report,
            retrieved_chunks=retrieved_chunks
        )

        final_prompt = f"""
{SYSTEM_PROMPT}

================ CONTEXT ================

{context}

=========================================

Answer the user's question clearly and professionally.
"""

        answer = LLMEngine.generate_response(
            final_prompt
        )

        if answer is None:
            return (
                "I'm currently unable to connect to the AI service. "
                "Please try again in a moment."
            )

        return answer

if __name__ == "__main__":

    test_report = {
        "ml_health_score": 55.78,
        "health_status": "Average",

        "persona": {
            "title": "Young Salaried"
        },

        "metrics": {
            "savings_rate": {
                "name": "Savings Rate",
                "value": 20,
                "unit": "%",
                "status": "Average"
            },
            "debt_ratio": {
                "name": "Debt-to-Income Ratio",
                "value": 8,
                "unit": "%",
                "status": "Good"
            },
            "emergency_fund": {
                "name": "Emergency Fund",
                "value": 6,
                "unit": "Months",
                "status": "Good"
            }
        },

        "strengths": [
            "Healthy debt level",
            "Positive financial habits"
        ],

        "weaknesses": [
            "Savings rate can be improved"
        ],

        "risks": [],

        "recommendations": [
            {
                "title": "Increase Savings",
                "priority": "Medium",
                "reason": "Savings rate can be improved."
            }
        ]
    }

    question = input("\nAsk FinStack AI: ")

    answer = FinancialChatbot.chat(
        question,
        test_report
    )

    print("\n================ AI RESPONSE ================\n")
    print(answer)