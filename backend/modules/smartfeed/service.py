import math
from typing import Optional
from modules.smartfeed.repository import SmartFeedRepository

TAG_META = {
    "markets": {"tag": "📈 Markets", "tag_color": "#003580"},
    "schemes": {"tag": "🏛️ Gov. Scheme", "tag_color": "#138808"},
    "tax": {"tag": "🧾 Tax", "tag_color": "#7C3AED"},
    "investment": {"tag": "💼 Investment", "tag_color": "#E65C00"},
    "banking": {"tag": "🏦 Banking", "tag_color": "#0052CC"},
    "insurance": {"tag": "🛡️ Insurance", "tag_color": "#0A8A4C"},
    "ai_picks": {"tag": "🤖 AI Pick", "tag_color": "#0052CC"},
    "general": {"tag": "📰 News", "tag_color": "#1A1A2E"}
}

class SmartFeedService:
    
    @staticmethod
    def _enrich_article(article: dict) -> dict:
        cat = article.get("category", "general")
        meta = TAG_META.get(cat, TAG_META["general"])
        
        text = (article.get("title", "") or "") + " " + (article.get("summary", "") or "")
        words = len(text.split())
        read_time = max(1, math.ceil(words / 200))

        return {
            **article,
            "read_time": article.get("read_time") or read_time,
            "tag": meta["tag"],
            "tag_color": meta["tag_color"],
            "ai_summary": article.get("ai_summary") or (f"AI Insight: Summary of {article.get('source', 'market updates')}.") if article.get("is_ai_recommended") else None
        }

    @staticmethod
    def get_personalized_feed(category: Optional[str] = None, search: Optional[str] = None):
        articles = SmartFeedRepository.get_latest_articles(category=category, search=search, limit=30)
        enriched = [SmartFeedService._enrich_article(a) for a in articles]
        return {"articles": enriched, "total": len(enriched)}

    @staticmethod
    def get_trending():
        return SmartFeedRepository.get_trending_articles(limit=5)

    @staticmethod
    def get_dashboard_widgets():
        trending = SmartFeedRepository.get_trending_articles(limit=3)
        latest = SmartFeedRepository.get_latest_articles(limit=3)
        enriched_latest = [SmartFeedService._enrich_article(a) for a in latest]
        return {
            "trending_articles": trending,
            "latest_news": enriched_latest
        }

    @staticmethod
    def bookmark_article(user_profile_id: str, article_id: str):
        return SmartFeedRepository.add_bookmark(user_profile_id, article_id)

    @staticmethod
    def get_bookmarks(user_profile_id: str):
        raw_bookmarks = SmartFeedRepository.get_user_bookmarks(user_profile_id)
        bookmarked_articles = [b.get("smartfeed_article") for b in raw_bookmarks if b.get("smartfeed_article")]
        enriched = [SmartFeedService._enrich_article(a) for a in bookmarked_articles]
        return {"articles": enriched}

    @staticmethod
    def remove_bookmark(user_profile_id: str, bookmark_id: str):
        success = SmartFeedRepository.remove_bookmark(user_profile_id, bookmark_id)
        if not success:
            raise ValueError("Bookmark not found or unauthorized.")
        return {"message": "Bookmark removed successfully."}

    @staticmethod
    def get_categories():
        return SmartFeedRepository.get_categories()