from database import supabase


class HistoryService:

    @staticmethod
    def save_report(
        user_id: str,
        prediction: dict,
        engineered_features: dict,
    ):
        """
        Saves a completed financial health analysis
        into Supabase.
        """

        report = {

            # User
            "user_id": user_id,

            # Scores
            "ml_health_score": prediction["ml_health_score"],
            "final_health_score": prediction["final_health_score"],
            "rule_health_score": prediction["rule_health_score"],
            "health_status": prediction["health_status"],
            "ml_model_version": "finhealth_v1.0",

            # Engineered Features
            "savings_rate": engineered_features["savings_rate"],
            "expense_ratio": engineered_features["expense_ratio"],
            "disposable_income": engineered_features["disposable_income"],
            "debt_to_income_ratio": engineered_features["debt_to_income_ratio"],
            "emergency_fund_months": engineered_features["emergency_fund_months"],
            "investment_ratio": engineered_features["investment_ratio"],
            "insurance_ratio": engineered_features["insurance_ratio"],
            "net_monthly_cashflow": engineered_features["net_monthly_cashflow"],

            # AI
            "ai_summary": prediction["ai_summary"],
            "ai_strengths": prediction["strengths"],
            "ai_weaknesses": prediction["weaknesses"],
            "ai_risks": prediction["risks"],
            "ai_recommendations": prediction["recommendations"],
            "ai_next_steps": prediction.get("next_steps", []),

            # PDF
            "report_pdf_url": None,
        }

        response = (
            supabase
            .table("financial_health_reports")
            .insert(report)
            .execute()
        )

        if not response.data:
            raise Exception("Failed to save financial report.")

        return response.data[0]

    @staticmethod
    def get_user_reports(user_id: str):

        response = (
            supabase
            .table("financial_health_reports")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        return response.data

    @staticmethod
    def get_report(report_id: str):

        response = (
            supabase
            .table("financial_health_reports")
            .select("*")
            .eq("id", report_id)
            .single()
            .execute()
        )

        return response.data

    @staticmethod
    def delete_report(report_id: str):

        (
            supabase
            .table("financial_health_reports")
            .delete()
            .eq("id", report_id)
            .execute()
        )

        return True