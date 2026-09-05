import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartfeedService } from '../services/smartfeedService';
import FeedCard from '../components/smartfeed/FeedCard';
import FeedEmptyState from '../components/smartfeed/FeedEmptyState';
import { FeedSkeletonGrid } from '../components/smartfeed/FeedCardSkeleton';
import SmartFeedModal from '../components/smartfeed/SmartFeedModal';
import { useAuth } from '../contexts/AuthContext';
import '../styles/smartfeed.css';

// Sidebar nav items (identical structure to Dashboard.jsx)
const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed', active: true },
    { label: 'Document Intelligence', soon: true },
    { label: 'Loan Risk Assessment', soon: true },
    { label: 'Tax Estimator', path: '/tax-estimator' },
    { label: 'Investment Advisor', soon: true },
    { label: 'Settings', soon: true },
];

// Inline styles — matching the exact object pattern used in Dashboard.jsx
const styles = {
    layout: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        fontFamily: "'Noto Sans', 'Segoe UI', sans-serif"
    },
    sidebar: {
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        width: '240px',
        backgroundColor: 'var(--navy)',
        color: 'var(--white)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        boxShadow: 'var(--shadow)'
    },
    sidebarHeader: {
        padding: '20px',
        fontSize: '24px',
        fontWeight: 'bold',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        fontFamily: "'Noto Serif', Georgia, serif"
    },
    sidebarNav: {
        flex: 1, padding: '20px 0',
        display: 'flex', flexDirection: 'column', gap: '4px'
    },
    navItem: {
        padding: '12px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.8)',
        transition: 'var(--transition)',
        fontSize: '14px'
    },
    navItemActive: {
        backgroundColor: 'var(--navy2)',
        color: 'var(--white)',
        borderLeft: '4px solid var(--saffron)'
    },
    badge: {
        fontSize: '10px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: '2px 6px',
        borderRadius: '4px',
        fontWeight: 'bold'
    },
    logoutBtn: {
        padding: '8px 16px',
        backgroundColor: 'var(--error-light)',
        color: 'var(--error)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontWeight: '600',
        cursor: 'pointer'
    }
};

/**
 * SmartFeed Page
 * Main SmartFeed page with categories, search, trending, and article feed.
 * Follows the exact architecture of Dashboard.jsx and FinancialHealthAnalyzer.jsx
 */
