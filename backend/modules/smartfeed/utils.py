import os
import requests
from datetime import datetime
from common.database import supabase
from dotenv import load_dotenv

load_dotenv()
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

class SmartFeedIngestion:
    
    CATEGORY_RULES = {
        "tax": ["tax", "gst", "income tax", "itr", "deduction", "tds", "slab"],
        "schemes": ["scheme", "pm kisan", "yojana", "govt", "government", "subsidy", "kisan", "sukanya"],
        "banking": ["rbi", "repo rate", "bank", "fd", "fixed deposit", "emi", "loan", "interest rate"],
        "markets": ["nifty", "sensex", "stock", "share market", "equity", "ipo", "sebi"],
        "investment": ["mutual fund", "sip", "gold", "bonds", "portfolio", "cagr", "returns"],
        "insurance": ["term insurance", "life insurance", "health insurance", "policy", "premium", "claim"],
    }

    # Heavily expanded blacklist for non-financial context
    IGNORE_KEYWORDS = [
        "murder", "shooting", "kill", "crime", "rape", "assault", "police", "fbi", "mosque",
        "coach", "cricket", "match", "movie", "film", "cockroach", "actor", "actress", 
        "california", "florida", "us news"
    ]

    @staticmethod
    def fetch_live_news() -> list:
        if not NEWS_API_KEY:
            print("Error: NEWS_API_KEY not found in .env file.")
            return []
            
        current_month_start = datetime.today().replace(day=1).strftime('%Y-%m-%d')
        
        # Stricter query targeting the Indian market
        query = '("stock market" OR "NIFTY" OR "RBI" OR "tax" OR "mutual fund" OR "economy" OR "finance") AND (India OR Indian)'
        
        # ONLY pull from top Indian financial publishers to guarantee context
        domains = "economictimes.indiatimes.com,livemint.com,moneycontrol.com,business-standard.com,financialexpress.com,ndtvprofit.com"
            
        url = (
            f"https://newsapi.org/v2/everything?"
            f"q={query}&"
            f"domains={domains}&"
            f"from={current_month_start}&"
            f"language=en&"
            f"sortBy=publishedAt&"
            f"apiKey={NEWS_API_KEY}"
        )
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            return data.get("articles", [])
        except requests.exceptions.RequestException as e:
            print(f"Failed to fetch news: {e}")
            return []

    @staticmethod
    def process_and_store_articles():
        raw_articles = SmartFeedIngestion.fetch_live_news()
        inserted_count = 0

        for article in raw_articles:
            title = article.get("title", "")
            description = article.get("description", "") or ""
            content = (title + " " + description).lower()
            
            if not title or not article.get("url") or "[Removed]" in title:
                continue
                
            if any(bad_word in content for bad_word in SmartFeedIngestion.IGNORE_KEYWORDS):
                continue

            # FIX: Default to 'general' instead of 'markets' so random news isn't tagged as investment
            detected_category = "general"
            for cat, keywords in SmartFeedIngestion.CATEGORY_RULES.items():
                if any(kw in content for kw in keywords):
                    detected_category = cat
                    break

            formatted_article = {
                "title": title,
                "summary": description if description else "Click read to view full financial report.",
                "content": article.get("content", ""),
                "url": article["url"],
                "source": article.get("source", {}).get("name", "Financial Express"),
                "category": detected_category,
                "image_url": article.get("urlToImage"),
                "is_trending": any(term in content for term in ["nifty", "rbi", "tax", "sensex", "economy"]),
                "is_government_scheme": detected_category == "schemes",
                "published_at": article.get("publishedAt", datetime.now().isoformat())
            }

            try:
                supabase.table("smartfeed_article").upsert(formatted_article, on_conflict="url").execute()
                inserted_count += 1
            except Exception as e:
                print(f"Skipping DB insert error: {e}")
                
        print(f"Successfully processed and stored {inserted_count} clean financial articles.")

if __name__ == "__main__":
    print("Starting Clean Financial News Ingestion Pipeline...")
    SmartFeedIngestion.process_and_store_articles()