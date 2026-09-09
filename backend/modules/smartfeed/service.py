import math
from typing import Optional, Tuple, Dict, Any
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
    def _enrich_article(article: Dict[str, Any]) -> Dict[str, Any]:
        cat = article.get("category") or "general"
        meta = TAG_META.get(cat, TAG_META["general"])
        
        title = str(article.get("title") or "")
        summary = str(article.get("summary") or "")
        text = title + " " + summary
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
    def _calculate_relevance(article: Dict[str, Any], context: Dict[str, Any]) -> Tuple[int, Optional[str]]:
        score = 0
        reasons = []

        title = str(article.get("title") or "")
        summary = str(article.get("summary") or "")
        content = (title + " " + summary).lower()
        
        category = str(article.get("category") or "")
        
        # 1. Goal Match
        # 1. Goal Match (Full Enum Coverage)
        goal = context.get("financial_goal")
        
        if goal == "buy_house":
            house_keywords = ["home loan", "real estate", "housing", "property market", "mortgage", "pm awas"]
            if any(kw in content for kw in house_keywords):
                score += 30
                reasons.append("Your financial goal is to buy a house, making these housing and real estate updates highly relevant.")
                
        elif goal == "investment":
            invest_keywords = ["stock", "market", "nifty", "sensex", "mutual fund", "sip", "portfolio", "equity", "ipo"]
            if category in ["investment", "markets"] and any(kw in content for kw in invest_keywords):
                score += 30
                reasons.append("You have an active investment goal, making these specific market and investment trends relevant.")
                
        elif goal == "emergency_fund":
            emergency_keywords = ["fd", "fixed deposit", "savings", "liquid fund", "repo rate", "rbi"]
            if category in ["banking", "investment"] and any(kw in content for kw in emergency_keywords):
                score += 30
                reasons.append("Building an emergency fund is your top goal. Updates on interest rates and safe savings instruments are highly relevant.")
                
        elif goal == "buy_vehicle":
            auto_keywords = ["auto loan", "car loan", "vehicle", "emi", "auto sector"]
            if any(kw in content for kw in auto_keywords):
                score += 30
                reasons.append("You are saving for a vehicle, making these updates on auto loans and sector trends relevant.")
                
        elif goal == "education":
            edu_keywords = ["education loan", "student", "tuition", "education scheme", "sukanya samriddhi"]
            if any(kw in content for kw in edu_keywords):
                score += 30
                reasons.append("With your goal set to education funding, these specific schemes and loan updates are highly relevant to you.")
                
        elif goal == "retirement":
            retire_keywords = ["nps", "pension", "pf", "epfo", "retirement", "senior citizen"]
            if any(kw in content for kw in retire_keywords):
                score += 30
                reasons.append("You are planning for retirement, making these long-term savings and pension updates highly relevant.")
                
        elif goal == "travel":
            travel_keywords = ["forex", "currency", "rupee", "credit card", "travel insurance"]
            if any(kw in content for kw in travel_keywords):
                score += 30
                reasons.append("You are saving for travel, making these updates on currency exchange and travel finance relevant.")

        # 2. Location Match
        location = context.get("location")
        if location and str(location).lower() in content:
            if category in ["schemes", "tax", "banking", "investment"]:
                score += 25
                reasons.append(f"This article includes specific financial updates or schemes affecting {location}.")
            else:
                score += 5

        # 3. Financial Health Match
        recommendations = context.get("recommendations") or []
        if any("debt" in str(r).lower() for r in recommendations) and (category == "banking" or "loan" in content or "emi" in content):
            score += 20
            reasons.append("Your financial report shows high debt. This article discusses changes that may affect borrowing costs.")

        # 4. Trending Bonus
        if article.get("is_trending"):
            score += 5
            
        why_it_matters = reasons[0] if reasons else None

        return score, why_it_matters

    @staticmethod
    def get_personalized_feed(user_profile_id: str, category: Optional[str] = None, search: Optional[str] = None):
        articles = SmartFeedRepository.get_latest_articles(category=category, search=search, limit=30)
        context = SmartFeedRepository.get_user_context(user_profile_id)
        
        enriched_articles = []
        
        for article in articles:
            enriched = SmartFeedService._enrich_article(article)
            score, why_it_matters = SmartFeedService._calculate_relevance(article, context)
            
            enriched["relevance_score"] = score
            enriched["why_it_matters"] = why_it_matters
            enriched_articles.append(enriched)
            
        enriched_articles.sort(
            key=lambda x: (
                x.get("relevance_score") or 0, 
                x.get("published_at") or ""
            ), 
            reverse=True
        )
        
        featured_article = None
        if enriched_articles and (enriched_articles[0].get("relevance_score") or 0) > 0:
            featured_article = enriched_articles.pop(0)

        return {
            "featured_article": featured_article,
            "articles": enriched_articles,
            "total": len(enriched_articles) + (1 if featured_article else 0)
        }

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