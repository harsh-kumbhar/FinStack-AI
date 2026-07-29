from fastapi import APIRouter, Depends, HTTPException
from common.database import get_current_user
from modules.smartfeed.service import SmartFeedService
from modules.smartfeed.schema import FeedResponse, BookmarkRequest, BookmarkResponse

router = APIRouter(
    prefix="/smartfeed",
    tags=["SmartFeed"],
)

@router.get("/feed", response_model=FeedResponse)
def get_feed(user=Depends(get_current_user)):
    return SmartFeedService.get_personalized_feed()

@router.get("/dashboard-widgets")
def get_dashboard_widgets(user=Depends(get_current_user)):
    return SmartFeedService.get_dashboard_widgets()

@router.post("/bookmark", response_model=BookmarkResponse)
def bookmark_article(request: BookmarkRequest, user=Depends(get_current_user)):
    try:
        # Assuming user.id maps to user_profile_id. 
        # In a real scenario, you might need to query `user_profile` to get the UUID.
        result = SmartFeedService.bookmark_article(user.id, request.article_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/bookmarks", response_model=FeedResponse)
def get_bookmarks(user=Depends(get_current_user)):
    return SmartFeedService.get_bookmarks(user.id)