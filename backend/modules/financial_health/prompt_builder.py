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
        recommendations: list[dict],
    ):

        recommendation_text = "\n".join(
            f"- {rec['title']} ({rec['priority']} Priority)\n"
            f"  Reason: {rec['reason']}\n"
            f"  Recommended: {rec['recommended_value']}"
            for rec in recommendations
        )

        return f"""
    You are an experienced Certified Financial Advisor.

    Analyze the following financial report.

    ----------------------------------------------------

    Financial Persona:
    {persona}

    ML Financial Health Score:
    {score:.2f}/100

    Overall Health Status:
    {health_status}

    Strengths:
    {chr(10).join("- " + s for s in strengths)}

    Weaknesses:
    {chr(10).join("- " + w for w in weaknesses)}

    Risks:
    {chr(10).join("- " + r for r in risks)}

    Recommended Actions:
    {recommendation_text}

    ----------------------------------------------------

    Instructions

    1. Write a financial report between 180 and 220 words.

    2. Use simple, professional English suitable for everyday users.

    3. Explain why the user received this Financial Health Score.

    4. Mention strengths before weaknesses.

    5. Mention financial risks ONLY if they are provided above.
       If there are no risks, clearly state that no major financial
       risks were identified.

    6. Explain ONLY the recommendations listed above.
       Do NOT generate additional recommendations.

    7. If the recommendation list is empty, encourage the user
       to maintain their current financial habits.

    8. Do NOT mention investments, taxes, inflation,
       diversification, mutual funds, stock market,
       insurance planning or any other financial topic
       unless it is explicitly present in the information above.

    9. Never invent any financial information.

    10. Never modify the Financial Health Score.

    11. Base every statement ONLY on the information above.

    Return only the financial report.
    """