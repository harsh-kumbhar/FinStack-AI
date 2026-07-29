import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartfeedService } from '../services/smartfeedService';
import FeedEmptyState from '../components/smartfeed/FeedEmptyState';
import { FeedSkeletonGrid } from '../components/smartfeed/FeedCardSkeleton';
import { useAuth } from '../contexts/AuthContext';
import '../styles/smartfeed.css';

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed', active: true },
    { label: 'Document Intelligence', soon: true },
    { label: 'Loan Risk Assessment', soon: true },
    { label: 'Tax Estimator', soon: true },
    { label: 'Investment Advisor', soon: true },
    { label: 'Settings', soon: true },
];

// Dynamic emojis to attract attention to headlines
const categoryEmojis = {
    markets: '📈',
    schemes: '🏛️',
    tax: '🧾',
    investment: '💼',
    banking: '🏦',
    insurance: '🛡️',
    ai_picks: '🤖',
    general: '📰',
    all: '🔥'
};

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
    },
    card: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
        transition: 'var(--transition)',
        cursor: 'pointer',
        height: '100%'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '12px'
    },
    cardTag: {
        fontSize: '11px',
        fontWeight: 'bold',
        padding: '4px 8px',
        borderRadius: '4px',
        textTransform: 'uppercase'
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'var(--navy)',
        marginBottom: '8px',
        lineHeight: '1.4',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
    },
    cardSummary: {
        fontSize: '14px',
        color: 'var(--text2)',
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 1, // Truncates strictly to 1 line
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        marginBottom: '16px'
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid var(--border)',
        paddingTop: '16px',
        marginTop: 'auto'
    },
    cardMeta: {
        fontSize: '12px',
        color: 'var(--text3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    readBtn: {
        color: 'var(--navy2)',
        fontWeight: '600',
        fontSize: '13px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 35, 80, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '24px'
    },
    modalContent: {
        backgroundColor: 'var(--white)',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    },
    modalHeader: {
        padding: '32px 32px 24px 32px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: 'var(--white)'
    },
    modalTitle: {
        fontSize: '28px',
        fontWeight: 'bold',
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif",
        lineHeight: '1.4',
        marginBottom: '12px'
    },
    modalBody: {
        padding: '32px',
        overflowY: 'auto',
        flex: 1,
        backgroundColor: 'var(--bg)'
    },
    aiSummaryBox: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--info)',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        marginBottom: '24px',
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-start',
        boxShadow: 'var(--shadow-sm)'
    },
    closeBtn: {
        background: 'var(--bg2)',
        border: 'none',
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '20px',
        color: 'var(--text2)',
        cursor: 'pointer',
        lineHeight: 1
    }
};

