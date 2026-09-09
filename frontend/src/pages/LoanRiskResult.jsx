import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Document Intelligence', soon: true },
    { label: 'Loan Risk Assessment', path: '/loan-analyzer', active: true, badge: 'BETA' },
    { label: 'Tax Estimator', soon: true },
    { label: 'Investment Advisor', soon: true },
    { label: 'Settings', soon: true }
];

export default function LoanRiskResult() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const result = location.state?.result;
    const inputs = location.state?.inputs; // May be undefined in current flow, but keeping safe

    if (!result) {
        return <Navigate to="/loan-analyzer" replace />;
    }

    const { 
        risk_prediction, 
        risk_probability, 
        approval_confidence,
        debt_to_income_ratio,
        monthly_payment_estimate,
        status 
    } = result;

    const isHighRisk = risk_prediction === 1;
    // Fix: the regressor sometimes returns > 1, so cap it to 100 for display if needed. 
    // risk_probability is already 0-1 from backend (backend divides by 100 if > 1).
    const riskScoreValue = (risk_probability * 100).toFixed(1); 
    const approvalPercent = (approval_confidence * 100).toFixed(1);
    const dtiPercent = (debt_to_income_ratio * 100).toFixed(1);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    let scoreColor;
    let scoreBg;
    if (isHighRisk) {
        scoreColor = 'var(--error)';
        scoreBg = 'var(--error-light)';
    } else {
        scoreColor = 'var(--success)';
        scoreBg = 'var(--success-light)';
    }

    // SVG Circle Math for Risk Score
    const radius = 80; // slightly larger for breathing room
    const circumference = 2 * Math.PI * radius;
    // Risk score could be 0-100, assuming lower is better? 
    // Wait, risk score from regressor: high score = high risk.
    const strokeDashoffset = circumference - (Math.min(riskScoreValue, 100) / 100) * circumference;

    // Dynamic AI Insights
    let dynamicInsights = [];
    if (isHighRisk) {
        dynamicInsights.push("Your profile currently flags as high-risk based on our AI models.");
    } else {
        dynamicInsights.push("You are well-positioned for loan approval with favorable terms.");
    }
    
    if (debt_to_income_ratio > 0.43) {
        dynamicInsights.push(`Your Debt-to-Income ratio (${dtiPercent}%) is critically high. Lenders typically prefer under 43%.`);
    } else if (debt_to_income_ratio > 0.36) {
        dynamicInsights.push(`Your Debt-to-Income ratio (${dtiPercent}%) is slightly elevated but manageable.`);
    } else {
        dynamicInsights.push(`Your Debt-to-Income ratio (${dtiPercent}%) is excellent, showing strong capacity to take on new debt.`);
    }

    if (monthly_payment_estimate) {
        dynamicInsights.push(`Ensure your budget can comfortably accommodate the estimated ₹${monthly_payment_estimate.toLocaleString('en-IN', { maximumFractionDigits: 0 })} monthly payment.`);
    }


    return (
        <div style={styles.layout}>
            {/* SIDEBAR */}
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader} onClick={() => navigate('/dashboard')}>FinStack</div>
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
                            {item.badge && <span style={styles.badge}>{item.badge}</span>}
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
                        Assessment Results
                    </div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                {/* CONTENT */}
                <div style={styles.content}>
                    <div style={styles.pageHeader}>
                        <h1 style={styles.pageTitle}>Analysis Complete</h1>
                        <p style={styles.pageSubtitle}>Here is your detailed AI-generated loan risk profile and financial breakdown.</p>
                    </div>

                    <div style={styles.grid2}>
                        {/* 1. RISK SCORE CARD (Regressor) */}
                        <div style={{ ...styles.card, alignItems: 'center', textAlign: 'center', minHeight: '380px' }}>
                            <h3 style={styles.cardTitle}>AI Risk Score</h3>
                            <p style={styles.cardSubtitle}>Analyzed via Random Forest Regressor</p>

                            <div style={styles.scoreRingContainer}>
                                <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r={radius}
                                        stroke="var(--bg2)"
                                        strokeWidth="14"
                                        fill="none"
                                    />
                                    <circle
                                        cx="100"
                                        cy="100"
                                        r={radius}
                                        stroke={scoreColor}
                                        strokeWidth="14"
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)', strokeLinecap: 'round' }}
                                    />
                                </svg>
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <span style={{ ...styles.scoreNumber, color: scoreColor }}>{riskScoreValue}</span>
                                    <span style={styles.scoreMax}>/ 100</span>
                                </div>
                            </div>
                            
                            <div style={{ ...styles.statusBadge, backgroundColor: scoreBg, color: scoreColor, marginTop: '24px' }}>
                                {status}
                            </div>
                        </div>

                        {/* 2. APPROVAL CONFIDENCE & KEY METRICS */}
                        <div style={{...styles.card, display: 'flex', flexDirection: 'column', minHeight: '380px'}}>
                            <h3 style={styles.cardTitle}>Approval Confidence</h3>
                            <p style={styles.cardSubtitle}>Analyzed via Random Forest Classifier</p>
                            
                            <div style={styles.metricBigBox}>
                                <div style={styles.metricValueLarge}>{approvalPercent}%</div>
                                <div style={styles.metricLabelLarge}>Confidence of Approval</div>
                            </div>

                            <div style={{ width: '100%', marginBottom: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text2)', fontWeight: '600', marginBottom: '8px' }}>
                                    <span>0%</span>
                                    <span>Target: &gt; 40%</span>
                                    <span>100%</span>
                                </div>
                                <div style={styles.probBarTrack}>
                                    <div
                                        style={{
                                            ...styles.probBarFill,
                                            width: `${approvalPercent}%`,
                                            backgroundColor: approval_confidence > 0.40 ? 'var(--success)' : 'var(--error)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={styles.actionRow}>
                                <button style={styles.btnPrimary} onClick={() => navigate('/loan-analyzer')}>
                                    Run Another Assessment
                                </button>
                                <button
                                    style={styles.btnOutline}
                                    onClick={() => navigate('/dashboard')}
                                >
                                    Dashboard
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 3. FINANCIAL RATIOS & BREAKDOWN */}
                    <div style={styles.grid2}>
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Financial Ratios</h3>
                            <p style={styles.cardSubtitle}>Derived directly from your raw inputs</p>
                            
                            <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--navy)' }}>Debt-to-Income (DTI)</span>
                                    <span style={{ fontWeight: '800', fontSize: '18px', color: debt_to_income_ratio > 0.43 ? 'var(--error)' : 'var(--navy)' }}>
                                        {dtiPercent}%
                                    </span>
                                </div>
                                <div style={{ height: '10px', backgroundColor: 'var(--bg2)', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        height: '100%', 
                                        width: `${Math.min(dtiPercent, 100)}%`, 
                                        backgroundColor: debt_to_income_ratio > 0.43 ? 'var(--error)' : (debt_to_income_ratio > 0.36 ? 'var(--saffron)' : 'var(--success)') 
                                    }} />
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>
                                    Target DTI: Less than 36% ideal. Over 43% is extremely high risk.
                                </div>
                            </div>
                        </div>

                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Loan Payment Estimator</h3>
                            <p style={styles.cardSubtitle}>Standard amortization based on your inputs</p>
                            
                            <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                <div style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Estimated Monthly Payment
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--navy)', margin: '12px 0', fontFamily: "'Noto Serif', Georgia, serif" }}>
                                    ₹{monthly_payment_estimate ? monthly_payment_estimate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>
                                    Does not include insurance, taxes, or compounding fees.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. AI INSIGHTS */}
                    <div style={{ ...styles.card, padding: '40px' }}>
                        <h3 style={{ fontSize: '22px', color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif", fontWeight: 'bold', margin: '0 0 24px 0' }}>
                            💡 Dynamic AI Insights
                        </h3>
                        <div style={styles.insightList}>
                            {dynamicInsights.map((insight, idx) => (
                                <div key={idx} style={styles.insightItem}>
                                    <div style={styles.insightIcon}>➤</div>
                                    <div style={{ paddingTop: '2px' }}>{insight}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

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
        padding: '24px 20px',
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
        padding: '14px 20px',
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
        padding: '3px 8px',
        borderRadius: '12px',
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
        height: '70px',
        backgroundColor: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
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
        marginTop: '70px',
        padding: '48px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        maxWidth: '1100px',
        margin: '70px auto 0 auto',
        width: '100%'
    },
    pageHeader: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginBottom: '8px'
    },
    pageTitle: {
        fontSize: '32px',
        color: 'var(--navy)',
        fontWeight: '800',
        fontFamily: "'Noto Serif', Georgia, serif",
        margin: 0
    },
    pageSubtitle: {
        color: 'var(--text2)',
        fontSize: '16px',
        margin: 0
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '40px'
    },
    card: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '40px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.3s ease'
    },
    cardTitle: {
        fontSize: '18px',
        color: 'var(--navy)',
        fontWeight: '700',
        margin: '0 0 4px 0'
    },
    cardSubtitle: {
        fontSize: '13px',
        color: 'var(--text3)',
        margin: '0 0 32px 0'
    },
    scoreRingContainer: {
        position: 'relative',
        width: '200px',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto'
    },
    scoreNumber: {
        fontSize: '56px',
        fontWeight: '800',
        fontFamily: "'Noto Serif', Georgia, serif",
        lineHeight: '1.1'
    },
    scoreMax: {
        fontSize: '16px',
        color: 'var(--text3)',
        fontWeight: '600'
    },
    statusBadge: {
        padding: '10px 24px',
        borderRadius: '30px',
        fontSize: '16px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        display: 'inline-block',
        margin: '0 auto'
    },
    metricBigBox: {
        backgroundColor: 'var(--bg)',
        borderRadius: 'var(--radius-md)',
        padding: '32px 24px',
        textAlign: 'center',
        marginBottom: '32px'
    },
    metricValueLarge: {
        fontSize: '48px',
        fontWeight: '800',
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif",
        lineHeight: '1.2'
    },
    metricLabelLarge: {
        fontSize: '14px',
        color: 'var(--text2)',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    probBarTrack: {
        height: '14px',
        backgroundColor: 'var(--bg2)',
        borderRadius: '7px',
        overflow: 'hidden'
    },
    probBarFill: {
        height: '100%',
        borderRadius: '7px',
        transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    actionRow: {
        display: 'flex',
        gap: '20px',
        marginTop: 'auto',
        flexWrap: 'wrap'
    },
    btnPrimary: {
        padding: '14px 24px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontWeight: '700',
        fontSize: '15px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        flex: 2,
        transition: 'var(--transition)'
    },
    btnOutline: {
        padding: '14px 24px',
        backgroundColor: 'var(--white)',
        color: 'var(--navy)',
        border: '2px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        fontWeight: '700',
        fontSize: '15px',
        cursor: 'pointer',
        flex: 1,
        transition: 'var(--transition)'
    },
    insightList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    insightItem: {
        display: 'flex',
        gap: '16px',
        padding: '24px',
        backgroundColor: 'var(--bg)',
        borderRadius: 'var(--radius-md)',
        fontSize: '16px',
        color: 'var(--text)',
        lineHeight: '1.6',
        borderLeft: '4px solid var(--saffron)'
    },
    insightIcon: {
        color: 'var(--saffron)',
        fontWeight: 'bold',
        fontSize: '20px'
    }
};
