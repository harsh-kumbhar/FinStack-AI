import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { financialHealthService } from '../services/financialHealthService';

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
        alignItems: 'center',
        gap: '24px'
    },
    formContainer: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '32px',
        width: '100%',
        maxWidth: '800px',
        boxShadow: 'var(--shadow-sm)'
    },
    title: {
        fontSize: '24px',
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif",
        marginBottom: '8px',
        fontWeight: 'bold'
    },
    subtitle: {
        fontSize: '14px',
        color: 'var(--text2)',
        marginBottom: '28px'
    },
    sectionTitle: {
        fontSize: '15px',
        color: 'var(--navy)',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        margin: '24px 0 16px 0',
        paddingBottom: '8px',
        borderBottom: '2px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '16px'
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
    select: {
        padding: '10px 14px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--white)',
        color: 'var(--text)',
        fontSize: '14px',
        transition: 'var(--transition)',
        cursor: 'pointer'
    },
    helpText: {
        fontSize: '11px',
        color: 'var(--text3)',
        marginTop: '2px',
        lineHeight: '1.3'
    },
    btnPrimary: {
        padding: '14px 24px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(230,92,0,0.2)',
        width: '100%',
        marginTop: '20px',
        transition: 'var(--transition)'
    },
    errorText: {
        color: 'var(--error)',
        fontSize: '12px',
        marginTop: '2px'
    },
    loadingOverlay: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '24px',
        padding: '40px 0'
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '4px solid var(--bg2)',
        borderTop: '4px solid var(--saffron)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
    },
    loadingStepList: {
        width: '100%',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    loadingStepItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: 'var(--text2)'
    },
    loadingStepActive: {
        color: 'var(--navy)',
        fontWeight: 'bold'
    },
    loadingStepCheck: {
        color: 'var(--success)',
        fontWeight: 'bold'
    }
};

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer', active: true },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Document Intelligence', soon: true },
    { label: 'Loan Risk Assessment', soon: true },
    { label: 'Tax Estimator', path: '/tax-estimator' },
    { label: 'Investment Advisor', soon: true },
    { label: 'Settings', soon: true }
];

const LOADING_STAGES = [
    "Processing Inputs",
    "Running ML Model",
    "Applying Financial Rules",
    "Generating AI Insights",
    "Preparing Report"
];

