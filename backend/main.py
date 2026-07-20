from fastapi import FastAPI

app = FastAPI(title="FinStack API")


@app.get("/")
def root():
    return {
        "message": "Welcome to FinStack API!"
    }