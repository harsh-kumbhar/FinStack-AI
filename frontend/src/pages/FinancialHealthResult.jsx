import React, { useState, useEffect } from 'react';
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
        cursor: 'pointer',
        transition: 'var(--transition)'
    },
    content: {
        marginTop: '64px',
        padding: '40px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
        maxWidth: '1400px',
        margin: '64px auto 0 auto',
        width: '100%'
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '32px'
    },
    card: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        display: 'flex',
        flexDirection: 'column'
    },
    scoreCard: {
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative'
    },
    scoreRingContainer: {
        position: 'relative',
        width: '180px',
        height: '180px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px'
    },
    scoreInner: {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    },
    scoreNumber: {
        fontSize: '48px',
        fontWeight: '800',
        fontFamily: "'Noto Serif', Georgia, serif",
        lineHeight: '1.1'
    },
    scoreMax: {
        fontSize: '14px',
        color: 'var(--text3)',
        fontWeight: '600',
        letterSpacing: '1px'
    },
    statusBadge: {
        padding: '8px 20px',
        borderRadius: '30px',
        fontSize: '15px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        display: 'inline-block',
        marginBottom: '16px'
    },
    engineVersion: {
        fontSize: '12px',
        color: 'var(--text3)',
        marginTop: 'auto',
        opacity: 0.7
    },
    personaCard: {
        borderTop: '6px solid var(--navy)',
        justifyContent: 'center'
    },
    personaHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '20px'
    },
    personaEmoji: {
        fontSize: '48px',
        backgroundColor: 'var(--bg)',
        width: '80px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        boxShadow: 'var(--shadow-sm)'
    },
    personaTitle: {
        fontSize: '28px',
        color: 'var(--navy)',
        fontWeight: '800',
        fontFamily: "'Noto Serif', Georgia, serif",
        lineHeight: 1.2
    },
    personaDesc: {
        fontSize: '15px',
        color: 'var(--text2)',
        lineHeight: '1.6',
        marginBottom: '24px'
    },
    personaDetailsGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        backgroundColor: 'var(--bg)',
        padding: '24px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)'
    },
    personaDetailRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px'
    },
    sectionTitle: {
        fontSize: '20px',
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif",
        marginBottom: '24px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
    },
    metricGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px'
    },
    metricCard: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s ease',
        cursor: 'default'
    },
    metricHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
    },
    metricName: {
        fontSize: '15px',
        fontWeight: '700',
        color: 'var(--text)',
        lineHeight: 1.3
    },
    metricValues: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '12px'
    },
    metricCurrent: {
        fontSize: '28px',
        fontWeight: '800',
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif"
    },
    metricRecommended: {
        fontSize: '13px',
        color: 'var(--text2)',
        fontWeight: '500'
    },
    metricDescription: {
        fontSize: '13px',
        color: 'var(--text3)',
        lineHeight: '1.5',
        borderTop: '1px dashed var(--border)',
        paddingTop: '12px'
    },
    recommendationCard: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        marginBottom: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'var(--transition)'
    },
    recHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
    },
    recTitle: {
        fontSize: '16px',
        fontWeight: '700',
        color: 'var(--navy)'
    },
    recReason: {
        fontSize: '14px',
        color: 'var(--text2)',
        lineHeight: '1.6',
        marginBottom: '16px'
    },
    recValuesGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        backgroundColor: 'var(--bg)',
        padding: '16px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '16px'
    },
    recValueBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    recValueLabel: {
        fontSize: '12px',
        textTransform: 'uppercase',
        color: 'var(--text3)',
        fontWeight: '600',
        letterSpacing: '0.5px'
    },
    recValueData: {
        fontSize: '16px',
        fontWeight: '700',
        color: 'var(--text)'
    },
    recImpact: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: 'var(--info)',
        fontWeight: '600',
        backgroundColor: 'var(--info-light)',
        padding: '8px 12px',
        borderRadius: '4px'
    },
    bulletList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingLeft: 0,
        listStyle: 'none'
    },
    bulletItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        fontSize: '15px',
        color: 'var(--text)',
        lineHeight: '1.5',
        backgroundColor: 'var(--success-light)',
        padding: '16px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid rgba(10, 138, 76, 0.2)'
    },
    checkIcon: {
        color: 'var(--success)',
        fontWeight: 'bold',
        fontSize: '18px',
        marginTop: '-2px'
    },
    emptyState: {
        color: 'var(--text3)',
        fontSize: '15px',
        fontStyle: 'italic',
        textAlign: 'center',
        padding: '32px',
        backgroundColor: 'var(--bg)',
        borderRadius: 'var(--radius-sm)'
    },
    warningCard: {
        backgroundColor: 'var(--warning-light)',
        borderLeft: '4px solid var(--warning)',
        padding: '16px 20px',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        color: 'var(--text)',
        fontSize: '15px',
        marginBottom: '12px',
        lineHeight: '1.5',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    riskCard: {
        backgroundColor: 'var(--error-light)',
        borderLeft: '4px solid var(--error)',
        padding: '16px 20px',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
        color: 'var(--error)',
        fontSize: '15px',
        marginBottom: '12px',
        lineHeight: '1.5',
        fontWeight: '500'
    },
    summaryDetails: {
        width: '100%',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        cursor: 'pointer',
        transition: 'var(--transition)'
    },
    summarySummary: {
        fontWeight: '700',
        fontSize: '16px',
        color: 'var(--navy)',
        outline: 'none',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    summaryTextContainer: {
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid var(--border)'
    },
    summaryParagraph: {
        fontSize: '15px',
        lineHeight: '1.8',
        color: 'var(--text)',
        marginBottom: '16px'
    },
    progressBarContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    progressBarItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    progressBarLabelRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--text)'
    },
    progressBarTrack: {
        height: '10px',
        backgroundColor: 'var(--bg2)',
        borderRadius: '5px',
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: '5px',
        transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    actionRow: {
        display: 'flex',
        gap: '16px',
        marginTop: '32px'
    },
    btnPrimary: {
        padding: '14px 28px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'bold',
        fontSize: '15px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        flex: 1,
        textAlign: 'center',
        transition: 'transform 0.1s ease, box-shadow 0.2s ease'
    },
    btnOutline: {
        padding: '14px 28px',
        backgroundColor: 'var(--white)',
        color: 'var(--navy)',
        border: '2px solid var(--navy)',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'bold',
        fontSize: '15px',
        cursor: 'pointer',
        flex: 1,
        textAlign: 'center',
        transition: 'background-color 0.2s ease'
    }
};

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer', active: true },
    { label: 'SmartFeed', path: '/smartfeed' },
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

    const [summaryExpanded, setSummaryExpanded] = useState(true);
    const [animatedScore, setAnimatedScore] = useState(0);
    const [animateBars, setAnimateBars] = useState(false);

    const { prediction, inputs } = location.state || {};

    useEffect(() => {
        if (prediction?.ml_health_score) {
            const timer = setTimeout(() => {
                setAnimatedScore(Number(prediction.ml_health_score));
                setAnimateBars(true);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [prediction]);

    const handleBack = () => navigate('/health-analyzer');
    const handleDashboard = () => navigate('/dashboard');

    if (!prediction) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg)', gap: '24px' }}>
                <h2 style={{ color: 'var(--navy)', fontFamily: "'Noto Serif', serif" }}>No evaluation results found.</h2>
                <button style={{ ...styles.btnPrimary, flex: 'none', width: 'auto' }} onClick={handleBack}>Go to Analyzer Form</button>
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
    const statusLower = statusText.toLowerCase();

    if (statusLower === 'excellent') {
        scoreColor = 'var(--success)';
        scoreBg = 'var(--success-light)';
    } else if (statusLower === 'good') {
        scoreColor = 'var(--info)';
        scoreBg = 'var(--info-light)';
    } else if (statusLower === 'fair' || statusLower === 'average') {
        scoreColor = 'var(--warning)';
        scoreBg = 'var(--warning-light)';
    } else if (statusLower === 'poor') {
        scoreColor = 'var(--error)';
        scoreBg = 'var(--error-light)';
    }

    // Circular Progress Math
    const radius = 76;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

    // Helper for Semantic Breakdown Bars
    const getBarColor = (percent) => {
        if (percent >= 80) return 'var(--success)';
        if (percent >= 60) return 'var(--info)';
        if (percent >= 40) return 'var(--warning)';
        return 'var(--error)';
    };

    // Safely parse metrics object
    const metricsList = metrics ? Object.values(metrics) : [];

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
                    <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '18px' }}>
                        Analysis Report
                    </div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                {/* CONTENT */}
                <div style={styles.content}>

                    {/* PERSONA CARD & SCORE ROW */}
                    <div style={styles.grid2}>
                        {/* SCORE CARD */}
                        <div style={{ ...styles.card, ...styles.scoreCard }}>
                            <h3 style={styles.sectionTitle}>
                                Financial Health Score
                            </h3>

                            <div style={styles.scoreRingContainer}>
                                <svg width="180" height="180" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="90" cy="90" r={radius} stroke="var(--bg2)" strokeWidth="12" fill="none" />
                                    <circle
                                        cx="90"
                                        cy="90"
                                        r={radius}
                                        stroke={scoreColor}
                                        strokeWidth="12"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)', strokeLinecap: 'round' }}
                                    />
                                </svg>
                                <div style={styles.scoreInner}>
                                    <span style={{ ...styles.scoreNumber, color: scoreColor }}>
                                        {Number(ml_health_score).toFixed(1)}
                                    </span>
                                    <span style={styles.scoreMax}>/ 100</span>
                                </div>
                            </div>

                            <div style={{ ...styles.statusBadge, backgroundColor: scoreBg, color: scoreColor }}>
                                {statusText}
                            </div>

                            <span style={styles.engineVersion}>
                                Engine Version: {model_version}
                            </span>
                        </div>

                        {/* PERSONA CARD */}
                        {persona && (
                            <div style={{ ...styles.card, ...styles.personaCard }}>
                                <div style={styles.personaHeader}>
                                    <div style={styles.personaEmoji}>{persona.emoji || '👤'}</div>
                                    <div style={styles.personaTitle}>{persona.title}</div>
                                </div>
                                <p style={styles.personaDesc}>
                                    {persona.description}
                                </p>
                                <div style={styles.personaDetailsGrid}>
                                    <div style={styles.personaDetailRow}>
                                        <span style={{ color: 'var(--text2)' }}>Primary Strength</span>
                                        <strong style={{ color: 'var(--success)' }}>{persona.strength}</strong>
                                    </div>
                                    <div style={styles.personaDetailRow}>
                                        <span style={{ color: 'var(--text2)' }}>Focus Area</span>
                                        <strong style={{ color: 'var(--navy)' }}>{persona.focus_area}</strong>
                                    </div>
                                    <div style={styles.personaDetailRow}>
                                        <span style={{ color: 'var(--text2)' }}>Risk Profile</span>
                                        <strong style={{ color: 'var(--warning)' }}>{persona.risk_level}</strong>
                                    </div>
                                </div>
                                <div style={styles.actionRow}>
                                    <button
                                        style={styles.btnOutline}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg2)'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--white)'}
                                        onClick={handleBack}
                                    >
                                        Recalculate
                                    </button>
                                    <button
                                        style={styles.btnPrimary}
                                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                                        onClick={handleDashboard}
                                    >
                                        Dashboard
                                    </button>
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
                                        const percentage = Math.min(100, Math.round((value / 20) * 100)); // Assuming max 20 per category
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
                                                            width: animateBars ? `${percentage}%` : '0%',
                                                            backgroundColor: getBarColor(percentage)
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
                                        <span>{summaryExpanded ? "Hide AI Report" : "Read AI Financial Report"}</span>
                                        <span style={{ color: 'var(--saffron)', fontSize: '20px' }}>
                                            {summaryExpanded ? '−' : '+'}
                                        </span>
                                    </summary>
                                    <div style={styles.summaryTextContainer}>
                                        {ai_summary.split('\n').map((paragraph, i) => {
                                            // Remove all asterisk characters (*) used for markdown bolding/italics
                                            const cleanParagraph = paragraph.replace(/\*/g, '').trim();

                                            return cleanParagraph ? (
                                                <p key={i} style={styles.summaryParagraph}>{cleanParagraph}</p>
                                            ) : null;
                                        })}
                                    </div>
                                </details>
                            </div>
                        )}
                    </div>

                    {/* SELF-DESCRIBING METRIC CARDS */}
                    {metricsList.length > 0 && (
                        <div>
                            <h3 style={styles.sectionTitle}>📊 Detailed Metrics</h3>
                            <div style={styles.metricGrid}>
                                {metricsList.map((metric, idx) => {
                                    let badgeColor = 'var(--text2)';
                                    let badgeBg = 'var(--bg2)';
                                    const severity = metric.severity?.toLowerCase();

                                    if (severity === 'success' || severity === 'excellent' || severity === 'good') {
                                        badgeColor = 'var(--success)';
                                        badgeBg = 'var(--success-light)';
                                    } else if (severity === 'info') {
                                        badgeColor = 'var(--info)';
                                        badgeBg = 'var(--info-light)';
                                    } else if (severity === 'error' || severity === 'poor') {
                                        badgeColor = 'var(--error)';
                                        badgeBg = 'var(--error-light)';
                                    } else if (severity === 'warning' || severity === 'average' || severity === 'fair') {
                                        badgeColor = 'var(--warning)';
                                        badgeBg = 'var(--warning-light)';
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            style={styles.metricCard}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <div style={styles.metricHeader}>
                                                <span style={styles.metricName}>{metric.name}</span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    color: badgeColor,
                                                    backgroundColor: badgeBg,
                                                    fontWeight: '700',
                                                    letterSpacing: '0.5px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {metric.status}
                                                </span>
                                            </div>
                                            <div style={styles.metricValues}>
                                                <span style={styles.metricCurrent}>{metric.value} {metric.unit}</span>
                                                <span style={styles.metricRecommended}>Target: {metric.recommended} {metric.unit}</span>
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
                        {/* STRENGTHS */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>✔️ Key Strengths</h3>
                            <ul style={styles.bulletList}>
                                {strengths && strengths.length > 0 ? (
                                    strengths.map((str, idx) => (
                                        <li key={idx} style={styles.bulletItem}>
                                            <span style={styles.checkIcon}>✓</span>
                                            <span>{str}</span>
                                        </li>
                                    ))
                                ) : (
                                    <div style={styles.emptyState}>No specific strengths identified in current profile.</div>
                                )}
                            </ul>
                        </div>

                        {/* WEAKNESSES */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>⚠️ Areas for Improvement</h3>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {weaknesses && weaknesses.length > 0 ? (
                                    weaknesses.map((weak, idx) => (
                                        <div key={idx} style={styles.warningCard}>
                                            {weak}
                                        </div>
                                    ))
                                ) : (
                                    <div style={styles.emptyState}>No major weaknesses identified. Great job!</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RISKS (HIDE IF EMPTY) */}
                    {risks && risks.length > 0 && (
                        <div style={{ ...styles.card, border: '1px solid var(--error-light)' }}>
                            <h3 style={{ ...styles.sectionTitle, color: 'var(--error)' }}>🚨 Critical Risks Identified</h3>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {risks.map((risk, idx) => (
                                    <div key={idx} style={styles.riskCard}>
                                        {risk}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DETAILED RECOMMENDATIONS */}
                    {recommendations && recommendations.length > 0 && (
                        <div style={{ ...styles.card, padding: '40px' }}>
                            <h3 style={styles.sectionTitle}>💡 Personalized Action Plan</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '24px' }}>
                                {recommendations.map((rec, idx) => {
                                    const priority = rec.priority?.toLowerCase();
                                    let pColor = 'var(--text2)';
                                    let pBg = 'var(--bg2)';

                                    if (priority === 'high') {
                                        pColor = 'var(--error)';
                                        pBg = 'var(--error-light)';
                                    } else if (priority === 'medium') {
                                        pColor = 'var(--warning)';
                                        pBg = 'var(--warning-light)';
                                    } else if (priority === 'low') {
                                        pColor = 'var(--success)';
                                        pBg = 'var(--success-light)';
                                    }

                                    return (
                                        <div key={idx} style={styles.recommendationCard}>
                                            <div style={styles.recHeader}>
                                                <span style={styles.recTitle}>{rec.title}</span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    color: pColor,
                                                    backgroundColor: pBg,
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px'
                                                }}>
                                                    {rec.priority} Priority
                                                </span>
                                            </div>
                                            <p style={styles.recReason}>
                                                {rec.reason}
                                            </p>
                                            <div style={styles.recValuesGrid}>
                                                <div style={styles.recValueBlock}>
                                                    <span style={styles.recValueLabel}>Current</span>
                                                    <span style={styles.recValueData}>{rec.current_value}</span>
                                                </div>
                                                <div style={styles.recValueBlock}>
                                                    <span style={styles.recValueLabel}>Recommended</span>
                                                    <span style={{ ...styles.recValueData, color: 'var(--navy)' }}>{rec.recommended_value}</span>
                                                </div>
                                            </div>
                                            <div style={styles.recImpact}>
                                                <span>⚡</span>
                                                <span>Impact: {rec.impact}</span>
                                            </div>
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