export default function FinancialHealthAnalyzer() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [activeStageIndex, setActiveStageIndex] = useState(0);
    
    const [formData, setFormData] = useState({
        age: 30,
        employment_status: 'salaried',
        monthly_income: '',
        monthly_expenses: '',
        monthly_savings: '',
        emergency_fund: '',
        total_debt: '',
        investments: '',
        insurance_cover: '',
        financial_goal: 'wealth_accumulation'
    });
    
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const fetchExistingProfile = async () => {
            if (!user) return;
            try {
                const { data: userProfile } = await supabase
                    .from('user_profile')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (userProfile) {
                    const { data: finProfile } = await supabase
                        .from('financial_profile')
                        .select('*')
                        .eq('user_profile_id', userProfile.id)
                        .maybeSingle();

                    if (finProfile) {
                        setFormData({
                            age: finProfile.age || 30,
                            employment_status: finProfile.employment_status || 'salaried',
                            monthly_income: finProfile.monthly_income || '',
                            monthly_expenses: finProfile.monthly_expenses || '',
                            monthly_savings: finProfile.monthly_savings || '',
                            emergency_fund: finProfile.emergency_fund || '',
                            total_debt: finProfile.total_debt || '',
                            investments: finProfile.investments || '',
                            insurance_cover: finProfile.insurance_cover || '',
                            financial_goal: finProfile.financial_goal || 'wealth_accumulation'
                        });
                    }
                }
            } catch (err) {
                console.error("Error loading financial profile:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchExistingProfile();
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const tempErrors = {};
        if (!formData.age || formData.age < 18 || formData.age > 100) {
            tempErrors.age = 'Age must be between 18 and 100.';
        }
        if (!formData.employment_status) {
            tempErrors.employment_status = 'Employment status is required.';
        }
        
        const numericFields = [
            'monthly_income', 'monthly_expenses', 'monthly_savings', 
            'emergency_fund', 'total_debt', 'investments', 'insurance_cover'
        ];
        
        numericFields.forEach(field => {
            if (formData[field] === '' || formData[field] === undefined) {
                tempErrors[field] = 'This field is required.';
            } else if (isNaN(formData[field]) || parseFloat(formData[field]) < 0) {
                tempErrors[field] = 'Must be a valid positive number.';
            }
        });

        // Relative validations
        if (!tempErrors.monthly_income && !tempErrors.monthly_savings) {
            if (parseFloat(formData.monthly_savings) > parseFloat(formData.monthly_income)) {
                tempErrors.monthly_savings = 'Monthly savings cannot be greater than monthly income.';
            }
        }
        if (!tempErrors.monthly_income && !tempErrors.monthly_expenses) {
            if (parseFloat(formData.monthly_expenses) > parseFloat(formData.monthly_income)) {
                tempErrors.monthly_expenses = 'Monthly expenses exceed monthly income. Check values.';
            }
        }
        
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setAnalyzing(true);
        setActiveStageIndex(0);

        // Run loading stages every 750ms for high-end look
        const stageInterval = setInterval(() => {
            setActiveStageIndex(prev => {
                if (prev < LOADING_STAGES.length - 1) {
                    return prev + 1;
                } else {
                    clearInterval(stageInterval);
                    return prev;
                }
            });
        }, 750);

        try {
            const prediction = await financialHealthService.predictFinancialHealth(formData);
            
            // Wait slightly so user sees final stage
            setTimeout(() => {
                clearInterval(stageInterval);
                setAnalyzing(false);
                navigate('/health-result', { 
                    state: { 
                        prediction, 
                        inputs: formData 
                    } 
                });
            }, 4000);
        } catch (err) {
            clearInterval(stageInterval);
            setAnalyzing(false);
            console.error("Error analyzing financial health:", err);
        }
    };

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg)' }}>
                <h2 style={{ color: 'var(--navy)' }}>Loading Profile Data...</h2>
            </div>
        );
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
                        Financial Health Analyzer
                    </div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                {/* CONTENT */}
                <div style={styles.content}>
                    <div style={styles.formContainer}>
                        <h1 style={styles.title}>Analyze Your Financial Health</h1>
                        <p style={styles.subtitle}>Enter your financial details below to get an instant AI-powered evaluation of your saving habits, debt metrics, and investment ratios.</p>
                        
                        {analyzing ? (
                            <div style={styles.loadingOverlay}>
                                <div style={styles.spinner}></div>
                                <h3 style={{ color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif" }}>AI Engine Analyzing Your Finances...</h3>
                                
                                <div style={styles.loadingStepList}>
                                    {LOADING_STAGES.map((stage, idx) => {
                                        const isFinished = idx < activeStageIndex;
                                        const isActive = idx === activeStageIndex;
                                        return (
                                            <div 
                                                key={idx} 
                                                style={{ 
                                                    ...styles.loadingStepItem, 
                                                    ...(isActive ? styles.loadingStepActive : {}) 
                                                }}
                                            >
                                                <span style={isFinished ? styles.loadingStepCheck : {}}>
                                                    {isFinished ? "✔" : (isActive ? "➤" : "○")}
                                                </span>
                                                <span>{stage}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                {/* SECTION 1: PERSONAL INFORMATION */}
                                <div style={styles.sectionTitle}>👤 Personal Information</div>
                                <div style={styles.grid2}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Age</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="age" 
                                            min="18" 
                                            max="100"
                                            value={formData.age}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>Your current age (must be between 18 and 100).</span>
                                        {errors.age && <span style={styles.errorText}>{errors.age}</span>}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Employment Status</label>
                                        <select 
                                            style={styles.select}
                                            name="employment_status"
                                            value={formData.employment_status}
                                            onChange={handleInputChange}
                                        >
                                            <option value="salaried">Salaried</option>
                                            <option value="self_employed">Self-Employed</option>
                                            <option value="business_owner">Business Owner</option>
                                            <option value="unemployed">Unemployed</option>
                                            <option value="retired">Retired</option>
                                        </select>
                                        <span style={styles.helpText}>Your current primary source of professional activity.</span>
                                        {errors.employment_status && <span style={styles.errorText}>{errors.employment_status}</span>}
                                    </div>
                                </div>

                                {/* SECTION 2: INCOME */}
                                <div style={styles.sectionTitle}>💰 Income</div>
                                <div style={styles.grid2}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Monthly Income (₹)</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="monthly_income"
                                            placeholder="e.g. 75000"
                                            value={formData.monthly_income}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>Your total regular monthly take-home/net income after taxes.</span>
                                        {errors.monthly_income && <span style={styles.errorText}>{errors.monthly_income}</span>}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Monthly Savings (₹)</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="monthly_savings"
                                            placeholder="e.g. 20000"
                                            value={formData.monthly_savings}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>The amount of money you set aside each month into savings or cash.</span>
                                        {errors.monthly_savings && <span style={styles.errorText}>{errors.monthly_savings}</span>}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Monthly Expenses (₹)</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="monthly_expenses"
                                            placeholder="e.g. 40000"
                                            value={formData.monthly_expenses}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>Your average monthly spending (rent, bills, groceries, leisure, etc).</span>
                                        {errors.monthly_expenses && <span style={styles.errorText}>{errors.monthly_expenses}</span>}
                                    </div>
                                </div>

                                {/* SECTION 3: ASSETS & INVESTMENTS */}
                                <div style={styles.sectionTitle}>🏦 Assets & Investments</div>
                                <div style={styles.grid2}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Emergency Fund Balance (₹)</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="emergency_fund"
                                            placeholder="e.g. 150000"
                                            value={formData.emergency_fund}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>Liquid savings reserved specifically for unexpected financial shocks.</span>
                                        {errors.emergency_fund && <span style={styles.errorText}>{errors.emergency_fund}</span>}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Total Active Investments (₹)</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="investments"
                                            placeholder="e.g. 300000"
                                            value={formData.investments}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>Total current valuation of your stocks, mutual funds, gold, deposits, etc.</span>
                                        {errors.investments && <span style={styles.errorText}>{errors.investments}</span>}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Total Insurance Coverage (₹)</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="insurance_cover"
                                            placeholder="e.g. 1000000"
                                            value={formData.insurance_cover}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>The maximum sum assured of all active life/health insurance policies.</span>
                                        {errors.insurance_cover && <span style={styles.errorText}>{errors.insurance_cover}</span>}
                                    </div>
                                </div>

                                {/* SECTION 4: LOANS & GOALS */}
                                <div style={styles.sectionTitle}>💳 Loans & Goals</div>
                                <div style={styles.grid2}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Total Debt / Outstanding Loan (₹)</label>
                                        <input 
                                            style={styles.input}
                                            type="number" 
                                            name="total_debt"
                                            placeholder="e.g. 500000"
                                            value={formData.total_debt}
                                            onChange={handleInputChange}
                                        />
                                        <span style={styles.helpText}>Total remaining outstanding balance of your home, auto, personal, or education loans.</span>
                                        {errors.total_debt && <span style={styles.errorText}>{errors.total_debt}</span>}
                                    </div>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Primary Financial Goal</label>
                                        <select 
                                            style={styles.select}
                                            name="financial_goal"
                                            value={formData.financial_goal}
                                            onChange={handleInputChange}
                                        >
                                            <option value="wealth_accumulation">Wealth Accumulation & Growth</option>
                                            <option value="retirement">Retirement Planning</option>
                                            <option value="debt_payoff">Debt Payoff & Financial Freedom</option>
                                            <option value="buy_home">Buying a Home</option>
                                            <option value="emergency_cushion">Building a Security / Emergency Cushion</option>
                                            <option value="education">Higher Education / Kids Education</option>
                                            <option value="other">Other Life Goals</option>
                                        </select>
                                        <span style={styles.helpText}>Your primary target that drives your financial strategy.</span>
                                    </div>
                                </div>

                                <button type="submit" style={styles.btnPrimary}>Analyze Financial Health</button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
            
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
