"""
=========================================================
FinStack AI
Context Builder
=========================================================
"""

from typing import Dict, List


def build_context(
    question: str,
    report: Dict,
    retrieved_chunks: List[dict]
):
    """
    Build the complete context for the LLM.

    Combines:
    - User financial report
    - Retrieved knowledge
    - User question
    """

    context = []

    context.append("========== USER FINANCIAL REPORT ==========\n")

    context.append(
        f"Financial Health Score: {report.get('ml_health_score')}"
    )

    context.append(
        f"Health Status: {report.get('health_status')}"
    )

    persona = report.get("persona", {})

    context.append(
        f"Financial Persona: {persona.get('title','Unknown')}"
    )

    context.append("")

    context.append("========== METRICS ==========\n")

    metrics = report.get("metrics", {})

    for key, value in metrics.items():

        context.append(
            f"{value['name']} : "
            f"{value['value']} {value['unit']} "
            f"({value['status']})"
        )

    context.append("")

    context.append("========== STRENGTHS ==========\n")

    for s in report.get("strengths", []):

        context.append(f"- {s}")

    context.append("")

    context.append("========== WEAKNESSES ==========\n")

    for w in report.get("weaknesses", []):

        context.append(f"- {w}")

    context.append("")

    context.append("========== RISKS ==========\n")

    for r in report.get("risks", []):

        context.append(f"- {r}")

    context.append("")

    context.append("========== RECOMMENDATIONS ==========\n")

    for rec in report.get("recommendations", []):

        context.append(
            f"{rec['title']} "
            f"(Priority: {rec['priority']})"
        )

        context.append(
            f"Reason: {rec['reason']}"
        )

        context.append("")

    context.append("========== KNOWLEDGE BASE ==========\n")

    for idx, chunk in enumerate(retrieved_chunks, 1):

        context.append(f"[Chunk {idx}]")

        context.append(chunk["chunk"])

        context.append("")

    context.append("========== USER QUESTION ==========\n")

    context.append(question)

    return "\n".join(context)