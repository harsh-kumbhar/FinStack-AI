import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
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
        padding: '40px 24px',
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
        fontSize: '48px',
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
    bulletList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingLeft: 0,
        listStyle: 'none'
    },
    bulletItem: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        fontSize: '14px',
        color: 'var(--text)',
        lineHeight: '1.5'
    },
    iconWrap: {
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '11px',
        color: 'var(--white)',
        flexShrink: 0,
        marginTop: '2px'
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
    },
    aiSummaryBox: {
        backgroundColor: 'var(--info-light)',
        border: '1px solid var(--info)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        color: 'var(--text)',
        fontSize: '15px',
        lineHeight: '1.6',
        marginBottom: '24px'
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

    const { ml_health_score, health_status, model_version, strengths, weaknesses, risks, recommendations, ai_summary } = prediction;
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
                        Analysis Results
                    </div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                {/* CONTENT */}
                <div style={styles.content}>
                    <div style={styles.grid2}>
                        {/* SCORE METRIC CARD */}
                        <div style={{ ...styles.card, ...styles.scoreCard }}>
                            <h3 style={{ fontSize: '16px', color: 'var(--text2)', marginBottom: '24px', fontWeight: 'bold' }}>
                                Financial Health Score
                            </h3>
                            <div style={{ ...styles.scoreGauge, border: `6px solid ${scoreColor}` }}>
                                <span style={{ ...styles.scoreNumber, color: scoreColor }}>
                                    {Math.round(ml_health_score)}
                                </span>
                                <span style={styles.scoreLabel}>out of 100</span>
                            </div>
                            <div style={{ ...styles.statusBadge, backgroundColor: scoreBg, color: scoreColor, marginBottom: '20px' }}>
                                {statusText}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                Evaluated using Engine version: {model_version}
                            </span>
                        </div>

                        {/* SUMMARY CARD */}
                        <div style={styles.card}>
                            <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>AI Financial Diagnosis</h3>
                            {ai_summary && (
                                <div style={styles.aiSummaryBox}>
                                    <strong>Summary:</strong> <ReactMarkdown>
                                        {ai_summary}
                                    </ReactMarkdown>
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text2)' }}>
                                <p><strong>Age Category:</strong> {inputs?.age || 'N/A'} years ({inputs?.employment_status})</p>
                                <p><strong>Financial Target:</strong> {inputs?.financial_goal ? inputs.financial_goal.replace(/_/g, ' ').toUpperCase() : 'N/A'}</p>
                                <p><strong>Monthly Allocation:</strong> Earns ₹{Number(inputs?.monthly_income).toLocaleString('en-IN')}, Saves ₹{Number(inputs?.monthly_savings).toLocaleString('en-IN')}</p>
                            </div>
                            
                            <div style={styles.actionRow}>
                                <button style={styles.btnOutline} onClick={handleBack}>Recalculate Form</button>
                                <button style={styles.btnPrimary} onClick={handleDashboard}>Go to Dashboard</button>
                            </div>
                        </div>
                    </div>

                    <div style={styles.grid2}>
                        {/* STRENGTHS */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>
                                <span style={{ ...styles.iconWrap, backgroundColor: 'var(--success)' }}>✓</span>
                                Key Strengths
                            </h3>
                            <ul style={styles.bulletList}>
                                {strengths && strengths.length > 0 ? (
                                    strengths.map((str, idx) => (
                                        <li key={idx} style={styles.bulletItem}>
                                            <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>•</span>
                                            <span>{str}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li style={styles.bulletItem}>No significant strengths identified yet. Keep saving!</li>
                                )}
                            </ul>
                        </div>

                        {/* WEAKNESSES */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>
                                <span style={{ ...styles.iconWrap, backgroundColor: 'var(--error)' }}>!</span>
                                Weaknesses
                            </h3>
                            <ul style={styles.bulletList}>
                                {weaknesses && weaknesses.length > 0 ? (
                                    weaknesses.map((weak, idx) => (
                                        <li key={idx} style={styles.bulletItem}>
                                            <span style={{ color: 'var(--error)', fontWeight: 'bold' }}>•</span>
                                            <span>{weak}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li style={styles.bulletItem}>No major structural weaknesses found. Good allocation discipline!</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    <div style={styles.grid2}>
                        {/* RISKS */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>
                                <span style={{ ...styles.iconWrap, backgroundColor: 'var(--warning)' }}>⚠</span>
                                Financial Risks
                            </h3>
                            <ul style={styles.bulletList}>
                                {risks && risks.length > 0 ? (
                                    risks.map((risk, idx) => (
                                        <li key={idx} style={styles.bulletItem}>
                                            <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>•</span>
                                            <span>{risk}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li style={styles.bulletItem}>Standard risk level. No critical warnings triggered.</li>
                                )}
                            </ul>
                        </div>

                        {/* RECOMMENDATIONS */}
                        <div style={styles.card}>
                            <h3 style={styles.sectionTitle}>
                                <span style={{ ...styles.iconWrap, backgroundColor: 'var(--info)' }}>i</span>
                                Recommendations & Next Steps
                            </h3>
                            <ul style={styles.bulletList}>
                                {recommendations && recommendations.length > 0 ? (
                                    recommendations.map((rec, idx) => (
                                        <li key={idx} style={styles.bulletItem}>
                                            <span style={{ color: 'var(--info)', fontWeight: 'bold' }}>•</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li style={styles.bulletItem}>Continue with your current financial plan and check back quarterly.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
