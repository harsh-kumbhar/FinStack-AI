import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { loanRiskService } from '../services/loanRiskService';

const EMPLOYMENT_OPTIONS = ['Employed', 'Self-Employed', 'Unemployed'];
const EDUCATION_OPTIONS = ['High School', 'Bachelor', 'Master', 'Doctorate'];
const LOAN_DURATION_OPTIONS = [12, 24, 36, 60, 84];

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

export default function LoanRiskAnalyzer() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        EmploymentStatus: 'Employed',
        EducationLevel: 'Bachelor',
        AnnualIncome: '',
        SavingsAccountBalance: '',
        LoanAmount: '',
        LoanDuration: 36,
        BaseInterestRate: '',
        CreditScore: '',
        MonthlyDebtPayments: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
            navigate('/loan-result', { state: { result } });
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || "Failed to analyze loan risk. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.layout}>
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

            <main style={styles.main}>
                <header style={styles.topbar}>
                    <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--navy)' }}>Loan Risk Assessment</h2>
                    <div style={styles.topbarRight}>
                        <button onClick={logout} style={styles.logoutBtn}>Logout</button>
                    </div>
                </header>

                <div style={styles.content}>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <h1 style={styles.title}>AI Loan Approval Engine</h1>
                            <p style={styles.subtitle}>
                                Enter your raw financial details below. Our AI will automatically perform currency conversion (INR → USD) and compute complex financial ratios for approval.
                            </p>
                        </div>

                        {error && (
                            <div style={styles.errorAlert}>
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={styles.form}>
                            <div style={styles.grid2}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Employment Status</label>
                                    <select name="EmploymentStatus" value={formData.EmploymentStatus} onChange={handleChange} style={styles.input}>
                                        {EMPLOYMENT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Education Level</label>
                                    <select name="EducationLevel" value={formData.EducationLevel} onChange={handleChange} style={styles.input}>
                                        {EDUCATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={styles.grid2}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Annual Income (₹)</label>
                                    <input type="number" name="AnnualIncome" value={formData.AnnualIncome} onChange={handleChange} style={styles.input} required min="0" step="1"/>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Total Savings (₹)</label>
                                    <input type="number" name="SavingsAccountBalance" value={formData.SavingsAccountBalance} onChange={handleChange} style={styles.input} required min="0" step="1"/>
                                </div>
                            </div>

                            <div style={styles.grid2}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Loan Amount Requested (₹)</label>
                                    <input type="number" name="LoanAmount" value={formData.LoanAmount} onChange={handleChange} style={styles.input} required min="0" step="1"/>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Duration (Months)</label>
                                    <select name="LoanDuration" value={formData.LoanDuration} onChange={handleChange} style={styles.input}>
                                        {LOAN_DURATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Months</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={styles.grid2}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Current Credit Score</label>
                                    <input type="number" name="CreditScore" value={formData.CreditScore} onChange={handleChange} style={styles.input} required min="300" max="850"/>
                                </div>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>Expected Interest Rate (%)</label>
                                    <input type="number" name="BaseInterestRate" value={formData.BaseInterestRate} onChange={handleChange} style={styles.input} required min="0" max="100" step="0.1"/>
                                </div>
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Total Monthly Debt Payments (₹)</label>
                                <input type="number" name="MonthlyDebtPayments" value={formData.MonthlyDebtPayments} onChange={handleChange} style={styles.input} required min="0"/>
                            </div>

                            <button 
                                type="submit" 
                                style={{
                                    ...styles.submitBtn,
                                    opacity: loading ? 0.7 : 1,
                                    cursor: loading ? 'not-allowed' : 'pointer'
                                }}
                                disabled={loading}
                            >
                                {loading ? 'Processing via AI...' : 'Submit for Approval'}
                            </button>
                        </form>
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
        padding: '40px',
        display: 'flex',
        justifyContent: 'center'
    },
    card: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        maxWidth: '800px',
        padding: '32px'
    },
    cardHeader: {
        marginBottom: '28px',
        textAlign: 'center'
    },
    title: {
        fontSize: '24px',
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif",
        marginBottom: '8px',
        fontWeight: 'bold',
        margin: '0 0 12px 0'
    },
    subtitle: {
        fontSize: '14px',
        color: 'var(--text2)',
        margin: 0,
        lineHeight: '1.5'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    label: {
        fontSize: '13px',
        fontWeight: '600',
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    },
    input: {
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--white)',
        color: 'var(--text)',
        fontSize: '14px',
        transition: 'var(--transition)'
    },
    submitBtn: {
        marginTop: '20px',
        padding: '14px 24px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontSize: '14px',
        fontWeight: 'bold',
        transition: 'var(--transition)',
        boxShadow: '0 4px 12px rgba(230,92,0,0.2)',
        cursor: 'pointer'
    },
    errorAlert: {
        backgroundColor: 'var(--error-light)',
        color: 'var(--error)',
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '24px',
        fontSize: '14px',
        borderLeft: '4px solid var(--error)'
    }
};
