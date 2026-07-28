import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartfeedService } from '../../services/smartfeedService';

/**
 * SmartFeedWidget
 * Dashboard integration widget for the SmartFeed module.
 * Displays the latest 4 articles inline on the Dashboard.
 * Follows the Dashboard card pattern exactly.
 */
function SmartFeedWidget() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await smartfeedService.getFeed({ limit: 4 });
                setArticles((data.articles || []).slice(0, 4));
            } catch {
                setArticles([]);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const widgetStyle = {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
    };

    const headerStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg)'
    };

    const itemStyle = {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.2s'
    };

    const skeletonStyle = {
        background: 'linear-gradient(90deg, var(--bg2) 25%, var(--border) 50%, var(--bg2) 75%)',
        backgroundSize: '200% 100%',
        borderRadius: '4px',
        animation: 'sf-shimmer 1.4s infinite'
    };

    if (loading) {
        return (
            <div style={widgetStyle}>
                <div style={headerStyle}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)' }}>
                        📰 SmartFeed
                    </span>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ ...skeletonStyle, height: '14px', width: '80%' }} />
                            <div style={{ ...skeletonStyle, height: '12px', width: '50%' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={widgetStyle}>
            <div style={headerStyle}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📰 SmartFeed — Latest News
                </span>
                <button
                    id="widget-smartfeed-view-all"
                    style={{
                        fontSize: '12px',
                        color: 'var(--navy2)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        fontFamily: 'Noto Sans, sans-serif'
                    }}
                    onClick={() => navigate('/smartfeed')}
                >
                    View All →
                </button>
            </div>

            {articles.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: '13px' }}>
                    No articles available right now.
                </div>
            ) : (
                articles.map(article => (
                    <div
                        key={article.id}
                        style={itemStyle}
                        onClick={() => navigate('/smartfeed')}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>
                            {getCategoryEmoji(article.category)}
                        </span>
                        <div>
                            <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: 'var(--text)',
                                lineHeight: '1.4',
                                marginBottom: '4px'
                            }}>
                                {article.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text3)', display: 'flex', gap: '8px' }}>
                                <span>{article.source}</span>
                                <span>·</span>
                                <span>{article.read_time} min read</span>
                                {article.is_ai_recommended && (
                                    <>
                                        <span>·</span>
                                        <span style={{ color: 'var(--navy2)', fontWeight: '700' }}>AI Pick</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

function getCategoryEmoji(category) {
    const map = {
        markets: '📈', schemes: '🏛️', tax: '🧾',
        investment: '💼', banking: '🏦', insurance: '🛡️',
        ai_picks: '🤖', default: '📰'
    };
    return map[category] || map.default;
}

export default SmartFeedWidget;
