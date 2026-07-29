from modules.smartfeed.repository import SmartFeedRepository

class SmartFeedService:
    
    @staticmethod
    def get_personalized_feed():
        # Future Scope: Integrate ML recommendations or AI summaries here
        articles = SmartFeedRepository.get_latest_articles(limit=15)
        return {"articles": articles}

    @staticmethod
    def get_dashboard_widgets():
        trending = SmartFeedRepository.get_trending_articles(limit=3)
        latest = SmartFeedRepository.get_latest_articles(limit=3)
        return {
            "trending_articles": trending,
            "latest_news": latest
        }

    @staticmethod
    def bookmark_article(user_profile_id: str, article_id: str):
        return SmartFeedRepository.add_bookmark(user_profile_id, article_id)

    @staticmethod
    def get_bookmarks(user_profile_id: str):
        raw_bookmarks = SmartFeedRepository.get_user_bookmarks(user_profile_id)
        # Flatten the nested article structure for the frontend
        bookmarked_articles = [b.get("smartfeed_article") for b in raw_bookmarks if b.get("smartfeed_article")]
        return {"articles": bookmarked_articles}

    @staticmethod
    def remove_bookmark(user_profile_id: str, bookmark_id: str):
        success = SmartFeedRepository.remove_bookmark(user_profile_id, bookmark_id)
        if not success:
            raise ValueError("Bookmark not found or unauthorized.")
        return {"message": "Bookmark removed successfully."}

    @staticmethod
    def get_categories():
        categories = SmartFeedRepository.get_categories()
        # Ensure 'general' is always an option
        if "general" not in categories:
            categories.append("general")
        return {"categories": categories}