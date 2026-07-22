from fastapi import Header, HTTPException
from supabase import create_client

from config import (
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)


def get_current_user(authorization: str = Header(...)):
    """
    Returns the currently authenticated Supabase user.
    """

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid Authorization Header",
        )

    token = authorization.split(" ")[1]

    try:

        response = supabase.auth.get_user(token)

        return response.user

    except Exception:

        raise HTTPException(
            status_code=401,
            detail="Invalid Token",
        )