import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * SmartFeed Service
 * All API calls for the SmartFeed module are centralized here.
 * Follows the same pattern as financialHealthService.js
 */
export const smartfeedService = {

    /**
     * Get authenticated headers for API requests.
     * @returns {Promise<Object>} axios headers config
     */
    async getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            return { Authorization: `Bearer ${session.access_token}` };
        }
        return {};
    },

    /**
     * Fetch the personalized SmartFeed.
     * Falls back to mock data if backend is unavailable.
     * @param {Object} params - { category, sort, page, limit }
     * @returns {Promise<Object>}
     */
    async getFeed(params = {}) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/smartfeed/feed`, {
                headers,
                params
            });
            return response.data;
        } catch (error) {
            console.warn('SmartFeed: Backend unavailable, using mock data.', error.message);
            return this.getMockFeed(params);
        }
    },

    /**
     * Fetch trending articles.
     * @returns {Promise<Array>}
     */
    async getTrending() {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/smartfeed/trending`, { headers });
            return response.data;
        } catch (error) {
            console.warn('SmartFeed: Trending endpoint unavailable, using mock.', error.message);
            return this.getMockTrending();
        }
    },

    /**
     * Fetch all available categories.
     * @returns {Promise<Array>}
     */
    async getCategories() {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/smartfeed/categories`, { headers });
            return response.data;
        } catch (error) {
            console.warn('SmartFeed: Categories endpoint unavailable, using mock.', error.message);
            return this.getMockCategories();
        }
    },

    /**
     * Fetch user's bookmarked articles.
     * @returns {Promise<Array>}
     */
    async getBookmarks() {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/smartfeed/bookmarks`, { headers });
            return response.data;
        } catch (error) {
            console.warn('SmartFeed: Bookmarks endpoint unavailable.', error.message);
            return [];
        }
    },

    /**
     * Add an article to bookmarks.
     * @param {string} articleId
     * @returns {Promise<Object>}
     */
    async addBookmark(articleId) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.post(
                `${API_URL}/smartfeed/bookmark`,
                { article_id: articleId },
                { headers }
            );
            return response.data;
        } catch (error) {
            console.warn('SmartFeed: Bookmark add failed.', error.message);
            return { success: false };
        }
    },

    /**
     * Remove an article from bookmarks.
     * @param {string} articleId
     * @returns {Promise<Object>}
     */
    async removeBookmark(articleId) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.delete(
                `${API_URL}/smartfeed/bookmark/${articleId}`,
                { headers }
            );
            return response.data;
        } catch (error) {
            console.warn('SmartFeed: Bookmark remove failed.', error.message);
            return { success: false };
        }
    },

    /**
     * Search articles by keyword.
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async searchArticles(query) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/smartfeed/search`, {
                headers,
                params: { q: query }
            });
            return response.data;
        } catch (error) {
            console.warn('SmartFeed: Search endpoint unavailable, filtering mock data.', error.message);
            const allMock = this.getMockFeed({});
            const q = query.toLowerCase();
            return {
                ...allMock,
                articles: allMock.articles.filter(a =>
                    a.title.toLowerCase().includes(q) ||
                    a.summary.toLowerCase().includes(q) ||
                    a.category.toLowerCase().includes(q)
                )
            };
        }
    },

    // ─────────────────────────────────────────────────
    //  MOCK DATA (fallback when backend is unavailable)
    // ─────────────────────────────────────────────────

    getMockCategories() {
        return [
            { id: 'all', label: 'All', emoji: '📰' },
            { id: 'markets', label: 'Markets', emoji: '📈' },
            { id: 'schemes', label: 'Gov. Schemes', emoji: '🏛️' },
            { id: 'tax', label: 'Tax', emoji: '🧾' },
            { id: 'investment', label: 'Investment', emoji: '💼' },
            { id: 'banking', label: 'Banking', emoji: '🏦' },
            { id: 'insurance', label: 'Insurance', emoji: '🛡️' },
            { id: 'ai_picks', label: 'AI Picks', emoji: '🤖' },
        ];
    },

    getMockTrending() {
        return [
            { id: 't1', title: 'NIFTY 50 hits new all-time high at 25,800', category: 'markets' },
            { id: 't2', title: 'RBI keeps repo rate unchanged at 6.5%', category: 'banking' },
            { id: 't3', title: 'New Income Tax Regime: Who benefits more?', category: 'tax' },
            { id: 't4', title: 'PM Kisan Samman Nidhi — 18th Installment Released', category: 'schemes' },
            { id: 't5', title: 'SIP investments cross ₹20,000 crore monthly milestone', category: 'investment' },
        ];
    },

    getMockFeed({ category = 'all' } = {}) {
        const articles = [
            {
                id: '1',
                type: 'news',
                category: 'markets',
                title: 'NIFTY 50 Closes at Record High — What It Means for Your Portfolio',
                summary: 'The NIFTY 50 index reached an all-time high of 25,800 today, driven by strong FII buying in banking and IT sectors. Analysts suggest that mid-cap funds are poised to outperform in the next quarter.',
                source: 'Economic Times',
                published_at: '2026-07-29T07:00:00Z',
                read_time: 4,
                ai_summary: 'Strong FII inflows boosted NIFTY 50 to record levels. This is a positive signal if you hold large-cap index funds or banking stocks.',
                is_ai_recommended: true,
                bookmarked: false,
                tag: '🔥 Trending',
                tag_color: '#E65C00'
            },
            {
                id: '2',
                type: 'scheme',
                category: 'schemes',
                title: 'PM Kisan Vikas Patra 2.0 — Earn 7.5% Guaranteed Returns',
                summary: 'The government relaunched Kisan Vikas Patra with a revised 7.5% annual return guaranteed by the Government of India. Minimum investment is ₹1,000 with no upper limit.',
                source: 'Ministry of Finance',
                published_at: '2026-07-28T10:00:00Z',
                read_time: 3,
                ai_summary: 'Ideal for risk-averse investors. Guaranteed 7.5% return backed by Government of India — excellent for your emergency fund allocation.',
                is_ai_recommended: true,
                bookmarked: false,
                tag: '🏛️ Government',
                tag_color: '#138808'
            },
            {
                id: '3',
                type: 'news',
                category: 'tax',
                title: 'Budget 2026 Tax Relief: New Slabs Explained Simply',
                summary: 'Finance Minister announced a revised new tax regime with zero tax up to ₹7.5 lakh annual income, and simplified slabs thereafter. Here is a complete breakdown for salaried employees.',
                source: 'NDTV Profit',
                published_at: '2026-07-27T14:30:00Z',
                read_time: 6,
                ai_summary: 'If your income is below ₹7.5 lakh, you owe ₹0 in tax. The new regime benefits middle-income salaried employees the most.',
                is_ai_recommended: false,
                bookmarked: false,
                tag: '🧾 Tax',
                tag_color: '#7C3AED'
            },
            {
                id: '4',
                type: 'ai_pick',
                category: 'ai_picks',
                title: 'AI Insight: 3 Index Funds Matching Your Risk Profile',
                summary: 'Based on your financial profile and moderate-aggressive risk tolerance, our AI engine identified 3 NIFTY index funds with optimal expense ratios and consistent 5-year CAGR above 14%.',
                source: 'FinStack AI Engine',
                published_at: '2026-07-29T08:00:00Z',
                read_time: 5,
                ai_summary: 'Personalized AI recommendation based on your savings rate and investment horizon. These funds align with your stated goal.',
                is_ai_recommended: true,
                bookmarked: false,
                tag: '🤖 AI Pick',
                tag_color: '#0052CC'
            },
            {
                id: '5',
                type: 'news',
                category: 'banking',
                title: 'RBI Repo Rate Unchanged at 6.5% — Impact on EMIs and FDs',
                summary: 'The Reserve Bank of India Monetary Policy Committee voted unanimously to keep the repo rate at 6.5%. This decision will keep home loan and car loan EMIs stable while FD rates remain attractive.',
                source: 'Mint',
                published_at: '2026-07-28T16:00:00Z',
                read_time: 4,
                ai_summary: 'Good news for existing borrowers — your EMI stays the same. If you have idle savings, now is a great time to lock in FD rates before they fall.',
                is_ai_recommended: false,
                bookmarked: false,
                tag: '🏦 Banking',
                tag_color: '#003580'
            },
            {
                id: '6',
                type: 'scheme',
                category: 'schemes',
                title: 'Sukanya Samriddhi Yojana: Why Parents of Girl Children Should Invest Now',
                summary: 'SSY currently offers 8.2% annual interest — the highest among all small savings schemes. With Section 80C benefits and tax-free maturity, it remains the gold standard for parents planning their daughter\'s future.',
                source: 'India Today',
                published_at: '2026-07-26T09:00:00Z',
                read_time: 5,
                ai_summary: '8.2% guaranteed + tax-free on maturity. If you have a girl child under 10 years, opening SSY today is one of the smartest financial moves.',
                is_ai_recommended: true,
                bookmarked: false,
                tag: '🏛️ Government',
                tag_color: '#138808'
            },
            {
                id: '7',
                type: 'news',
                category: 'investment',
                title: 'SIP Investments Cross ₹20,000 Crore Monthly — What This Means',
                summary: 'Monthly SIP contributions in India crossed the ₹20,000 crore milestone for the first time, indicating growing financial discipline among retail investors. SEBI attributes this to expanded digital access.',
                source: 'Business Standard',
                published_at: '2026-07-25T11:00:00Z',
                read_time: 3,
                ai_summary: 'India\'s retail investment culture is maturing rapidly. If you don\'t have an active SIP yet, this is the best time to start — even ₹500/month compounds significantly over 10 years.',
                is_ai_recommended: false,
                bookmarked: false,
                tag: '💼 Investment',
                tag_color: '#E65C00'
            },
            {
                id: '8',
                type: 'news',
                category: 'insurance',
                title: 'Term Life Insurance: Why ₹1 Crore Cover Costs Less Than ₹1,000/Month',
                summary: 'A detailed comparison of top 5 term insurance plans shows that a ₹1 crore cover for a 28-year-old non-smoker costs just ₹700-900/month. Financial planners say term insurance remains the most underutilized safety net.',
                source: 'The Hindu Business Line',
                published_at: '2026-07-24T10:00:00Z',
                read_time: 6,
                ai_summary: 'Your financial profile suggests you are underinsured. A ₹1 crore term plan at your age costs under ₹900/month — that is your biggest financial protection gap.',
                is_ai_recommended: true,
                bookmarked: false,
                tag: '🛡️ Insurance',
                tag_color: '#0A8A4C'
            },
        ];

        const filtered = category === 'all'
            ? articles
            : articles.filter(a => a.category === category);

        return { articles: filtered, total: filtered.length };
    }
};