export default function SmartFeed() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    // Feed state
    const [articles, setArticles] = useState([]);
    const [trending, setTrending] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

    // UI state
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'bookmarks'
    const [error, setError] = useState(null);
    const [selectedArticle, setSelectedArticle] = useState(null);

    // ── Load initial data ──
    useEffect(() => {
        loadInitialData();
    }, []);

    // ── Reload feed when category changes ──
    useEffect(() => {
        if (!loading) loadFeed(activeCategory);
    }, [activeCategory]);

    async function loadInitialData() {
        setLoading(true);
        setError(null);
        try {
            const [feedData, trendingData, categoriesData] = await Promise.all([
                smartfeedService.getFeed({ category: activeCategory }),
                smartfeedService.getTrending(),
                smartfeedService.getCategories()
            ]);
            setArticles(feedData.articles || []);
            setTrending(trendingData || []);
            setCategories(categoriesData || []);
        } catch (err) {
            console.error('SmartFeed: loadInitialData error', err);
            setError('Failed to load SmartFeed. Using fallback data.');
        } finally {
            setLoading(false);
        }
    }

    async function loadFeed(category) {
        setLoading(true);
        try {
            const feedData = await smartfeedService.getFeed({ category });
            setArticles(feedData.articles || []);
        } catch (err) {
            console.error('SmartFeed: loadFeed error', err);
        } finally {
            setLoading(false);
        }
    }

    // ── Search Handler ──
    const handleSearch = useCallback(async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            loadFeed(activeCategory);
            return;
        }
        setLoading(true);
        try {
            const result = await smartfeedService.searchArticles(query);
            setArticles(result.articles || []);
        } catch {
            setArticles([]);
        } finally {
            setLoading(false);
        }
    }, [activeCategory]);

    // ── Debounced search ──
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== '') handleSearch(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── Bookmark Toggle ──
    async function handleBookmarkToggle(articleId, isBookmarking) {
        setBookmarkedIds(prev => {
            const next = new Set(prev);
            isBookmarking ? next.add(articleId) : next.delete(articleId);
            return next;
        });
        setArticles(prev =>
            prev.map(a => a.id === articleId ? { ...a, bookmarked: isBookmarking } : a)
        );
        if (isBookmarking) {
            await smartfeedService.addBookmark(articleId);
        } else {
            await smartfeedService.removeBookmark(articleId);
        }
    }

    // ── Reset Filters ──
    function handleReset() {
        setSearchQuery('');
        setActiveCategory('all');
        loadFeed('all');
    }

    // ── Bookmarked articles ──
    const bookmarkedArticles = articles.filter(a => a.bookmarked || bookmarkedIds.has(a.id));
    const displayArticles = activeTab === 'bookmarks' ? bookmarkedArticles : articles;

    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div style={styles.layout}>

            {/* ── SIDEBAR ── */}
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader}>FinStack</div>
                <nav style={styles.sidebarNav}>
                    {SIDEBAR_ITEMS.map((item, idx) => (
                        <div
                            key={idx}
                            style={{ ...styles.navItem, ...(item.active ? styles.navItemActive : {}) }}
                            onClick={() => {
                                if (item.path) navigate(item.path);
                            }}
                        >
                            <span>{item.label}</span>
                            {item.soon && <span style={styles.badge}>Soon</span>}
                        </div>
                    ))}
                </nav>
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={styles.navItem} onClick={logout}>Logout</div>
                </div>
            </aside>

            {/* ── MAIN AREA ── */}
            <main className="sf-main">

                {/* Top Bar */}
                <header className="sf-topbar">
                    <div style={{ fontWeight: '600', color: 'var(--navy)', fontSize: '15px' }}>
                        📰 SmartFeed
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ color: 'var(--text2)', fontSize: '13px' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                {/* Page Content */}
                <div className="sf-content">

                    {/* Page Header + Search */}
                    <div className="sf-page-header">
                        <div>
                            <h1 className="sf-page-title">SmartFeed</h1>
                            <p className="sf-page-sub">
                                AI-curated financial news, government schemes, and personalized insights
                            </p>
                        </div>
                        <div className="sf-search-wrap">
                            <span className="sf-search-icon">🔍</span>
                            <input
                                id="smartfeed-search"
                                className="sf-search-input"
                                type="search"
                                placeholder="Search articles, topics..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                aria-label="Search SmartFeed articles"
                            />
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className="sf-error">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="sf-tabs">
                        <button
                            id="tab-feed"
                            className={`sf-tab ${activeTab === 'feed' ? 'active' : ''}`}
                            onClick={() => setActiveTab('feed')}
                        >
                            📰 Feed
                        </button>
                        <button
                            id="tab-bookmarks"
                            className={`sf-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
                            onClick={() => setActiveTab('bookmarks')}
                        >
                            🔖 Bookmarks {bookmarkedArticles.length > 0 && `(${bookmarkedArticles.length})`}
                        </button>
                    </div>

                    {/* Categories */}
                    {activeTab === 'feed' && (
                        <div className="sf-categories">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    id={`cat-${cat.id}`}
                                    className={`sf-cat-btn ${activeCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveCategory(cat.id);
                                        setSearchQuery('');
                                    }}
                                >
                                    {cat.emoji} {cat.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Trending Strip */}
                    {activeTab === 'feed' && !searchQuery && trending.length > 0 && (
                        <div className="sf-trending-strip">
                            <div className="sf-trending-label">
                                🔥 Trending Now
                            </div>
                            <div className="sf-trending-items">
                                {trending.map(item => (
                                    <div
                                        key={item.id}
                                        className="sf-trending-item"
                                        onClick={() => handleSearch(item.title.split(' ').slice(0, 3).join(' '))}
                                    >
                                        📌 {item.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Articles Section */}
                    {activeTab === 'bookmarks' && bookmarkedArticles.length === 0 ? (
                        <FeedEmptyState type="bookmarks" />
                    ) : loading ? (
                        <FeedSkeletonGrid count={6} />
                    ) : displayArticles.length === 0 ? (
                        <FeedEmptyState
                            type="no-results"
                            query={searchQuery}
                            onReset={handleReset}
                        />
                    ) : (
                        <div className="sf-grid">
                            {displayArticles.map(article => (
                                <FeedCard
                                    key={article.id}
                                    article={{ ...article, bookmarked: article.bookmarked || bookmarkedIds.has(article.id) }}
                                    onBookmark={handleBookmarkToggle}
                                    onRead={setSelectedArticle}
                                />
                            ))}
                        </div>
                    )}

                </div>
            </main>

            {/* Read Modal */}
            {selectedArticle && (
                <SmartFeedModal
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                />
            )}
        </div>
    );
}