export default function SmartFeed() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [articles, setArticles] = useState([]);
    const [trending, setTrending] = useState([]);
    const [categories, setCategories] = useState([]);
    const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

    const [selectedArticle, setSelectedArticle] = useState(null);

    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('feed');
    const [error, setError] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

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

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== '') handleSearch(searchQuery);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    async function handleBookmarkToggle(e, articleId, isBookmarking) {
        e.stopPropagation();
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

    function handleReset() {
        setSearchQuery('');
        setActiveCategory('all');
        loadFeed('all');
    }

    const bookmarkedArticles = articles.filter(a => a.bookmarked || bookmarkedIds.has(a.id));
    const displayArticles = activeTab === 'bookmarks' ? bookmarkedArticles : articles;

    const today = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div style={styles.layout}>
            {/* SIDEBAR */}
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

            {/* MAIN AREA */}
            <main className="sf-main">
                <header className="sf-topbar">
                    <div style={{ fontWeight: '600', color: 'var(--navy)', fontSize: '15px' }}>
                        📰 SmartFeed
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ color: 'var(--text2)', fontSize: '13px' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                <div className="sf-content">
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
                            />
                        </div>
                    </div>

                    {error && <div className="sf-error">⚠️ {error}</div>}

                    <div className="sf-tabs">
                        <button
                            className={`sf-tab ${activeTab === 'feed' ? 'active' : ''}`}
                            onClick={() => setActiveTab('feed')}
                        >
                            📰 Feed
                        </button>
                        <button
                            className={`sf-tab ${activeTab === 'bookmarks' ? 'active' : ''}`}
                            onClick={() => setActiveTab('bookmarks')}
                        >
                            🔖 Bookmarks {bookmarkedArticles.length > 0 && `(${bookmarkedArticles.length})`}
                        </button>
                    </div>

                    {activeTab === 'feed' && (
                        <div className="sf-categories">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
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

                    {activeTab === 'feed' && !searchQuery && trending.length > 0 && (
                        <div className="sf-trending-strip">
                            <div className="sf-trending-label">🔥 Trending Now</div>
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

                    {/* ARTICLE GRID */}
                    {activeTab === 'bookmarks' && bookmarkedArticles.length === 0 ? (
                        <FeedEmptyState type="bookmarks" />
                    ) : loading ? (
                        <FeedSkeletonGrid count={6} />
                    ) : displayArticles.length === 0 ? (
                        <FeedEmptyState type="no-results" query={searchQuery} onReset={handleReset} />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                            {displayArticles.map(article => {
                                const isBookmarked = article.bookmarked || bookmarkedIds.has(article.id);
                                const catEmoji = categoryEmojis[article.category] || categoryEmojis.general;

                                return (
                                    <div
                                        key={article.id}
                                        style={styles.card}
                                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                                        onClick={() => setSelectedArticle(article)}
                                    >
                                        <div>
                                            <div style={styles.cardHeader}>
                                                <span style={{ ...styles.cardTag, backgroundColor: `${article.tag_color}15`, color: article.tag_color }}>
                                                    {article.tag}
                                                </span>
                                                <button
                                                    onClick={(e) => handleBookmarkToggle(e, article.id, !isBookmarked)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                                                >
                                                    {isBookmarked ? '🔖' : '📑'}
                                                </button>
                                            </div>
                                            <h3 style={styles.cardTitle}>{catEmoji} {article.title}</h3>
                                            <p style={styles.cardSummary}>{article.summary}</p>
                                        </div>

                                        <div style={styles.cardFooter}>
                                            <div style={styles.cardMeta}>
                                                <span>{article.source}</span>
                                                <span>•</span>
                                                <span>{article.read_time} min read</span>
                                            </div>
                                            <button style={styles.readBtn} onClick={(e) => { e.stopPropagation(); setSelectedArticle(article); }}>
                                                Read More →
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* ENHANCED READ MORE MODAL */}
            {selectedArticle && (
                <div style={styles.modalOverlay} onClick={() => setSelectedArticle(null)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <div style={{ paddingRight: '24px' }}>
                                <span style={{ ...styles.cardTag, backgroundColor: `${selectedArticle.tag_color}15`, color: selectedArticle.tag_color, display: 'inline-block', marginBottom: '16px' }}>
                                    {selectedArticle.tag}
                                </span>
                                <h2 style={styles.modalTitle}>
                                    {categoryEmojis[selectedArticle.category] || categoryEmojis.general} {selectedArticle.title}
                                </h2>
                                <div style={styles.cardMeta}>
                                    <span>{selectedArticle.source}</span>
                                    <span>•</span>
                                    <span>{selectedArticle.published_at ? new Date(selectedArticle.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent'}</span>
                                    <span>•</span>
                                    <span>{selectedArticle.read_time} min read</span>
                                </div>
                            </div>
                            <button style={styles.closeBtn} onClick={() => setSelectedArticle(null)}>✕</button>
                        </div>

                        <div style={styles.modalBody}>
                            {selectedArticle.ai_summary && (
                                <div style={styles.aiSummaryBox}>
                                    <span style={{ fontSize: '28px' }}>🤖</span>
                                    <div>
                                        <h4 style={{ color: 'var(--info)', marginBottom: '8px', fontSize: '15px', fontWeight: 'bold' }}>FinStack AI Insight</h4>
                                        <p style={{ color: 'var(--text)', fontSize: '15px', lineHeight: '1.6' }}>{selectedArticle.ai_summary}</p>
                                    </div>
                                </div>
                            )}

                            {/* Uses the database 'content' column to display full article text */}
                            <div style={{ color: 'var(--text)', fontSize: '16px', lineHeight: '1.8' }}>
                                <p style={{ marginBottom: '24px', fontWeight: '600', fontSize: '18px', color: 'var(--navy)' }}>
                                    {selectedArticle.summary}
                                </p>

                                {selectedArticle.content ? (
                                    <>
                                        <p>
                                            {selectedArticle.content.replace(/\[\+\d+\s+chars\]/g, '')}
                                        </p>
                                        {/* Add this button to link out to the full article */}
                                        {selectedArticle.url && (
                                            <a
                                                href={selectedArticle.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-block',
                                                    marginTop: '16px',
                                                    color: 'var(--navy2)',
                                                    fontWeight: 'bold',
                                                    textDecoration: 'underline'
                                                }}
                                            >
                                                Read Full Article on {selectedArticle.source} ↗
                                            </a>
                                        )}
                                    </>
                                ) : (
                                    <p style={{ fontStyle: 'italic', color: 'var(--text3)' }}>
                                        Full content not available for this article. Please view the source.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}