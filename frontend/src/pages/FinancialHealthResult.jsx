import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = {
    layout: {
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        fontFamily: "'Noto Sans', 'Segoe UI', sans-serif"
    },
    sidebar: {
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
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
        fontFamily: "'Noto Serif', Georgia, serif",
        cursor: 'pointer'
    },
    sidebarNav: {
        flex: 1,
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    navItem: {
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    main: {
        flex: 1,
        marginLeft: '240px',
        display: 'flex',
        flexDirection: 'column'
    },
    topbar: {
        position: 'fixed',
        top: 0,
        left: '240px',
        right: 0,
        height: '64px',
        backgroundColor: 'var(--white)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 32px',
        zIndex: 90
    },
    topbarRight: {
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
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
    content: {
        marginTop: '64px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px'
    },
    card: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)'
    },
    scoreCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center'
    },
    scoreGauge: {
        position: 'relative',
        width: '160px',
        height: '160px',
        borderRadius: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.05)'
    },
    scoreNumber: {
        fontSize: '44px',
        fontWeight: 'bold',
        fontFamily: "'Noto Serif', Georgia, serif",
        lineHeight: 1
    },
    scoreLabel: {
        fontSize: '12px',
        color: 'var(--text2)',
        marginTop: '4px',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    statusBadge: {
        padding: '6px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'inline-block'
    },
    personaCard: {
        borderTop: '4px solid var(--navy)',
        position: 'relative',
        overflow: 'hidden'
    },
    personaTitle: {
        fontSize: '22px',
        color: 'var(--navy)',
        fontWeight: 'bold',
        fontFamily: "'Noto Serif', Georgia, serif",
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
    },
    personaDetailsGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginTop: '16px',
        fontSize: '13px',
        borderTop: '1px solid var(--border)',
        paddingTop: '12px'
    },
    sectionTitle: {
        fontSize: '18px',
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif",
        marginBottom: '16px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    metricCard: {
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    metricHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    metricName: {
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--text)'
    },
    metricValues: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '8px'
    },
    metricCurrent: {
        fontSize: '22px',
        fontWeight: 'bold',
        color: 'var(--navy)'
    },
    metricRecommended: {
        fontSize: '12px',
        color: 'var(--text2)'
    },
    metricDescription: {
        fontSize: '12px',
        color: 'var(--text3)',
        lineHeight: '1.4'
    },
    recommendationCard: {
        borderLeft: '4px solid var(--navy2)',
        backgroundColor: 'var(--white)',
        borderTop: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        marginBottom: '12px'
    },
    recHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
    },
    recTitle: {
        fontSize: '15px',
        fontWeight: 'bold',
        color: 'var(--navy)'
    },
    recValues: {
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
        margin: '8px 0',
        padding: '8px',
        backgroundColor: 'var(--bg)',
        borderRadius: '4px'
    },
    bulletList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingLeft: 0,
        listStyle: 'none'
    },
    bulletItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '14px',
        color: 'var(--text)',
        lineHeight: '1.5'
    },
    checkIcon: {
        color: 'var(--success)',
        fontWeight: 'bold',
        fontSize: '16px'
    },
    warningCard: {
        backgroundColor: 'var(--error-light)',
        border: '1px solid var(--error)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--error)',
        fontSize: '14px',
        marginBottom: '8px',
        fontWeight: '500'
    },
    summaryDetails: {
        width: '100%',
        backgroundColor: 'var(--info-light)',
        border: '1px solid var(--info)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        cursor: 'pointer'
    },
    summarySummary: {
        fontWeight: 'bold',
        color: 'var(--info)',
        outline: 'none',
        userSelect: 'none'
    },
    summaryText: {
        marginTop: '10px',
        fontSize: '14px',
        lineHeight: '1.6',
        color: 'var(--text)'
    },
    progressBarContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    progressBarItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    progressBarLabelRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '13px',
        fontWeight: '600'
    },
    progressBarTrack: {
        height: '8px',
        backgroundColor: 'var(--bg2)',
        borderRadius: '4px',
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: 'var(--navy2)',
        borderRadius: '4px',
        transition: 'width 1s ease-in-out'
    },
    actionRow: {
        display: 'flex',
        gap: '16px',
        marginTop: '12px'
    },
    btnPrimary: {
        padding: '12px 24px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        flex: 1,
        textAlign: 'center'
    },
    btnOutline: {
        padding: '12px 24px',
        backgroundColor: 'var(--white)',
        color: 'var(--navy)',
        border: '1px solid var(--navy)',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'bold',
        cursor: 'pointer',
        flex: 1,
        textAlign: 'center'
    }
};

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer', active: true },
    { label: 'SmartFeed', soon: true },
    { label: 'Document Intelligence', soon: true },
    { label: 'Loan Risk Assessment', soon: true },
    { label: 'Tax Estimator', soon: true },
    { label: 'Investment Advisor', soon: true },
    { label: 'Settings', soon: true }
];

