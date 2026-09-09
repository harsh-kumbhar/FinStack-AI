from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from common.database import get_current_user
from modules.smartfeed.service import SmartFeedService
from modules.smartfeed.schema import FeedResponse, BookmarkRequest, BookmarkResponse

router = APIRouter(
    prefix="/smartfeed",
    tags=["SmartFeed"],
)

@router.get("/feed", response_model=FeedResponse)
def get_feed(category: Optional[str] = Query(None), user=Depends(get_current_user)):
    # Passing user.id to calculate personalization
    return SmartFeedService.get_personalized_feed(user_profile_id=user.id, category=category)

@router.get("/search", response_model=FeedResponse)
def search_articles(q: Optional[str] = Query(None), user=Depends(get_current_user)):
    # Passing user.id here as well
    return SmartFeedService.get_personalized_feed(user_profile_id=user.id, search=q)

@router.get("/trending")
def get_trending(user=Depends(get_current_user)):
    return SmartFeedService.get_trending()

@router.get("/dashboard-widgets")
def get_dashboard_widgets(user=Depends(get_current_user)):
    return SmartFeedService.get_dashboard_widgets()

@router.post("/bookmark", response_model=BookmarkResponse)
def bookmark_article(request: BookmarkRequest, user=Depends(get_current_user)):
    try:
        result = SmartFeedService.bookmark_article(user.id, request.article_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/bookmarks", response_model=FeedResponse)
def get_bookmarks(user=Depends(get_current_user)):
    return SmartFeedService.get_bookmarks(user.id)

@router.delete("/bookmark/{bookmark_id}")
def remove_bookmark(bookmark_id: str, user=Depends(get_current_user)):
    try:
        return SmartFeedService.remove_bookmark(user.id, bookmark_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/categories")
def get_categories():
    return SmartFeedService.get_categories()