import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loanRiskService } from '../services/loanRiskService';

const EMPLOYMENT_OPTIONS = ['Employed', 'Self-Employed', 'Unemployed'];
const EDUCATION_OPTIONS = ['High School', 'Bachelor', 'Master', 'Doctorate'];

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Document Vault', path: '/document-vault' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Financial Journey', path: '/financial-journey' },
    { label: 'Loan Risk Assessment', active: true, path: '/loan-analyzer' },
    { label: 'Tax Estimator', path: '/tax-estimator' }
];

export default function LoanRiskAnalyzer() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initialFetchLoading, setInitialFetchLoading] = useState(true);
    const [error, setError] = useState(null);

    const [marketOffers, setMarketOffers] = useState([]);
    const [selectedOffer, setSelectedOffer] = useState(null);

    const [formData, setFormData] = useState({
        EmploymentStatus: 'Employed',
        EducationLevel: 'Bachelor',
        AnnualIncome: '',
        SavingsAccountBalance: '',
        CreditScore: '',
        MonthlyDebtPayments: '',
        LoanAmount: '',
        LoanDuration: 36,
        BaseInterestRate: ''
    });

    const [fieldSources, setFieldSources] = useState({});

    // ── Fetch Defaults & Market Offers ──
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [defaults, marketplace] = await Promise.all([
                    loanRiskService.getProfileDefaults(),
                    loanRiskService.getMarketOffers()
                ]);

                setFormData(prev => ({
                    ...prev,
                    EmploymentStatus: defaults.EmploymentStatus || prev.EmploymentStatus,
                    EducationLevel: defaults.EducationLevel || prev.EducationLevel,
                    AnnualIncome: defaults.AnnualIncome || prev.AnnualIncome,
                    SavingsAccountBalance: defaults.SavingsAccountBalance || prev.SavingsAccountBalance,
                    CreditScore: defaults.CreditScore || prev.CreditScore,
                    MonthlyDebtPayments: defaults.MonthlyDebtPayments || prev.MonthlyDebtPayments,
                }));

                if (defaults.field_sources) setFieldSources(defaults.field_sources);
                if (marketplace.offers) setMarketOffers(marketplace.offers);

            } catch (err) {
                console.error("Failed to fetch initial data", err);
            } finally {
                setInitialFetchLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (fieldSources[name] && fieldSources[name].source !== 'DEFAULT') {
            setFieldSources(prev => ({
                ...prev,
                [name]: { source: 'DEFAULT', notes: 'Manually edited by user' }
            }));
        }
    };

    const handleSelectOffer = (offer) => {
        setSelectedOffer(offer);
        setFormData(prev => ({
            ...prev,
            BaseInterestRate: offer.interest_rate,
            LoanDuration: Math.min(prev.LoanDuration || 36, offer.max_duration_months)
        }));
        setStep(3);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                EmploymentStatus: formData.EmploymentStatus,
                EducationLevel: formData.EducationLevel,
                AnnualIncome: parseFloat(formData.AnnualIncome || 0),
                SavingsAccountBalance: parseFloat(formData.SavingsAccountBalance || 0),
                LoanAmount: parseFloat(formData.LoanAmount || 0),
                LoanDuration: parseFloat(formData.LoanDuration || 36),
                BaseInterestRate: parseFloat(formData.BaseInterestRate || 8.5),
                CreditScore: parseFloat(formData.CreditScore || 0),
                MonthlyDebtPayments: parseFloat(formData.MonthlyDebtPayments || 0)
            };

            const result = await loanRiskService.predictRisk(payload);
            navigate('/loan-result', { state: { result, inputs: payload, selectedOffer } });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to analyze loan risk.");
        } finally {
            setLoading(false);
        }
    };

    const renderBadge = (fieldName) => {
        const sourceInfo = fieldSources[fieldName];
        if (!sourceInfo) return null;
        if (sourceInfo.source === 'DOCUMENT_EXTRACTED') {
            return <span style={{ ...styles.badgeBase, backgroundColor: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>● Vault Extracted</span>;
        }
        if (sourceInfo.source === 'FINSTACK_PROFILE') {
            return <span style={{ ...styles.badgeBase, backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>● Profile Sync</span>;
        }
        return null;
    };

    const generateDurationOptions = (maxMonths) => {
        const options = [];
        for (let i = 12; i <= maxMonths; i += 12) {
            options.push(i);
        }
        // Ensure the max is included if not a multiple of 12
        if (!options.includes(maxMonths)) options.push(maxMonths);
        return options.sort((a, b) => a - b);
    };

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
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={styles.navItem} onClick={logout}>Logout</div>
                </div>
            </aside>

            <main style={styles.main}>
                <header style={styles.topbar}>
                    <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '18px' }}>Loan Risk Assessment</div>
                    <button onClick={logout} style={styles.logoutBtn}>Logout</button>
                </header>

                <div style={styles.content}>
                    {/* Stepper Header */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px', gap: '40px' }}>
                        {[
                            { num: 1, label: 'Financial Profile' },
                            { num: 2, label: 'Market Offers' },
                            { num: 3, label: 'Configure Request' }
                        ].map((s) => (
                            <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: step === s.num ? 1 : 0.5 }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: step === s.num ? 'var(--saffron)' : 'var(--navy)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{s.num}</div>
                                <span style={{ fontWeight: step === s.num ? 'bold' : 'normal', color: 'var(--navy)' }}>{s.label}</span>
                            </div>
                        ))}
                    </div>

                    <div style={styles.card}>
                        {initialFetchLoading ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text3)' }}>🔄 Scanning Document Vault & Live Markets...</div>
                        ) : (
                            <>
                                {error && <div style={styles.errorAlert}><strong>Error:</strong> {error}</div>}

                                {/* STEP 1: Profile */}
                                {step === 1 && (
                                    <div style={styles.form}>
                                        <div style={{ marginBottom: '24px' }}>
                                            <h2 style={{ margin: '0 0 8px 0', color: 'var(--navy)' }}>Confirm Your Financial Profile</h2>
                                            <p style={{ margin: 0, color: 'var(--text2)', fontSize: '14px' }}>We have pre-filled this using your Document Vault. Verify before proceeding.</p>
                                        </div>

                                        <div style={styles.grid2}>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Employment Status {renderBadge('EmploymentStatus')}</label>
                                                <select name="EmploymentStatus" value={formData.EmploymentStatus} onChange={handleChange} style={styles.input}>
                                                    {EMPLOYMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Education Level {renderBadge('EducationLevel')}</label>
                                                <select name="EducationLevel" value={formData.EducationLevel} onChange={handleChange} style={styles.input}>
                                                    {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div style={styles.grid2}>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Annual Income (₹) {renderBadge('AnnualIncome')}</label>
                                                <input type="number" name="AnnualIncome" value={formData.AnnualIncome} onChange={handleChange} style={styles.input} required min="0" step="1" />
                                            </div>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Total Savings (₹) {renderBadge('SavingsAccountBalance')}</label>
                                                <input type="number" name="SavingsAccountBalance" value={formData.SavingsAccountBalance} onChange={handleChange} style={styles.input} required min="0" step="1" />
                                            </div>
                                        </div>

                                        <div style={styles.grid2}>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Current Credit Score {renderBadge('CreditScore')}</label>
                                                <input type="number" name="CreditScore" value={formData.CreditScore} onChange={handleChange} style={styles.input} required min="300" max="850" />
                                            </div>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Total Monthly Debt Payments (₹) {renderBadge('MonthlyDebtPayments')}</label>
                                                <input type="number" name="MonthlyDebtPayments" value={formData.MonthlyDebtPayments} onChange={handleChange} style={styles.input} required min="0" />
                                            </div>
                                        </div>

                                        <button type="button" style={styles.submitBtn} onClick={() => setStep(2)}>Browse Market Offers →</button>
                                    </div>
                                )}

                                {/* STEP 2: Marketplace */}
                                {step === 2 && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <div>
                                                <h2 style={{ margin: '0 0 8px 0', color: 'var(--navy)' }}>Live Loan Marketplace</h2>
                                                <p style={{ margin: 0, color: 'var(--text2)', fontSize: '14px' }}>Select a loan product to analyze your approval odds.</p>
                                            </div>
                                            <button style={styles.btnOutline} onClick={() => setStep(1)}>← Back</button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                            {marketOffers.map(offer => (
                                                <div key={offer.id} onClick={() => handleSelectOffer(offer)} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s', ':hover': { boxShadow: 'var(--shadow-sm)', transform: 'translateY(-2px)' } }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: offer.logo_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '20px' }}>
                                                            {offer.bank_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', color: 'var(--navy)' }}>{offer.bank_name}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{offer.loan_type}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: '24px', fontWeight: '800', color: offer.logo_color, marginBottom: '8px' }}>{offer.interest_rate.toFixed(2)}% <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--text3)' }}>p.a.</span></div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '12px' }}>Max {offer.max_duration_months} Months · Min Score {offer.min_credit_score}</div>
                                                    <div style={{ fontSize: '12px', backgroundColor: '#F8FAFC', padding: '8px', borderRadius: '6px', color: 'var(--text2)' }}>{offer.description}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* STEP 3: Configure */}
                                {step === 3 && selectedOffer && (
                                    <form onSubmit={handleSubmit} style={styles.form}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                            <div>
                                                <h2 style={{ margin: '0 0 8px 0', color: 'var(--navy)' }}>Configure Your Request</h2>
                                                <p style={{ margin: 0, color: 'var(--text2)', fontSize: '14px' }}>Finalize details for the <strong>{selectedOffer.bank_name} {selectedOffer.loan_type}</strong>.</p>
                                            </div>
                                            <button type="button" style={styles.btnOutline} onClick={() => setStep(2)}>← Back</button>
                                        </div>

                                        <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', padding: '20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '12px', color: '#0369A1', fontWeight: 'bold', textTransform: 'uppercase' }}>Locked Interest Rate</div>
                                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0284C7' }}>{formData.BaseInterestRate}%</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', color: '#0369A1', fontWeight: 'bold' }}>Minimum Required Credit Score</div>
                                                <div style={{ fontSize: '18px', fontWeight: '700', color: formData.CreditScore >= selectedOffer.min_credit_score ? '#10B981' : '#EF4444' }}>
                                                    {selectedOffer.min_credit_score} {formData.CreditScore >= selectedOffer.min_credit_score ? '✓' : '⚠️'}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={styles.grid2}>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Desired Loan Amount (₹)</label>
                                                <input type="number" name="LoanAmount" value={formData.LoanAmount} onChange={handleChange} style={{ ...styles.input, fontSize: '18px', fontWeight: 'bold' }} required min="10000" step="1000" />
                                            </div>
                                            <div style={styles.inputGroup}>
                                                <label style={styles.label}>Repayment Duration</label>
                                                <select name="LoanDuration" value={formData.LoanDuration} onChange={handleChange} style={styles.input}>
                                                    {generateDurationOptions(selectedOffer.max_duration_months).map(opt => <option key={opt} value={opt}>{opt} Months</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <button type="submit" style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                                            {loading ? 'Running Random Forest Models...' : 'Analyze Risk & Predict Approval →'}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

const styles = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: "'Noto Sans', 'Segoe UI', sans-serif" },
    sidebar: { position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', backgroundColor: 'var(--navy)', color: 'var(--white)', display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: 'var(--shadow)' },
    sidebarHeader: { padding: '20px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' },
    sidebarNav: { flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '4px' },
    navItem: { padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '14px' },
    navItemActive: { backgroundColor: 'var(--navy2)', color: 'var(--white)', borderLeft: '4px solid var(--saffron)' },
    main: { flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' },
    topbar: { position: 'fixed', top: 0, left: '240px', right: 0, height: '64px', backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', zIndex: 90 },
    logoutBtn: { padding: '8px 16px', backgroundColor: 'var(--error-light)', color: 'var(--error)', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer' },
    content: { marginTop: '64px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
    card: { backgroundColor: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', width: '100%', maxWidth: '900px', padding: '32px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    label: { fontSize: '13px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center' },
    badgeBase: { fontSize: '10px', padding: '2px 8px', borderRadius: '12px', fontWeight: '700', marginLeft: '8px' },
    input: { padding: '12px 14px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '14px' },
    submitBtn: { padding: '16px 24px', backgroundColor: 'var(--saffron)', color: 'var(--white)', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' },
    btnOutline: { padding: '10px 20px', border: '1px solid var(--border)', borderRadius: '8px', backgroundColor: 'var(--white)', cursor: 'pointer', fontWeight: 'bold', color: 'var(--navy)' },
    errorAlert: { backgroundColor: 'var(--error-light)', color: 'var(--error)', padding: '12px', borderRadius: '8px', marginBottom: '20px' }
};