from common.database import supabase
from typing import List, Dict, Any, Optional

class SmartFeedRepository:
    
    @staticmethod
    def get_latest_articles(category: Optional[str] = None, search: Optional[str] = None, limit: int = 30) -> List[Dict[str, Any]]:
        query = supabase.table("smartfeed_article").select("*").order("published_at", desc=True)
        
        # Filter by category if specified (and not 'all')
        if category and category.lower() != "all":
            query = query.eq("category", category.lower())
            
        # Filter by search query if provided
        if search and search.strip():
            query = query.ilike("title", f"%{search.strip()}%")
            
        response = query.limit(limit).execute()
        return response.data or []

    @staticmethod
    def get_trending_articles(limit: int = 5) -> List[Dict[str, Any]]:
        response = supabase.table("smartfeed_article")\
            .select("id, title, category")\
            .eq("is_trending", True)\
            .order("published_at", desc=True)\
            .limit(limit)\
            .execute()
        
        # Fallback if no specific trending flag is set
        if not response.data:
            response = supabase.table("smartfeed_article")\
                .select("id, title, category")\
                .order("published_at", desc=True)\
                .limit(limit)\
                .execute()
                
        return response.data or []

    @staticmethod
    def add_bookmark(user_profile_id: str, article_id: str) -> Dict[str, Any]:
        response = supabase.table("smartfeed_bookmark")\
            .insert({"user_profile_id": user_profile_id, "article_id": article_id})\
            .execute()
        return response.data[0] if response.data else {}

    @staticmethod
    def get_user_bookmarks(user_profile_id: str) -> List[Dict[str, Any]]:
        response = supabase.table("smartfeed_bookmark")\
            .select("id, created_at, smartfeed_article(*)")\
            .eq("user_profile_id", user_profile_id)\
            .execute()
        return response.data or []

    @staticmethod
    def remove_bookmark(user_profile_id: str, bookmark_id: str) -> bool:
        response = supabase.table("smartfeed_bookmark")\
            .delete()\
            .match({"id": bookmark_id, "user_profile_id": user_profile_id})\
            .execute()
        return len(response.data) > 0

    @staticmethod
    def get_categories() -> List[Dict[str, str]]:
        return [
            { "id": "all", "label": "All", "emoji": "📰" },
            { "id": "markets", "label": "Markets", "emoji": "📈" },
            { "id": "schemes", "label": "Gov. Schemes", "emoji": "🏛️" },
            { "id": "tax", "label": "Tax", "emoji": "🧾" },
            { "id": "investment", "label": "Investment", "emoji": "💼" },
            { "id": "banking", "label": "Banking", "emoji": "🏦" },
            { "id": "insurance", "label": "Insurance", "emoji": "🛡️" },
            { "id": "ai_picks", "label": "AI Picks", "emoji": "🤖" },
        ]