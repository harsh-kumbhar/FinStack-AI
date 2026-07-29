import React from 'react';

/**
 * FeedEmptyState
 * Shown when no articles match the current filter or search.
 *
 * @param {string} type - 'no-results' | 'bookmarks' | 'error'
 * @param {string} query - search query (if any)
 * @param {Function} onReset - callback to reset filters
 */
function FeedEmptyState({ type = 'no-results', query = '', onReset }) {
    const configs = {
        'no-results': {
            icon: '🔍',
            title: query ? `No results for "${query}"` : 'No articles found',
            sub: 'Try a different category or clear your search to see all articles.',
        },
        'bookmarks': {
            icon: '🔖',
            title: 'No bookmarks yet',
            sub: 'Tap the bookmark icon on any article to save it here for later reading.',
        },
        'error': {
            icon: '⚠️',
            title: 'Failed to load feed',
            sub: 'There was a problem connecting to the server. Mock data is being used as fallback.',
        },
    };

    const { icon, title, sub } = configs[type] || configs['no-results'];

    return (
        <div className="sf-empty">
            <div className="sf-empty-icon">{icon}</div>
            <div className="sf-empty-title">{title}</div>
            <p className="sf-empty-sub">{sub}</p>
            {onReset && (
                <button
                    onClick={onReset}
                    style={{
                        marginTop: '12px',
                        padding: '8px 20px',
                        backgroundColor: 'var(--navy)',
                        color: 'var(--white)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontFamily: 'Noto Sans, sans-serif'
                    }}
                >
                    Reset Filters
                </button>
            )}
        </div>
    );
}

export default FeedEmptyState;
