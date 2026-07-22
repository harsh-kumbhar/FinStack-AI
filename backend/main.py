from fastapi import FastAPI

from routers.financial_health import router as financial_health_router

app = FastAPI(
    title="FinStack API",
    version="1.0.0",
)

app.include_router(financial_health_router)