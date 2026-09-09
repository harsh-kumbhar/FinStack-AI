from typing import List, Dict, Any


class JourneyService:

    @staticmethod
    def build_journey(reports: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Converts historical financial health reports into
        data required by the Financial Journey dashboard.

        Reports are expected to belong to a single user.
        """

        if not reports:
            return {
                "report_count": 0,
                "current": None,
                "previous": None,
                "score_change": None,
                "history": [],
                "comparison": None,
                "improvements": [],
                "areas_to_watch": [],
            }

        # --------------------------------------------------
        # Sort oldest -> newest
        # --------------------------------------------------

        reports = sorted(
            reports,
            key=lambda report: report.get("created_at", "")
        )

        current = reports[-1]

        previous = (
            reports[-2]
            if len(reports) >= 2
            else None
        )

        first = reports[0]

        # --------------------------------------------------
        # Helpers
        # --------------------------------------------------

        def number(value):
            if value is None:
                return 0.0

            try:
                return float(value)
            except (TypeError, ValueError):
                return 0.0

        def change(current_value, previous_value):
            return round(
                number(current_value)
                - number(previous_value),
                2,
            )

        # --------------------------------------------------
        # Current / Previous Score
        # --------------------------------------------------

        current_score = number(
            current.get("final_health_score")
        )

        previous_score = (
            number(previous.get("final_health_score"))
            if previous
            else None
        )

        score_change = (
            round(
                current_score - previous_score,
                2,
            )
            if previous
            else None
        )

        # --------------------------------------------------
        # Historical Chart Data
        # --------------------------------------------------

        history = []

        for report in reports:

            history.append(
                {
                    "date": report.get("created_at"),
                    "score": number(
                        report.get("final_health_score")
                    ),
                    "savings_rate": number(
                        report.get("savings_rate")
                    ) * 100,
                    "expense_ratio": number(
                        report.get("expense_ratio")
                    ) * 100,
                    "debt_to_income_ratio": number(
                        report.get("debt_to_income_ratio")
                    ) * 100,
                    "emergency_fund_months": number(
                        report.get("emergency_fund_months")
                    ),
                    "investment_ratio": number(
                        report.get("investment_ratio")
                    ) * 100,
                    "insurance_ratio": number(
                        report.get("insurance_ratio")
                    ),
                    "net_monthly_cashflow": number(
                        report.get("net_monthly_cashflow")
                    ),
                }
            )

        # --------------------------------------------------
        # First vs Current Comparison
        # --------------------------------------------------

        comparison = {
            "score": {
                "first": number(
                    first.get("final_health_score")
                ),
                "current": current_score,
                "change": change(
                    current.get("final_health_score"),
                    first.get("final_health_score"),
                ),
            },

            "savings_rate": {
                "first": number(
                    first.get("savings_rate")
                ) * 100,
                "current": number(
                    current.get("savings_rate")
                ) * 100,
                "change": round(
                    (
                        number(current.get("savings_rate"))
                        - number(first.get("savings_rate"))
                    ) * 100,
                    2,
                ),
            },

            "debt_to_income_ratio": {
                "first": number(
                    first.get("debt_to_income_ratio")
                ) * 100,
                "current": number(
                    current.get("debt_to_income_ratio")
                ) * 100,
                "change": round(
                    (
                        number(current.get("debt_to_income_ratio"))
                        - number(first.get("debt_to_income_ratio"))
                    ) * 100,
                    2,
                ),
            },

            "emergency_fund_months": {
                "first": number(
                    first.get("emergency_fund_months")
                ),
                "current": number(
                    current.get("emergency_fund_months")
                ),
                "change": change(
                    current.get("emergency_fund_months"),
                    first.get("emergency_fund_months"),
                ),
            },

            "investment_ratio": {
                "first": number(
                    first.get("investment_ratio")
                ) * 100,
                "current": number(
                    current.get("investment_ratio")
                ) * 100,
                "change": round(
                    (
                        number(current.get("investment_ratio"))
                        - number(first.get("investment_ratio"))
                    ) * 100,
                    2,
                ),
            },

            "expense_ratio": {
                "first": number(
                    first.get("expense_ratio")
                ) * 100,
                "current": number(
                    current.get("expense_ratio")
                ) * 100,
                "change": round(
                    (
                        number(current.get("expense_ratio"))
                        - number(first.get("expense_ratio"))
                    ) * 100,
                    2,
                ),
            },
        }

        # --------------------------------------------------
        # Improvements / Areas to Watch
        # --------------------------------------------------

        improvements = []
        areas_to_watch = []

        if previous:

            # Score
            if score_change > 0:
                improvements.append(
                    f"Financial health score increased by "
                    f"{score_change} points."
                )
            elif score_change < 0:
                areas_to_watch.append(
                    f"Financial health score decreased by "
                    f"{abs(score_change)} points."
                )

            # Savings
            savings_change = round(
                (
                    number(current.get("savings_rate"))
                    - number(previous.get("savings_rate"))
                ) * 100,
                2,
            )

            if savings_change > 0:
                improvements.append(
                    f"Savings rate increased by "
                    f"{savings_change} percentage points."
                )
            elif savings_change < 0:
                areas_to_watch.append(
                    f"Savings rate decreased by "
                    f"{abs(savings_change)} percentage points."
                )

            # Debt
            debt_change = round(
                (
                    number(current.get("debt_to_income_ratio"))
                    - number(previous.get("debt_to_income_ratio"))
                ) * 100,
                2,
            )

            # Lower debt ratio is better
            if debt_change < 0:
                improvements.append(
                    f"Debt-to-income ratio decreased by "
                    f"{abs(debt_change)} percentage points."
                )
            elif debt_change > 0:
                areas_to_watch.append(
                    f"Debt-to-income ratio increased by "
                    f"{debt_change} percentage points."
                )

            # Emergency Fund
            emergency_change = change(
                current.get("emergency_fund_months"),
                previous.get("emergency_fund_months"),
            )

            if emergency_change > 0:
                improvements.append(
                    f"Emergency fund increased by "
                    f"{emergency_change} months."
                )
            elif emergency_change < 0:
                areas_to_watch.append(
                    f"Emergency fund decreased by "
                    f"{abs(emergency_change)} months."
                )

            # Investments
            investment_change = round(
                (
                    number(current.get("investment_ratio"))
                    - number(previous.get("investment_ratio"))
                ) * 100,
                2,
            )

            if investment_change > 0:
                improvements.append(
                    f"Investment allocation increased by "
                    f"{investment_change} percentage points."
                )
            elif investment_change < 0:
                areas_to_watch.append(
                    f"Investment allocation decreased by "
                    f"{abs(investment_change)} percentage points."
                )

        return {
            "report_count": len(reports),

            "current": {
                "date": current.get("created_at"),
                "score": current_score,
                "health_status": current.get("health_status"),
            },

            "previous": (
                {
                    "date": previous.get("created_at"),
                    "score": previous_score,
                    "health_status": previous.get("health_status"),
                }
                if previous
                else None
            ),

            "score_change": score_change,

            "history": history,

            "comparison": comparison,

            "improvements": improvements,

            "areas_to_watch": areas_to_watch,
        }