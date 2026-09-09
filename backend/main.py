from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from modules.financial_health.router import router as financial_health_router
from modules.smartfeed.router import router as smartfeed_router
from modules.tax_estimator.router import router as tax_estimator_router
from modules.loan_risk_assessment.router import router as loan_risk_assessment_router

app = FastAPI(
    title="FinStack API",
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(financial_health_router)
app.include_router(smartfeed_router)
app.include_router(tax_estimator_router)
app.include_router(loan_risk_assessment_router)