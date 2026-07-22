from schemas.financial_health import (
    FinancialProfileData,
)

from services.feature_engineering import (
    FeatureEngineeringService,
)

from services.persona_classifier import (
    PersonaClassifierService,
)

from ml.predict import (
    predict_score,
)

from services.rule_engine import RuleEngine

from services.llm_engine import LLMEngine


class MLPredictorService:

    @staticmethod
    def predict(profile: FinancialProfileData) -> float:

        engineered_features = (
            FeatureEngineeringService.generate_features(profile)
        )

        persona = (
            PersonaClassifierService.classify(
                profile,
                engineered_features,
            )
        )

        feature_dict = {
            "persona": persona,
            **profile.model_dump(),
            **engineered_features.model_dump(),
        }

        score = predict_score(feature_dict)

        analysis = RuleEngine.evaluate(
            score,
            engineered_features,
        )
        from services.llm_engine import LLMEngine

        ai_summary = LLMEngine.generate_summary(
            persona=persona,
            score=score,
            health_status=analysis["health_status"],
            strengths=analysis["strengths"],
            weaknesses=analysis["weaknesses"],
            risks=analysis["risks"],
            recommendations=analysis["recommendations"],
        )

        return {
            "score": score,
            **analysis,
            "ai_summary": ai_summary,
        }