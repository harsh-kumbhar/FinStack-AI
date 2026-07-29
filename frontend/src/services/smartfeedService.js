// --- src/services/smartfeedService.js ---
import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const smartfeedService = {

    async getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            return { Authorization: `Bearer ${session.access_token}` };
        }
        return {};
    },

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
                summary: 'The NIFTY 50 index reached an all-time high of 25,800 today, driven by strong FII buying in banking and IT sectors.',
                content: 'Analysts suggest that mid-cap funds are poised to outperform in the next quarter as market breadth continues to expand. FIIs injected over ₹4,500 crore in today\'s trading session alone, signaling strong global confidence in the Indian macroeconomic landscape.',
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
                summary: 'The government relaunched Kisan Vikas Patra with a revised 7.5% annual return guaranteed by the Government of India.',
                content: 'Minimum investment is ₹1,000 with no upper limit. The maturity period has been optimized to 115 months, effectively doubling your investment. This makes it a highly secure instrument for conservative portfolios.',
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
                summary: 'Finance Minister announced a revised new tax regime with zero tax up to ₹7.5 lakh annual income, and simplified slabs thereafter.',
                content: 'Here is a complete breakdown for salaried employees: Incomes between ₹7.5L to ₹10L will be taxed at 10%, while incomes above ₹15L remain at the 30% bracket. Standard deduction has also been marginally increased to ₹75,000 to further ease the burden on middle-class taxpayers.',
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
                summary: 'Based on your financial profile and moderate-aggressive risk tolerance, our AI engine identified 3 NIFTY index funds.',
                content: 'These funds feature optimal expense ratios (below 0.2%) and consistent 5-year CAGR above 14%. By shifting your current surplus liquidity into these specific passive instruments, you could potentially reduce your retirement timeline by 2.4 years.',
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
                summary: 'The Reserve Bank of India Monetary Policy Committee voted unanimously to keep the repo rate at 6.5%.',
                content: 'This decision will keep home loan and car loan EMIs stable while FD rates remain attractive. Governor Das emphasized that inflation remains closely monitored, but current growth metrics allow the central bank to maintain the status quo without risking economic overheating.',
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
                summary: 'SSY currently offers 8.2% annual interest — the highest among all small savings schemes.',
                content: 'With Section 80C benefits and tax-free maturity, it remains the gold standard for parents planning their daughter\'s future. Accounts can be opened with just ₹250, and deposits can be made until the child reaches 15 years of age.',
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
                summary: 'Monthly SIP contributions in India crossed the ₹20,000 crore milestone for the first time, indicating growing financial discipline.',
                content: 'SEBI attributes this to expanded digital access and increased financial literacy across Tier 2 and Tier 3 cities. This sticky domestic capital is providing unprecedented stability to Indian markets against global volatility.',
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
                summary: 'A detailed comparison of top 5 term insurance plans shows that a ₹1 crore cover for a 28-year-old non-smoker costs just ₹700-900/month.',
                content: 'Financial planners say term insurance remains the most underutilized safety net. Locking in a premium in your late 20s ensures that your rates never increase for the duration of the policy, providing massive leverage against unforeseen tragedies.',
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