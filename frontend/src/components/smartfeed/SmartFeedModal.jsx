import React from 'react';
import "../../styles/smartfeed.css";

/**
 * SmartFeedModal
 * Responsive modal/popup component for viewing full article details.
 */
export default function SmartFeedModal({ article, onClose }) {
    if (!article) return null;

    const {
        title,
        summary,
        content,
        source,
        published_at,
        read_time,
        category,
        image_url,
        url
    } = article;

    const timeAgo = new Date(published_at).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
        <div className="sf-modal-overlay" onClick={onClose}>
            <div className="sf-modal" onClick={e => e.stopPropagation()}>
                <div className="sf-modal-header">
                    <h2 className="sf-modal-title">{title}</h2>
                    <button className="sf-modal-close" onClick={onClose} aria-label="Close modal">&times;</button>
                </div>
                <div className="sf-modal-body">
                    <div className="sf-modal-meta">
                        <span>{source}</span>
                        <span>·</span>
                        <span>{timeAgo}</span>
                        <span>·</span>
                        <span>{read_time} min read</span>
                        {category && (
                            <>
                                <span>·</span>
                                <span style={{ textTransform: 'capitalize' }}>{category.replace('_', ' ')}</span>
                            </>
                        )}
                    </div>

                    {(image_url || true) && (
                        <img 
                            className="sf-modal-img" 
                            src={image_url || `https://source.unsplash.com/random/600x300/?finance,${category || 'business'}`} 
                            alt={title} 
                            onError={(e) => e.target.style.display = 'none'}
                        />
                    )}

                    <div style={{ marginBottom: '16px', fontWeight: '600' }}>
                        {summary}
                    </div>

                    <div>
                        {content || "Full article content is not available in the preview. Click 'Read Original' to view the full story."}
                    </div>
                </div>
                <div className="sf-modal-footer">
                    {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="sf-modal-link">
                            Read Original ↗
                        </a>
                    ) : (
                        <button className="sf-modal-link" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </div>
    );
}
