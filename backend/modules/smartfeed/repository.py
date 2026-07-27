from common.database import supabase
from typing import List, Dict, Any

class SmartFeedRepository:
    
    @staticmethod
    def get_latest_articles(limit: int = 20) -> List[Dict[str, Any]]:
        response = supabase.table("smartfeed_article")\
            .select("*")\
            .order("published_at", desc=True)\
            .limit(limit)\
            .execute()
        return response.data

    @staticmethod
    def get_trending_articles(limit: int = 5) -> List[Dict[str, Any]]:
        response = supabase.table("smartfeed_article")\
            .select("*")\
            .eq("is_trending", True)\
            .order("published_at", desc=True)\
            .limit(limit)\
            .execute()
        return response.data

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
        return response.data

    @staticmethod
    def remove_bookmark(user_profile_id: str, bookmark_id: str) -> bool:
        response = supabase.table("smartfeed_bookmark")\
            .delete()\
            .match({"id": bookmark_id, "user_profile_id": user_profile_id})\
            .execute()
        # Returns True if data was deleted, False otherwise
        return len(response.data) > 0

    @staticmethod
    def get_categories() -> List[str]:
        # Returns a distinct list of categories currently in the database
        response = supabase.table("smartfeed_article")\
            .select("category")\
            .execute()
        
        # Extract unique categories
        categories = {item["category"] for item in response.data if item.get("category")}
        return list(categories)