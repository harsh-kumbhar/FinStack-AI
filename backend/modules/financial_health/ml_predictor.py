from modules.financial_health.schema import FinancialProfileData

from modules.financial_health.feature_engineering import (
    FeatureEngineeringService,
)

from modules.financial_health.persona_classifier import (
    PersonaClassifierService,
)

from modules.financial_health.persona_engine import (
    PersonaEngine,
)

from modules.financial_health.recommendation_engine import (
    RecommendationEngine,
)

from modules.financial_health.score_breakdown import (
    ScoreBreakdownEngine,
)

from modules.financial_health.rule_engine import (
    RuleEngine,
)

from ml.predict import predict_score


class MLPredictorService:

    @staticmethod
    def predict(profile: FinancialProfileData):

        # ============================================
        # Feature Engineering
        # ============================================

        engineered_features = (
            FeatureEngineeringService.generate_features(profile)
        )

        # ============================================
        # ML Persona
        # ============================================

        ml_persona = (
            PersonaClassifierService.classify(
                profile,
                engineered_features,
            )
        )

        # ============================================
        # Prepare Feature Vector
        # ============================================

        feature_dict = {
            "persona": ml_persona,
            **profile.model_dump(),
            **engineered_features.model_dump(),
        }

        # ============================================
        # ML Prediction
        # ============================================

        score = predict_score(feature_dict)

        # ============================================
        # Financial Analysis
        # ============================================

        analysis = RuleEngine.evaluate(
            score,
            engineered_features,
        )

        # ============================================
        # Recommendation Engine
        # ============================================

        recommendations = RecommendationEngine.generate(
            analysis["metrics"]
        )

        # ============================================
        # Score Breakdown
        # ============================================

        score_breakdown = ScoreBreakdownEngine.generate(
            analysis["metrics"]
        )

        # ============================================
        # UI Persona
        # ============================================

        persona = PersonaEngine.generate(
            score,
            analysis["metrics"],
        )

        # ============================================
        # AI Summary
        # ============================================

        from modules.financial_health.llm_engine import LLMEngine

        ai_summary = LLMEngine.generate_summary(
            persona=persona["title"],
            score=score,
            health_status=analysis["health_status"],
            strengths=analysis["strengths"],
            weaknesses=analysis["weaknesses"],
            risks=analysis["risks"],
            recommendations=recommendations,
        )

        # ============================================
        # Final Response
        # ============================================

        return {

            "ml_health_score": score,

            "health_status": analysis["health_status"],

            "metrics": analysis["metrics"],

            "score_breakdown": score_breakdown,

            "persona": persona,

            "strengths": analysis["strengths"],

            "weaknesses": analysis["weaknesses"],

            "risks": analysis["risks"],

            "recommendations": recommendations,

            "ai_summary": ai_summary,

            "engineered_features": engineered_features.model_dump(),
        }