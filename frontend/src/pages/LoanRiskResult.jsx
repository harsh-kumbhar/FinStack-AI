import React from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Document Vault', path: '/document-vault' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Financial Journey', path: '/financial-journey' },
    { label: 'Loan Risk Assessment', active: true, path: '/loan-analyzer' },
    { label: 'Tax Estimator', path: '/tax-estimator' }
];

export default function LoanRiskResult() {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const result = location.state?.result;
    const inputs = location.state?.inputs;
    const offer = location.state?.selectedOffer;

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
    const riskScoreValue = (risk_probability * 100).toFixed(1);
    const approvalPercent = (approval_confidence * 100).toFixed(1);
    const dtiPercent = (debt_to_income_ratio * 100).toFixed(1);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let scoreColor = isHighRisk ? 'var(--error)' : 'var(--success)';
    let scoreBg = isHighRisk ? 'var(--error-light)' : 'var(--success-light)';

    // Bank Branding
    const brandColor = offer ? offer.logo_color : 'var(--navy)';
    const bankName = offer ? offer.bank_name : 'Generic Bank';
    const loanType = offer ? offer.loan_type : 'Loan';

    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (Math.min(riskScoreValue, 100) / 100) * circumference;

    // Dynamic Explainable AI (XAI) Insights tailored to the bank offer
    let dynamicInsights = [];

    // 1. Overall ML Prediction
    if (isHighRisk) {
        dynamicInsights.push(`Our Random Forest models flag this application for ${bankName} as high-risk based on historical default patterns.`);
    } else {
        dynamicInsights.push(`You are well-positioned for approval under the ${bankName} ${loanType} criteria.`);
    }

    // 2. Offer-Specific Credit Score Check
    if (offer && inputs) {
        if (inputs.CreditScore < offer.min_credit_score) {
            dynamicInsights.push(`Warning: Your credit score (${inputs.CreditScore}) is below the strict minimum (${offer.min_credit_score}) required for the ${offer.description}. This severely impacts your approval odds.`);
        } else {
            dynamicInsights.push(`Excellent: Your credit score (${inputs.CreditScore}) meets the underwriting threshold (${offer.min_credit_score}) for this specific ${bankName} product.`);
        }
    }

    // 3. Debt to Income Analysis
    if (debt_to_income_ratio > 0.43) {
        dynamicInsights.push(`Your Debt-to-Income ratio (${dtiPercent}%) is critically high. Lenders typically reject applications exceeding 43% DTI.`);
    } else if (debt_to_income_ratio > 0.36) {
        dynamicInsights.push(`Your Debt-to-Income ratio (${dtiPercent}%) is elevated but manageable within standard risk tolerances.`);
    } else {
        dynamicInsights.push(`Your Debt-to-Income ratio (${dtiPercent}%) is extremely healthy, showing strong capacity to take on this new ${bankName} debt.`);
    }

    // 4. Payment Warning
    if (monthly_payment_estimate) {
        dynamicInsights.push(`Ensure your budget can comfortably accommodate the estimated ₹${monthly_payment_estimate.toLocaleString('en-IN', { maximumFractionDigits: 0 })} monthly payment locked in at ${offer ? offer.interest_rate : inputs?.BaseInterestRate}%.`);
    }

    return (
        <div style={styles.layout}>
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader} onClick={() => navigate('/dashboard')}>FinStack</div>
                <nav style={styles.sidebarNav}>
                    {SIDEBAR_ITEMS.map((item, idx) => (
                        <div key={idx} style={{ ...styles.navItem, ...(item.active ? styles.navItemActive : {}) }} onClick={() => item.path && navigate(item.path)}>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </nav>
            </aside>

            <main style={styles.main}>
                <header style={styles.topbar}>
                    <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '18px' }}>Assessment Results</div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                <div style={styles.content}>
                    {offer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', backgroundColor: 'white', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '8px', backgroundColor: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px' }}>
                                {bankName.charAt(0)}
                            </div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '22px', color: 'var(--navy)' }}>{bankName}</h1>
                                <p style={{ margin: 0, color: 'var(--text2)', fontSize: '14px' }}>{offer.description} · Locked @ {offer.interest_rate}% p.a.</p>
                            </div>
                        </div>
                    )}

                    <div style={styles.grid2}>
                        {/* 1. RISK SCORE CARD */}
                        <div style={{ ...styles.card, alignItems: 'center', textAlign: 'center', minHeight: '380px' }}>
                            <h3 style={styles.cardTitle}>AI Risk Score</h3>
                            <p style={styles.cardSubtitle}>Analyzed via Random Forest Regressor</p>

                            <div style={styles.scoreRingContainer}>
                                <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="100" cy="100" r={radius} stroke="var(--bg2)" strokeWidth="14" fill="none" />
                                    <circle cx="100" cy="100" r={radius} stroke={scoreColor} strokeWidth="14" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} style={{ transition: 'stroke-dashoffset 1.5s ease', strokeLinecap: 'round' }} />
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

                        {/* 2. APPROVAL CONFIDENCE */}
                        <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', minHeight: '380px' }}>
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
                                    <div style={{ ...styles.probBarFill, width: `${approvalPercent}%`, backgroundColor: approval_confidence > 0.40 ? 'var(--success)' : 'var(--error)' }} />
                                </div>
                            </div>

                            <div style={styles.actionRow}>
                                <button style={{ ...styles.btnPrimary, backgroundColor: brandColor }} onClick={() => navigate('/loan-analyzer')}>Change Market Offer</button>
                                <button style={styles.btnOutline} onClick={() => navigate('/dashboard')}>Dashboard</button>
                            </div>
                        </div>
                    </div>

                    <div style={styles.grid2}>
                        {/* 3. FINANCIAL RATIOS */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Financial Ratios</h3>
                            <p style={styles.cardSubtitle}>Derived directly from your raw inputs</p>

                            <div style={{ marginTop: '24px', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: '600', color: 'var(--navy)' }}>Debt-to-Income (DTI)</span>
                                    <span style={{ fontWeight: '800', fontSize: '18px', color: debt_to_income_ratio > 0.43 ? 'var(--error)' : 'var(--navy)' }}>{dtiPercent}%</span>
                                </div>
                                <div style={{ height: '10px', backgroundColor: 'var(--bg2)', borderRadius: '5px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(dtiPercent, 100)}%`, backgroundColor: debt_to_income_ratio > 0.43 ? 'var(--error)' : (debt_to_income_ratio > 0.36 ? 'var(--saffron)' : 'var(--success)') }} />
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>Target DTI: Less than 36% ideal. Over 43% is extremely high risk.</div>
                            </div>
                        </div>

                        {/* 4. PAYMENT ESTIMATOR */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Loan Payment Estimator</h3>
                            <p style={styles.cardSubtitle}>Standard amortization based on your inputs</p>

                            <div style={{ marginTop: '24px', padding: '24px', backgroundColor: 'var(--bg)', borderRadius: '12px', textAlign: 'center', border: `1px solid ${brandColor}33` }}>
                                <div style={{ fontSize: '14px', color: 'var(--text2)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estimated Monthly Payment</div>
                                <div style={{ fontSize: '36px', fontWeight: '800', color: brandColor, margin: '12px 0', fontFamily: "'Noto Serif', Georgia, serif" }}>
                                    ₹{monthly_payment_estimate ? monthly_payment_estimate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text3)' }}>Does not include insurance, taxes, or processing fees.</div>
                            </div>
                        </div>
                    </div>

                    {/* 5. AI INSIGHTS */}
                    <div style={{ ...styles.card, padding: '40px' }}>
                        <h3 style={{ fontSize: '22px', color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif", fontWeight: 'bold', margin: '0 0 24px 0' }}>
                            💡 Explainable AI (XAI) Insights
                        </h3>
                        <div style={styles.insightList}>
                            {dynamicInsights.map((insight, idx) => (
                                <div key={idx} style={{ ...styles.insightItem, borderLeft: `4px solid ${brandColor}` }}>
                                    <div style={{ ...styles.insightIcon, color: brandColor }}>➤</div>
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
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: "'Noto Sans', 'Segoe UI', sans-serif" },
    sidebar: { position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', backgroundColor: 'var(--navy)', color: 'var(--white)', display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: 'var(--shadow)' },
    sidebarHeader: { padding: '24px 20px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Noto Serif', Georgia, serif", cursor: 'pointer' },
    sidebarNav: { flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '4px' },
    navItem: { padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '14px' },
    navItemActive: { backgroundColor: 'var(--navy2)', color: 'var(--white)', borderLeft: '4px solid var(--saffron)' },
    main: { flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' },
    topbar: { position: 'fixed', top: 0, left: '240px', right: 0, height: '70px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', zIndex: 90 },
    topbarRight: { display: 'flex', alignItems: 'center', gap: '24px' },
    logoutBtn: { padding: '8px 16px', backgroundColor: 'var(--error-light)', color: 'var(--error)', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' },
    content: { marginTop: '70px', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: '40px', maxWidth: '1100px', margin: '70px auto 0 auto', width: '100%' },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '40px' },
    card: { backgroundColor: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' },
    cardTitle: { fontSize: '18px', color: 'var(--navy)', fontWeight: '700', margin: '0 0 4px 0' },
    cardSubtitle: { fontSize: '13px', color: 'var(--text3)', margin: '0 0 32px 0' },
    scoreRingContainer: { position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' },
    scoreNumber: { fontSize: '56px', fontWeight: '800', fontFamily: "'Noto Serif', Georgia, serif", lineHeight: '1.1' },
    scoreMax: { fontSize: '16px', color: 'var(--text3)', fontWeight: '600' },
    statusBadge: { padding: '10px 24px', borderRadius: '30px', fontSize: '16px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'inline-block', margin: '0 auto' },
    metricBigBox: { backgroundColor: 'var(--bg)', borderRadius: '12px', padding: '32px 24px', textAlign: 'center', marginBottom: '32px' },
    metricValueLarge: { fontSize: '48px', fontWeight: '800', color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif", lineHeight: '1.2' },
    metricLabelLarge: { fontSize: '14px', color: 'var(--text2)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' },
    probBarTrack: { height: '14px', backgroundColor: 'var(--bg2)', borderRadius: '7px', overflow: 'hidden' },
    probBarFill: { height: '100%', borderRadius: '7px', transition: 'width 1.5s ease' },
    actionRow: { display: 'flex', gap: '20px', marginTop: 'auto', flexWrap: 'wrap' },
    btnPrimary: { padding: '14px 24px', color: 'var(--white)', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', flex: 2 },
    btnOutline: { padding: '14px 24px', backgroundColor: 'var(--white)', color: 'var(--navy)', border: '2px solid var(--border)', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer', flex: 1 },
    insightList: { display: 'flex', flexDirection: 'column', gap: '20px' },
    insightItem: { display: 'flex', gap: '16px', padding: '24px', backgroundColor: 'var(--bg)', borderRadius: '12px', fontSize: '16px', color: 'var(--text)', lineHeight: '1.6' },
    insightIcon: { fontWeight: 'bold', fontSize: '20px' }
};