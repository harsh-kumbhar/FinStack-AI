import React from 'react';

/**
 * FeedCard
 * Single article card for the SmartFeed.
 * Supports: news, scheme, and ai_pick card types.
 *
 * @param {Object}   article   - article data object
 * @param {Function} onBookmark - called with (articleId, isBookmarked)
 */
function FeedCard({ article, onBookmark }) {
    const {
        id,
        type,
        category,
        title,
        summary,
        source,
        published_at,
        read_time,
        ai_summary,
        is_ai_recommended,
        bookmarked,
        tag,
        tag_color
    } = article;

    const cardClass = [
        'sf-card',
        type === 'scheme' ? 'sf-scheme-card' : '',
        type === 'ai_pick' ? 'sf-ai-card' : ''
    ].filter(Boolean).join(' ');

    const timeAgo = getTimeAgo(published_at);

    function handleBookmarkClick(e) {
        e.stopPropagation();
        if (onBookmark) onBookmark(id, !bookmarked);
    }

    return (
        <div className={cardClass} role="article" aria-label={title}>
            {/* Card Top */}
            <div className="sf-card-top">
                <span
                    className="sf-card-tag"
                    style={tag_color ? { backgroundColor: `${tag_color}18`, color: tag_color } : {}}
                >
                    {tag}
                </span>
                <button
                    className="sf-card-bookmark"
                    onClick={handleBookmarkClick}
                    title={bookmarked ? 'Remove bookmark' : 'Bookmark this article'}
                    aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
                >
                    {bookmarked ? '🔖' : '🏷️'}
                </button>
            </div>

            {/* Card Body */}
            <div className="sf-card-body">
                <h3 className="sf-card-title">{title}</h3>
                <p className="sf-card-summary">{summary}</p>

                {/* AI Summary Box — shown when available */}
                {ai_summary && (
                    <div className="sf-ai-box">
                        <div className="sf-ai-box-label">🤖 AI Insight</div>
                        {ai_summary}
                    </div>
                )}

                {/* AI Recommended Badge */}
                {is_ai_recommended && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--navy2)',
                        backgroundColor: 'var(--info-light)',
                        border: '1px solid rgba(0,82,204,0.15)',
                        borderRadius: '4px',
                        padding: '3px 8px',
                        width: 'fit-content'
                    }}>
                        ✨ Recommended for you
                    </div>
                )}
            </div>

            {/* Card Footer */}
            <div className="sf-card-footer">
                <div className="sf-card-meta">
                    <span>{source}</span>
                    <span>·</span>
                    <span>{timeAgo}</span>
                    <span>·</span>
                    <span>{read_time} min read</span>
                </div>
                <button className="sf-read-btn">Read →</button>
            </div>
        </div>
    );
}

/**
 * Utility: Convert ISO date string to human-readable "time ago"
 * @param {string} dateString
 * @returns {string}
 */
function getTimeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const then = new Date(dateString);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
}

export default FeedCard;
