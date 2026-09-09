import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { smartfeedService } from '../../services/smartfeedService';

export default function SmartFeedWidget() {
    const navigate = useNavigate();
    const [articles, setArticles] = useState([]);
    const [featured, setFeatured] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                // Fetch a small batch for the dashboard
                const data = await smartfeedService.getFeed({ limit: 3 });
                setFeatured(data.featured_article || null);
                setArticles((data.articles || []).slice(0, 2)); // Show 2 standard articles max
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
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column'
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
        flexDirection: 'column',
        gap: '4px',
        padding: '16px 20px',
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
                        SmartFeed
                    </span>
                </div>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2].map(i => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ ...skeletonStyle, height: '16px', width: '80%' }} />
                            <div style={{ ...skeletonStyle, height: '12px', width: '50%' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div style={widgetStyle}>
            {/* Widget Header */}
            <div style={headerStyle}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    SmartFeed
                </span>
                <button
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
                    View All &rarr;
                </button>
            </div>

            {/* Empty State */}
            {!featured && articles.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text2)', fontSize: '13px' }}>
                    No financial updates available right now.
                </div>
            )}

            {/* Financial Brief (Featured Article) */}
            {featured && (
                <div 
                    style={{ ...itemStyle, backgroundColor: 'var(--bg)', borderLeft: '4px solid var(--saffron)' }}
                    onClick={() => navigate('/smartfeed')}
                >
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--saffron)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Your Financial Brief
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--navy)', lineHeight: '1.4', marginBottom: '6px' }}>
                        {featured.title}
                    </div>
                    
                    {featured.why_it_matters && (
                        <div style={{ backgroundColor: 'var(--info-light)', padding: '10px 12px', borderRadius: '4px', borderLeft: '3px solid var(--info)', marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--info)', marginBottom: '4px', textTransform: 'uppercase' }}>
                                Why this matters
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.4' }}>
                                {featured.why_it_matters}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Standard Articles List */}
            {articles.map(article => (
                <div
                    key={article.id}
                    style={itemStyle}
                    onClick={() => navigate('/smartfeed')}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', lineHeight: '1.4', marginBottom: '6px' }}>
                        {article.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)', display: 'flex', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: article.tag_color }}>{article.tag}</span>
                        <span>&bull;</span>
                        <span>{article.source}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}