export default function FinancialHealthResult() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    
    // Get state passed from the Analyzer Form
    const { prediction, inputs } = location.state || {};

    const handleBack = () => {
        navigate('/health-analyzer');
    };

    const handleDashboard = () => {
        navigate('/dashboard');
    };

    if (!prediction) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg)', gap: '16px' }}>
                <h2 style={{ color: 'var(--navy)' }}>No evaluation results found.</h2>
                <button style={{ ...styles.btnPrimary, flex: 'none' }} onClick={handleBack}>Go to Analyzer Form</button>
            </div>
        );
    }

    const { 
        ml_health_score, 
        health_status, 
        model_version, 
        persona, 
        metrics, 
        score_breakdown, 
        strengths, 
        weaknesses, 
        risks, 
        recommendations, 
        ai_summary 
    } = prediction;
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Determine semantic color style properties for score
    let scoreColor = 'var(--text3)';
    let scoreBg = 'var(--bg2)';
    let statusText = health_status || 'Fair';

    if (statusText.toLowerCase() === 'excellent') {
        scoreColor = 'var(--success)';
        scoreBg = 'var(--success-light)';
    } else if (statusText.toLowerCase() === 'good') {
        scoreColor = 'var(--info)';
        scoreBg = 'var(--info-light)';
    } else if (statusText.toLowerCase() === 'fair') {
        scoreColor = 'var(--warning)';
        scoreBg = 'var(--warning-light)';
    } else if (statusText.toLowerCase() === 'poor') {
        scoreColor = 'var(--error)';
        scoreBg = 'var(--error-light)';
    }

    return (
        <div style={styles.layout}>
            {/* SIDEBAR */}
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader} onClick={handleDashboard}>FinStack</div>
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
            <main style={styles.main}>
                {/* TOP NAVBAR */}
                <header style={styles.topbar}>
                    <div style={{ fontWeight: '600', color: 'var(--navy)' }}>
                        Analysis Report
                    </div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                {/* CONTENT */}
                <div style={styles.content}>
                    
                    {/* PERSONA CARD & SCORE ROW */}
                    <div style={styles.grid2}>
                        {/* SCORE CARD */}
                        <div style={{ ...styles.card, ...styles.scoreCard }}>
                            <h3 style={{ fontSize: '16px', color: 'var(--text2)', marginBottom: '16px', fontWeight: 'bold' }}>
                                Financial Health Score
                            </h3>
                            <div style={{ ...styles.scoreGauge, border: `6px solid ${scoreColor}` }}>
                                <span style={{ ...styles.scoreNumber, color: scoreColor }}>
                                    {ml_health_score}
                                </span>
                                <span style={styles.scoreLabel}>out of 100</span>
                            </div>
                            <div style={{ ...styles.statusBadge, backgroundColor: scoreBg, color: scoreColor, marginBottom: '12px' }}>
                                {statusText}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                Engine Version: {model_version}
                            </span>
                        </div>

                        {/* PERSONA CARD */}
                        {persona && (
                            <div style={{ ...styles.card, ...styles.personaCard }}>
                                <div style={styles.personaTitle}>
                                    <span>{persona.emoji}</span>
                                    <span>{persona.title}</span>
                                </div>
                                <p style={{ fontSize: '14px', color: 'var(--text)', lineHeight: '1.5' }}>
                                    {persona.description}
                                </p>
                                <div style={styles.personaDetailsGrid}>
                                    <div><strong>💪 Primary Strength:</strong> {persona.strength}</div>
                                    <div><strong>🎯 Focus Area:</strong> {persona.focus_area}</div>
                                    <div><strong>⚡ Risk Profile:</strong> {persona.risk_level}</div>
                                </div>
                                <div style={styles.actionRow}>
                                    <button style={styles.btnOutline} onClick={handleBack}>Recalculate</button>
                                    <button style={styles.btnPrimary} onClick={handleDashboard}>Dashboard</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SCORE BREAKDOWN & EXPANDABLE AI SUMMARY */}
                    <div style={styles.grid2}>
                        {/* SCORE BREAKDOWN */}
                        {score_breakdown && (
                            <div style={styles.card}>
                                <h3 style={styles.sectionTitle}>🎯 Score Breakdown</h3>
                                <div style={styles.progressBarContainer}>
                                    {Object.entries(score_breakdown).map(([category, value]) => {
                                        // Assume breakdown values are out of 20
                                        const percentage = Math.round((value / 20) * 100);
                                        return (
                                            <div key={category} style={styles.progressBarItem}>
                                                <div style={styles.progressBarLabelRow}>
                                                    <span>{category}</span>
                                                    <span>{value} / 20</span>
                                                </div>
                                                <div style={styles.progressBarTrack}>
                                                    <div 
                                                        style={{ 
                                                            ...styles.progressBarFill, 
                                                            width: `${percentage}%`,
                                                            backgroundColor: percentage >= 75 ? 'var(--success)' : (percentage >= 50 ? 'var(--navy2)' : 'var(--saffron)')
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* EXPANDABLE AI SUMMARY CARD */}
                        {ai_summary && (
                            <div style={styles.card}>
                                <h3 style={styles.sectionTitle}>💬 Executive Summary</h3>
                                <details 
                                    style={styles.summaryDetails}
                                    open={summaryExpanded}
                                    onToggle={(e) => setSummaryExpanded(e.target.open)}
                                >
                                    <summary style={styles.summarySummary}>
                                        {summaryExpanded ? "Click to collapse report summary" : "Click to expand report summary"}
                                    </summary>
                                    <div style={styles.summaryText}>
                                        {ai_summary}
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>

                    {/* SELF-DESCRIBING METRIC CARDS */}
                    {metrics && metrics.length > 0 && (
                        <div>
                            <h3 style={{ ...styles.sectionTitle, margin: '16px 0' }}>📊 Detailed Metrics</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                                {metrics.map((metric, idx) => {
                                    let badgeColor = 'var(--text2)';
                                    let badgeBg = 'var(--bg2)';
                                    if (metric.severity === 'success') {
                                        badgeColor = 'var(--success)';
                                        badgeBg = 'var(--success-light)';
                                    } else if (metric.severity === 'info') {
                                        badgeColor = 'var(--info)';
                                        badgeBg = 'var(--info-light)';
                                    } else if (metric.severity === 'error') {
                                        badgeColor = 'var(--error)';
                                        badgeBg = 'var(--error-light)';
                                    } else if (metric.severity === 'warning') {
                                        badgeColor = 'var(--saffron)';
                                        badgeBg = 'var(--saffron-lt)';
                                    }
                                    return (
                                        <div key={idx} style={styles.metricCard}>
                                            <div style={styles.metricHeader}>
                                                <span style={styles.metricName}>{metric.name}</span>
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '4px', 
                                                    color: badgeColor, 
                                                    backgroundColor: badgeBg,
                                                    fontWeight: 'bold'
                                                }}>
                                                    {metric.status}
                                                </span>
                                            </div>
                                            <div style={styles.metricValues}>
                                                <span style={styles.metricCurrent}>{metric.value}{metric.unit}</span>
                                                <span style={styles.metricRecommended}>Target: {metric.recommended}</span>
                                            </div>
                                            <div style={styles.metricDescription}>{metric.description}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STRENGTHS & WEAKNESSES */}
                    <div style={styles.grid2}>
                        {/* STRENGTHS - RENDER AS GREEN CHECKLIST */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>✔️ Key Strengths</h3>
                            <ul style={styles.bulletList}>
                                {strengths && strengths.length > 0 ? (
                                    strengths.map((str, idx) => (
                                        <li key={idx} style={styles.bulletItem}>
                                            <span style={styles.checkIcon}>✔</span>
                                            <span>{str}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li style={styles.bulletItem}>None identified.</li>
                                )}
                            </ul>
                        </div>

                        {/* WEAKNESSES - RENDER AS WARNING CARDS */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>⚠️ Area of Improvements</h3>
                            <div>
                                {weaknesses && weaknesses.length > 0 ? (
                                    weaknesses.map((weak, idx) => (
                                        <div key={idx} style={styles.warningCard}>
                                            {weak}
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: 'var(--text2)', fontSize: '14px' }}>No major weaknesses identified. Good job!</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RISKS (HIDE IF EMPTY) */}
                    {risks && risks.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={{ ...styles.sectionTitle, color: 'var(--error)' }}>🚨 Critical Risks Identified</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {risks.map((risk, idx) => (
                                    <div key={idx} style={{ 
                                        backgroundColor: 'var(--error-light)', 
                                        color: 'var(--error)', 
                                        padding: '14px', 
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '14px',
                                        borderLeft: '4px solid var(--error)',
                                        fontWeight: '500'
                                    }}>
                                        {risk}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DETAILED ACTION CARD RECOMMENDATIONS */}
                    {recommendations && recommendations.length > 0 && (
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>💡 Personalized Recommendations</h3>
                            <div>
                                {recommendations.map((rec, idx) => {
                                    let priorityColor = 'var(--text2)';
                                    if (rec.priority === 'High') priorityColor = 'var(--error)';
                                    else if (rec.priority === 'Medium') priorityColor = 'var(--saffron)';
                                    else if (rec.priority === 'Low') priorityColor = 'var(--success)';
                                    
                                    return (
                                        <div key={idx} style={styles.recommendationCard}>
                                            <div style={styles.recHeader}>
                                                <span style={styles.recTitle}>{rec.title}</span>
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    fontWeight: 'bold', 
                                                    color: priorityColor,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {rec.priority} Priority
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '13px', color: 'var(--text)', margin: '4px 0' }}>
                                                {rec.reason}
                                            </p>
                                            <div style={styles.recValues}>
                                                <div><strong>Current Allocation:</strong> {rec.current_value}</div>
                                                <div><strong>Recommended Allocation:</strong> {rec.recommended_value}</div>
                                            </div>
                                            <p style={{ fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic', marginTop: '6px' }}>
                                                <strong>Impact:</strong> {rec.impact}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
