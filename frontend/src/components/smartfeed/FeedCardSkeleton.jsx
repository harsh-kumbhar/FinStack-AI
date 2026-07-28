import React from 'react';

/**
 * FeedCardSkeleton
 * Loading skeleton for article cards.
 * Uses the sf-skeleton animation from smartfeed.css
 */
function FeedCardSkeleton() {
    return (
        <div className="sf-skeleton-card">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="sf-skeleton" style={{ width: '80px', height: '20px' }} />
                <div className="sf-skeleton" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
            </div>
            <div className="sf-skeleton" style={{ width: '100%', height: '20px' }} />
            <div className="sf-skeleton" style={{ width: '85%', height: '20px' }} />
            <div className="sf-skeleton" style={{ width: '100%', height: '60px' }} />
            <div className="sf-skeleton" style={{ width: '100%', height: '52px', borderRadius: '6px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <div className="sf-skeleton" style={{ width: '100px', height: '14px' }} />
                <div className="sf-skeleton" style={{ width: '60px', height: '24px' }} />
            </div>
        </div>
    );
}

/**
 * FeedSkeletonGrid
 * Renders a grid of FeedCardSkeleton components during loading.
 * @param {number} count - number of skeletons to render
 */
export function FeedSkeletonGrid({ count = 6 }) {
    return (
        <div className="sf-grid">
            {Array.from({ length: count }).map((_, i) => (
                <FeedCardSkeleton key={i} />
            ))}
        </div>
    );
}

export default FeedCardSkeleton;
