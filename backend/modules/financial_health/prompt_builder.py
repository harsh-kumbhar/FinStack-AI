"""
=========================================================
Prompt Builder
---------------------------------------------------------
Builds prompts for LLM services.
Keeps prompt engineering separate from API logic.
=========================================================
"""


class PromptBuilder:

    @staticmethod
    def financial_summary_prompt(
        persona: str,
        score: float,
        health_status: str,
        strengths: list[str],
        weaknesses: list[str],
        risks: list[str],
        recommendations: list[str],
    ):

        return f"""
You are a certified financial advisor.

Analyze the following financial profile.

----------------------------------------------------

Financial Persona:
{persona}

Financial Health Score:
{score:.2f}

Health Status:
{health_status}

Strengths:
{chr(10).join("- " + s for s in strengths)}

Weaknesses:
{chr(10).join("- " + w for w in weaknesses)}

Risks:
{chr(10).join("- " + r for r in risks)}

Recommendations:
{chr(10).join("- " + rec for rec in recommendations)}

----------------------------------------------------

Instructions:

1. Write approximately 150-200 words.

2. Keep the language simple.

3. Be professional and encouraging.

4. Explain WHY the score was received.

5. Mention both strengths and weaknesses.

6. Explain the possible financial risks.

7. Suggest practical improvements.

8. Never change the financial score.

9. Never invent facts.

10. Base every statement only on the provided information.

Return only the report.
"""