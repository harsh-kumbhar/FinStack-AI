from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ArticleBase(BaseModel):
    title: str
    summary: Optional[str] = None
    content: Optional[str] = None
    url: str
    source: Optional[str] = "FinStack News"
    category: Optional[str] = "general"
    image_url: Optional[str] = None
    is_trending: Optional[bool] = False
    is_government_scheme: Optional[bool] = False
    published_at: Optional[datetime] = None

class ArticleResponse(ArticleBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # New fields for personalization and UI enrichment
    relevance_score: Optional[int] = None
    why_it_matters: Optional[str] = None
    tag: Optional[str] = None
    tag_color: Optional[str] = None
    ai_summary: Optional[str] = None
    read_time: Optional[int] = None

class FeedResponse(BaseModel):
    # Added featured_article for the UI hierarchy
    featured_article: Optional[ArticleResponse] = None
    articles: List[ArticleResponse]
    total: Optional[int] = None

class BookmarkRequest(BaseModel):
    article_id: str

class BookmarkResponse(BaseModel):
    id: str
    user_profile_id: str
    article_id: str
    created_at: Optional[datetime] = None