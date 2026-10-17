import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taxEstimatorService } from '../services/taxEstimatorService';
import '../styles/taxEstimator.css';

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Document Vault', path: '/document-vault' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Financial Journey', path: '/financial-journey' },
    { label: 'Loan Risk Assessment', path: '/loan-analyzer' },
    { label: 'Tax Estimator', active: true, path: '/tax-estimator' }
];

export default function TaxEstimator() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [step, setStep] = useState(0);
    const [calculationResult, setCalculationResult] = useState(null);
    const [formData, setFormData] = useState({});

    const [loading, setLoading] = useState(true);
    const [profileDefaults, setProfileDefaults] = useState(null);
    const [educationData, setEducationData] = useState(null);
    const [activeTab, setActiveTab] = useState('slabs');
    const [flowExpanded, setFlowExpanded] = useState(true);

    // What-If State
    const [whatIfType, setWhatIfType] = useState('salary_change');
    const [whatIfSalaryDelta, setWhatIfSalaryDelta] = useState(100000);
    const [whatIf80C, setWhatIf80C] = useState(50000);
    const [whatIf80D, setWhatIf80D] = useState(15000);
    const [whatIfHomeLoan, setWhatIfHomeLoan] = useState(200000);
    const [whatIfForcedRegime, setWhatIfForcedRegime] = useState(null);
    const [whatIfResult, setWhatIfResult] = useState(null);
    const [simulatingWhatIf, setSimulatingWhatIf] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [defaults, edu] = await Promise.all([
                    taxEstimatorService.getProfileDefaults('2024-25'),
                    taxEstimatorService.getTaxEducation('2024-25')
                ]);
                setProfileDefaults(defaults);
                setEducationData(edu);
            } catch (err) {
                console.error("Failed to load tax briefing data", err);
            } finally {
                setLoading(false);
            }
        };

        if (location.state?.step === 6 && location.state?.finalResult) {
            setCalculationResult(location.state.finalResult);
            if (location.state.inputs) {
                setFormData(location.state.inputs);
            }
            setStep(6);

            // Automatically initialize live What-If workbench with salary change simulation
            runWhatIf('salary_change', { salary_change_amount: 100000 }, location.state.finalResult, location.state.inputs);

            // Clear location state so refreshes don't trap the user
            window.history.replaceState({}, document.title)
        } else {
            fetchInitialData();
        }
    }, [location.state]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
    };

    const handleStartInterview = () => {
        navigate('/tax-estimator/interview', { state: { prefill: profileDefaults } });
    };

    const renderBadge = (source) => {
        if (source === 'DOCUMENT_EXTRACTED') {
            return <span className="te-badge te-badge-doc">● Vault Extracted</span>;
        }
        if (source === 'FINSTACK_PROFILE') {
            return <span className="te-badge te-badge-profile">● Profile Sync</span>;
        }
        return <span className="te-badge te-badge-default">○ Default / Unset</span>;
    };

    const renderProvenanceBadge = (source) => {
        if (source === 'FINSTACK_PROFILE') {
            return <span className="te-badge te-badge-profile">● FinStack Profile</span>;
        }
        if (source === 'USER_ENTERED') {
            return <span className="te-badge te-badge-user">● User Entered</span>;
        }
        if (source === 'DOCUMENT_EXTRACTED') {
            return <span className="te-badge te-badge-doc">● Document Extracted</span>;
        }
        return <span className="te-badge te-badge-default">● Default</span>;
    };

    // ── What-If Simulation Runner ──
    const runWhatIf = async (overrideType, overrides = {}, activeResult = null, activeInputs = null) => {
        const baseResult = activeResult || calculationResult;
        const inputsToUse = activeInputs || formData;
        if (!baseResult) return;

        setSimulatingWhatIf(true);
        const sType = overrideType || whatIfType;
        try {
            const baseInput = {
                financial_year: inputsToUse.financial_year || '2024-25',
                gross_salary: parseFloat(inputsToUse.gross_salary || 0),
                other_income: parseFloat(inputsToUse.other_income || 0),
                deduction_80c: parseFloat(inputsToUse.deduction_80c || 0),
                deduction_80d: parseFloat(inputsToUse.deduction_80d || 0),
                deduction_80tta: parseFloat(inputsToUse.deduction_80tta || 0),
                home_loan_interest: parseFloat(inputsToUse.home_loan_interest || 0),
            };

            const payload = {
                base_input: baseInput,
                scenario_type: sType,
                overrides: {
                    salary_change_amount: sType === 'salary_change' ? parseFloat(overrides.salary_change_amount ?? whatIfSalaryDelta) : null,
                    additional_80c: sType === 'additional_deductions' ? parseFloat(overrides.additional_80c ?? whatIf80C) : 0,
                    additional_80d: sType === 'additional_deductions' ? parseFloat(overrides.additional_80d ?? whatIf80D) : 0,
                    home_loan_interest: sType === 'home_loan_interest' ? parseFloat(overrides.home_loan_interest ?? whatIfHomeLoan) : null,
                    forced_regime: overrides.forced_regime ?? whatIfForcedRegime,
                }
            };

            const res = await taxEstimatorService.simulateWhatIf(payload);
            setWhatIfResult(res);
        } catch (err) {
            console.error('What-If simulation failed:', err);
        } finally {
            setSimulatingWhatIf(false);
        }
    };

    const applyOpportunityToWhatIf = (opp) => {
        if (opp.id.includes('80c') || opp.id.includes('80d')) {
            setWhatIfType('additional_deductions');
            const addC = opp.id.includes('80c') ? 150000 : whatIf80C;
            const addD = opp.id.includes('80d') ? 25000 : whatIf80D;
            if (opp.id.includes('80c')) setWhatIf80C(150000);
            if (opp.id.includes('80d')) setWhatIf80D(25000);
            runWhatIf('additional_deductions', { additional_80c: addC, additional_80d: addD, forced_regime: 'OLD' });
        } else if (opp.id.includes('24b')) {
            setWhatIfType('home_loan_interest');
            setWhatIfHomeLoan(200000);
            runWhatIf('home_loan_interest', { home_loan_interest: 200000, forced_regime: 'OLD' });
        } else if (opp.id.includes('regime')) {
            setWhatIfType('regime_switch');
            runWhatIf('regime_switch', {});
        }
        const el = document.getElementById('te-whatif-workbench');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="te-layout" style={{ position: 'relative', paddingBottom: step === 0 ? '100px' : '40px' }}>
            <aside style={{
                position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px',
                backgroundColor: 'var(--navy)', color: 'var(--white)',
                display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: 'var(--shadow)'
            }}>
                <div style={{
                    padding: '20px', fontSize: '24px', fontWeight: 'bold',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    fontFamily: "'Noto Serif', Georgia, serif", cursor: 'pointer'
                }} onClick={() => navigate('/dashboard')}>
                    FinStack AI
                </div>
                <nav style={{ flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {SIDEBAR_ITEMS.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => navigate(item.path)}
                            style={{
                                padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', cursor: 'pointer',
                                backgroundColor: item.active ? 'var(--navy2)' : 'transparent',
                                borderLeft: item.active ? '4px solid var(--saffron)' : '4px solid transparent',
                                color: 'var(--white)', fontSize: '14px'
                            }}
                        >
                            <span>{item.label}</span>
                        </div>
                    ))}
                </nav>
            </aside>

            <div className="te-main">
                <header className="te-topbar">
                    <div style={{ fontWeight: '600', color: 'var(--navy)', fontSize: '15px' }}>
                        {step === 0 ? 'Tax Briefing & Intelligence Hub' : 'Tax Estimator & Regime Advisor'} · FY 2024-25
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text2)' }}>{user?.email}</span>
                        <button onClick={logout} style={{
                            padding: '6px 14px', backgroundColor: 'var(--error-light)',
                            color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-sm)',
                            fontWeight: '600', cursor: 'pointer'
                        }}>
                            Logout
                        </button>
                    </div>
                </header>

                <main className="te-content">
                    {/* ══════════════════════════════════════════════════
                        STEP 0: BRIEFING HUB
                        ══════════════════════════════════════════════════ */}
                    {step === 0 && (
                        <>
                            <div className="te-landing-banner" style={{ marginBottom: '32px' }}>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>
                                    Assessment Year 2025-26
                                </span>
                                <h1 className="te-landing-title" style={{ marginTop: '12px', fontSize: '32px' }}>
                                    Your Intelligent Tax Copilot
                                </h1>
                                <p className="te-landing-desc" style={{ fontSize: '16px', lineHeight: '1.6', maxWidth: '800px' }}>
                                    Filing taxes in India doesn't have to be overwhelming. The FinStack Tax Estimator replaces confusing forms with a natural conversation. Review the intelligence we gathered below, learn how the system works, and launch the AI interview when you are ready.
                                </p>
                            </div>

                            <div className="te-card" style={{ marginBottom: '32px', borderColor: 'var(--navy2)', borderWidth: '2px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
                                            📁 Vault Intelligence Summary
                                        </h2>
                                        <p style={{ fontSize: '14px', color: 'var(--text2)', margin: '4px 0 0 0' }}>
                                            We analyzed your uploaded documents (Salary Slips, ITRs, Investments). Our AI Assistant will use these numbers as a starting point during your interview.
                                        </p>
                                    </div>
                                    <span style={{ fontSize: '12px', color: 'var(--india-green)', fontWeight: '700', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '6px 12px', borderRadius: '12px' }}>
                                        ✓ Secure Trust Boundary Verified
                                    </span>
                                </div>

                                {loading ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)', fontSize: '16px' }}>
                                        🔄 Scanning Document Vault for verified financial records...
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                                        <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '700' }}>ANNUAL GROSS SALARY</span>
                                                {renderBadge(profileDefaults?.field_sources?.gross_salary?.source)}
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--navy)', marginTop: '12px' }}>
                                                {formatCurrency(profileDefaults?.gross_salary)}
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                                                {profileDefaults?.field_sources?.gross_salary?.notes || 'Will be used to calculate Standard Deduction.'}
                                            </span>
                                        </div>

                                        <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '700' }}>SECTION 80C (INVESTMENTS)</span>
                                                {renderBadge(profileDefaults?.field_sources?.deduction_80c?.source)}
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--navy)', marginTop: '12px' }}>
                                                {formatCurrency(profileDefaults?.deduction_80c)}
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                                                {profileDefaults?.field_sources?.deduction_80c?.notes || 'Statutory cap is ₹1,50,000 under Old Regime.'}
                                            </span>
                                        </div>

                                        <div style={{ background: '#F8FAFC', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text3)', fontWeight: '700' }}>SECTION 80D (HEALTH)</span>
                                                {renderBadge(profileDefaults?.field_sources?.deduction_80d?.source)}
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--navy)', marginTop: '12px' }}>
                                                {formatCurrency(profileDefaults?.deduction_80d)}
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text2)', display: 'block', marginTop: '6px', lineHeight: '1.4' }}>
                                                {profileDefaults?.field_sources?.deduction_80d?.notes || 'Statutory cap is ₹25,000 for non-senior citizens.'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <div style={{ marginTop: '20px', padding: '12px 16px', background: '#FFFBEB', borderLeft: '4px solid #F59E0B', borderRadius: '4px', fontSize: '13px', color: '#92400E' }}>
                                    <strong>Note:</strong> These values are provisional. During the AI interview, the assistant will explicitly ask you to confirm if these numbers are correct before running the deterministic tax calculation.
                                </div>
                            </div>

                            <div className="te-info-card-expanded">
                                <h3>1. How the FinStack AI Interview Works</h3>
                                <p>Traditional tax calculators force you to fill out complex forms, often using dense statutory language. We have redesigned this experience.</p>
                                <ul>
                                    <li><strong>Conversational Input:</strong> You will chat with an AI assistant specifically trained on Indian Income Tax laws for FY 2024-25.</li>
                                    <li><strong>Clarification & Doubts:</strong> If the AI asks for your "Section 80C investments" and you aren't sure what that means, simply ask it!</li>
                                    <li><strong>Deterministic Math:</strong> LLMs are notoriously bad at arithmetic. Therefore, the AI will <strong>never</strong> calculate your tax. Once it gathers your final numbers, it hands them off to our verified Python calculation engine.</li>
                                </ul>
                            </div>

                            <div className="te-info-card-expanded">
                                <h3>2. The Old Regime vs. New Regime Dilemma</h3>
                                <p>The core goal of this module is to definitively answer the question: <em>"Which tax regime saves me more money?"</em></p>
                                <p><strong>The New Tax Regime (Section 115BAC)</strong> is now the default regime in India. It features much wider tax brackets and lower baseline tax rates. Furthermore, if your taxable income is under ₹7,00,000, you pay absolutely zero tax due to the Section 87A rebate. However, the major catch is that you must forfeit almost all deductions.</p>
                                <p><strong>The Old Tax Regime</strong> maintains higher slab rates, but it allows you to aggressively reduce your taxable income using statutory deductions. If you have substantial investments in Provident Funds, heavy medical insurance premiums, and a running Home Loan, the Old Regime often remains mathematically superior.</p>
                            </div>

                            <div className="te-disclaimer-box" style={{ marginTop: '20px', marginBottom: '80px' }}>
                                ⚖️ <strong>Statutory Disclaimer:</strong> This module produces educational projections under the Income Tax Act, 1961. Final legal liabilities are determined strictly upon filing your official ITR with the Income Tax Department. FinStack does not provide certified financial advice.
                            </div>
                        </>
                    )}

                    {/* ══════════════════════════════════════════════════
                        STEP 6: RESULTS & REGIME COMPARISON DASHBOARD
                        ══════════════════════════════════════════════════ */}
                    {step === 6 && calculationResult && (() => {
                        const recRegime = calculationResult.recommended_regime;
                        const recTax = recRegime === 'New Regime'
                            ? calculationResult.new_regime.total_tax_liability
                            : calculationResult.old_regime.total_tax_liability;
                        const diff = calculationResult.estimated_tax_savings || 0;
                        const gross = calculationResult.new_regime.gross_income || 1;
                        const effectiveRate = gross > 0 ? ((recTax / gross) * 100).toFixed(1) : '0.0';

                        const recMessage = calculationResult.recommendation_message ||
                            (recRegime === 'New Regime'
                                ? `New Regime may be more beneficial based on your current inputs, with an estimated difference of ₹${Number(diff).toLocaleString('en-IN')}.`
                                : `Old Regime may be more beneficial based on your current inputs, with an estimated difference of ₹${Number(diff).toLocaleString('en-IN')}.`);

                        return (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h2 className="te-title">Assessment Results</h2>
                                    <button className="te-btn-secondary" onClick={() => setStep(0)}>
                                        ← Back to Hub
                                    </button>
                                </div>

                                <div className="te-savings-card">
                                    <div>
                                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontWeight: '700' }}>
                                            Tax Regime Recommendation · Educational Planning Estimate
                                        </div>
                                        <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '6px' }}>
                                            {recMessage}
                                        </div>
                                        <div style={{ fontSize: '14px', marginTop: '8px', opacity: '0.95', lineHeight: '1.4' }}>
                                            Estimated difference between regimes: <strong>₹{Number(diff).toLocaleString('en-IN')}</strong>.
                                            <em> Results are educational estimates based on applicable tax rules, not guaranteed tax liabilities or outcomes.</em>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '44px' }}>⚖️</div>
                                </div>

                                <div className="te-metrics-grid">
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Recommended Regime</span>
                                        <span className="te-metric-val" style={{ color: 'var(--india-green)' }}>{recRegime}</span>
                                        <span className="te-metric-sub">Based on provided inputs</span>
                                    </div>
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Estimated Tax Liability</span>
                                        <span className="te-metric-val">₹{Number(recTax).toLocaleString('en-IN')}</span>
                                        <span className="te-metric-sub">Under {recRegime}</span>
                                    </div>
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Estimated Difference</span>
                                        <span className="te-metric-val" style={{ color: diff > 0 ? 'var(--saffron)' : 'var(--navy)' }}>
                                            ₹{Number(diff).toLocaleString('en-IN')}
                                        </span>
                                        <span className="te-metric-sub">{diff > 0 ? `Advantage over other regime` : 'Both regimes equal'}</span>
                                    </div>
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Effective Tax Rate</span>
                                        <span className="te-metric-val">{effectiveRate}%</span>
                                        <span className="te-metric-sub">Of gross income</span>
                                    </div>
                                </div>

                                <div className="te-regime-grid">
                                    <div className={`te-regime-card ${recRegime === 'New Regime' ? 'recommended' : ''}`}>
                                        {recRegime === 'New Regime' && <div className="te-recommended-pill">Recommended</div>}
                                        <div className="te-regime-title">New Tax Regime</div>
                                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Section 115BAC · Default Regime for FY 2024-25</span>
                                        <div className="te-tax-amount">₹{Number(calculationResult.new_regime.total_tax_liability).toLocaleString('en-IN')}</div>
                                        <div className="te-breakdown-list">
                                            <div className="te-breakdown-row"><span>Gross Income</span><span>₹{Number(calculationResult.new_regime.gross_income).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row"><span>Standard Deduction</span><span>- ₹{Number(calculationResult.new_regime.standard_deduction).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row"><span>Chapter VI-A Deductions</span><span>₹0 (Not applicable)</span></div>
                                            <div className="te-breakdown-row"><span>Net Taxable Income</span><span>₹{Number(calculationResult.new_regime.taxable_income).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row"><span>Tax on Slabs</span><span>₹{Number(calculationResult.new_regime.tax_on_income).toLocaleString('en-IN')}</span></div>
                                            {calculationResult.new_regime.rebate_87a > 0 && <div className="te-breakdown-row" style={{ color: 'var(--india-green)' }}><span>Section 87A Rebate</span><span>- ₹{Number(calculationResult.new_regime.rebate_87a).toLocaleString('en-IN')}</span></div>}
                                            {calculationResult.new_regime.surcharge > 0 && <div className="te-breakdown-row"><span>Surcharge</span><span>₹{Number(calculationResult.new_regime.surcharge).toLocaleString('en-IN')}</span></div>}
                                            <div className="te-breakdown-row"><span>Health & Education Cess (4%)</span><span>₹{Number(calculationResult.new_regime.health_and_education_cess).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row total"><span>Final Estimated Liability</span><span>₹{Number(calculationResult.new_regime.total_tax_liability).toLocaleString('en-IN')}</span></div>
                                        </div>
                                    </div>

                                    <div className={`te-regime-card ${recRegime === 'Old Regime' ? 'recommended' : ''}`}>
                                        {recRegime === 'Old Regime' && <div className="te-recommended-pill">Recommended</div>}
                                        <div className="te-regime-title">Old Tax Regime</div>
                                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Traditional Slabs with Chapter VI-A Deductions</span>
                                        <div className="te-tax-amount">₹{Number(calculationResult.old_regime.total_tax_liability).toLocaleString('en-IN')}</div>
                                        <div className="te-breakdown-list">
                                            <div className="te-breakdown-row"><span>Gross Income</span><span>₹{Number(calculationResult.old_regime.gross_income).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row"><span>Standard Deduction</span><span>- ₹{Number(calculationResult.old_regime.standard_deduction).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row"><span>Chapter VI-A Deductions</span><span>- ₹{Number(calculationResult.old_regime.total_chapter_vi_a_deductions).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row"><span>Net Taxable Income</span><span>₹{Number(calculationResult.old_regime.taxable_income).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row"><span>Tax on Slabs</span><span>₹{Number(calculationResult.old_regime.tax_on_income).toLocaleString('en-IN')}</span></div>
                                            {calculationResult.old_regime.rebate_87a > 0 && <div className="te-breakdown-row" style={{ color: 'var(--india-green)' }}><span>Section 87A Rebate</span><span>- ₹{Number(calculationResult.old_regime.rebate_87a).toLocaleString('en-IN')}</span></div>}
                                            {calculationResult.old_regime.surcharge > 0 && <div className="te-breakdown-row"><span>Surcharge</span><span>₹{Number(calculationResult.old_regime.surcharge).toLocaleString('en-IN')}</span></div>}
                                            <div className="te-breakdown-row"><span>Health & Education Cess (4%)</span><span>₹{Number(calculationResult.old_regime.health_and_education_cess).toLocaleString('en-IN')}</span></div>
                                            <div className="te-breakdown-row total"><span>Final Estimated Liability</span><span>₹{Number(calculationResult.old_regime.total_tax_liability).toLocaleString('en-IN')}</span></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Interactive What-If Scenario Workbench */}
                                <div id="te-whatif-workbench" className="te-card" style={{ marginBottom: '24px', border: '2px solid rgba(13, 27, 42, 0.12)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
                                                🔮 Interactive What-If Scenario Workbench
                                            </h3>
                                            <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px', marginBottom: 0 }}>
                                                Simulate tax impacts in real-time using the authoritative FinStack tax engine.
                                            </p>
                                        </div>
                                        <span className="te-non-mutate-pill">
                                            🔒 Zero Mutation Guarantee: Assessment remains untouched
                                        </span>
                                    </div>

                                    <div className="te-whatif-tabs">
                                        <button className={`te-whatif-tab ${whatIfType === 'salary_change' ? 'active' : ''}`} onClick={() => { setWhatIfType('salary_change'); runWhatIf('salary_change', { salary_change_amount: whatIfSalaryDelta }); }}>💼 Salary Change</button>
                                        <button className={`te-whatif-tab ${whatIfType === 'additional_deductions' ? 'active' : ''}`} onClick={() => { setWhatIfType('additional_deductions'); runWhatIf('additional_deductions', { additional_80c: whatIf80C, additional_80d: whatIf80D, forced_regime: 'OLD' }); }}>🛡️ Additional Deductions</button>
                                        <button className={`te-whatif-tab ${whatIfType === 'home_loan_interest' ? 'active' : ''}`} onClick={() => { setWhatIfType('home_loan_interest'); runWhatIf('home_loan_interest', { home_loan_interest: whatIfHomeLoan, forced_regime: 'OLD' }); }}>🏠 Home Loan Interest (Sec 24b)</button>
                                        <button className={`te-whatif-tab ${whatIfType === 'regime_switch' ? 'active' : ''}`} onClick={() => { setWhatIfType('regime_switch'); runWhatIf('regime_switch', {}); }}>🔄 Regime Switch</button>
                                    </div>

                                    <div className="te-whatif-controls-panel">
                                        {whatIfType === 'salary_change' && (
                                            <div>
                                                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '8px' }}>Simulated Gross Salary Adjustment:</label>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {[-50000, 50000, 100000, 200000, 300000, 500000].map((delta) => (
                                                        <button key={delta} type="button" className={`te-btn-pill ${whatIfSalaryDelta === delta ? 'active' : ''}`} onClick={() => { setWhatIfSalaryDelta(delta); runWhatIf('salary_change', { salary_change_amount: delta }); }}>
                                                            {delta > 0 ? `+₹${(delta / 1000).toLocaleString('en-IN')}k` : `-₹${(Math.abs(delta) / 1000).toLocaleString('en-IN')}k`}
                                                        </button>
                                                    ))}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Custom delta: ₹</span>
                                                        <input type="number" value={whatIfSalaryDelta} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setWhatIfSalaryDelta(val); runWhatIf('salary_change', { salary_change_amount: val }); }} style={{ width: '110px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {whatIfType === 'additional_deductions' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                                <div>
                                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>Simulated Section 80C Addition (Cap: ₹1.5L):</label>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input type="number" value={whatIf80C} max={150000} min={0} onChange={(e) => { const val = Math.min(150000, Math.max(0, parseFloat(e.target.value) || 0)); setWhatIf80C(val); runWhatIf('additional_deductions', { additional_80c: val, additional_80d: whatIf80D, forced_regime: 'OLD' }); }} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }} />
                                                        <button type="button" className="te-btn-pill" onClick={() => { setWhatIf80C(150000); runWhatIf('additional_deductions', { additional_80c: 150000, additional_80d: whatIf80D, forced_regime: 'OLD' }); }}>Max ₹1.5L</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>Simulated Section 80D Addition (Cap: ₹25k):</label>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input type="number" value={whatIf80D} max={25000} min={0} onChange={(e) => { const val = Math.min(25000, Math.max(0, parseFloat(e.target.value) || 0)); setWhatIf80D(val); runWhatIf('additional_deductions', { additional_80c: whatIf80C, additional_80d: val, forced_regime: 'OLD' }); }} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }} />
                                                        <button type="button" className="te-btn-pill" onClick={() => { setWhatIf80D(25000); runWhatIf('additional_deductions', { additional_80c: whatIf80C, additional_80d: 25000, forced_regime: 'OLD' }); }}>Max ₹25k</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {whatIfType === 'home_loan_interest' && (
                                            <div>
                                                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>Simulated Section 24(b) Housing Loan Interest (Self-occupied cap: ₹2,00,000):</label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '380px' }}>
                                                    <input type="number" value={whatIfHomeLoan} max={200000} min={0} onChange={(e) => { const val = Math.min(200000, Math.max(0, parseFloat(e.target.value) || 0)); setWhatIfHomeLoan(val); runWhatIf('home_loan_interest', { home_loan_interest: val, forced_regime: 'OLD' }); }} style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }} />
                                                    <button type="button" className="te-btn-pill" onClick={() => { setWhatIfHomeLoan(200000); runWhatIf('home_loan_interest', { home_loan_interest: 200000, forced_regime: 'OLD' }); }}>Max ₹2.0L</button>
                                                </div>
                                            </div>
                                        )}

                                        {whatIfType === 'regime_switch' && (
                                            <div>
                                                <div style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: '1.5', marginBottom: '10px' }}>Direct statutory comparison between <strong>New Tax Regime (Section 115BAC)</strong> and <strong>Old Tax Regime</strong> under your current declared numbers.</div>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button type="button" className={`te-btn-pill ${whatIfForcedRegime === null ? 'active' : ''}`} onClick={() => { setWhatIfForcedRegime(null); runWhatIf('regime_switch', { forced_regime: null }); }}>Automatic Alternate</button>
                                                    <button type="button" className={`te-btn-pill ${whatIfForcedRegime === 'NEW' ? 'active' : ''}`} onClick={() => { setWhatIfForcedRegime('NEW'); runWhatIf('regime_switch', { forced_regime: 'NEW' }); }}>Force New Regime</button>
                                                    <button type="button" className={`te-btn-pill ${whatIfForcedRegime === 'OLD' ? 'active' : ''}`} onClick={() => { setWhatIfForcedRegime('OLD'); runWhatIf('regime_switch', { forced_regime: 'OLD' }); }}>Force Old Regime</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {whatIfResult ? (
                                        <div style={{ marginTop: '20px' }}>
                                            <div className="te-whatif-delta-banner">
                                                <div>
                                                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', fontWeight: '700' }}>{whatIfResult.scenario_title} · Impact Analysis</div>
                                                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)', marginTop: '4px' }}>{whatIfResult.delta.summary_sentence}</div>
                                                </div>
                                                <div className={`te-whatif-delta-pill ${whatIfResult.delta.tax_difference > 0 ? 'pill-save' : whatIfResult.delta.tax_difference < 0 ? 'pill-tax' : 'pill-neutral'}`}>
                                                    {whatIfResult.delta.tax_difference > 0 ? `Saves ₹${Number(whatIfResult.delta.tax_difference).toLocaleString('en-IN')}` : whatIfResult.delta.tax_difference < 0 ? `+₹${Number(Math.abs(whatIfResult.delta.tax_difference)).toLocaleString('en-IN')} Tax` : '₹0 Change'}
                                                </div>
                                            </div>

                                            <div className="te-whatif-grid">
                                                <div className="te-whatif-card current">
                                                    <div className="te-whatif-card-badge current">CURRENT ASSESSMENT</div>
                                                    <h4 className="te-whatif-regime-title">{whatIfResult.current.regime_name}</h4>
                                                    <div className="te-whatif-tax">₹{Number(whatIfResult.current.total_tax).toLocaleString('en-IN')}</div>
                                                    <div className="te-whatif-effective">Effective Rate: {whatIfResult.current.effective_tax_rate}%</div>
                                                    <div className="te-whatif-rows">
                                                        <div className="te-whatif-row"><span>Gross Income:</span><span>₹{Number(whatIfResult.current.gross_income).toLocaleString('en-IN')}</span></div>
                                                        <div className="te-whatif-row"><span>Standard Deduction:</span><span>- ₹{Number(whatIfResult.current.standard_deduction).toLocaleString('en-IN')}</span></div>
                                                        <div className="te-whatif-row"><span>Deductions Claimed:</span><span>- ₹{Number(whatIfResult.current.total_deductions).toLocaleString('en-IN')}</span></div>
                                                        <div className="te-whatif-row"><span>Net Taxable Income:</span><span>₹{Number(whatIfResult.current.taxable_income).toLocaleString('en-IN')}</span></div>
                                                    </div>
                                                </div>

                                                <div className="te-whatif-card scenario">
                                                    <div className="te-whatif-card-badge scenario">SCENARIO PROJECTION</div>
                                                    <h4 className="te-whatif-regime-title">{whatIfResult.scenario.regime_name}</h4>
                                                    <div className="te-whatif-tax" style={{ color: whatIfResult.delta.tax_difference > 0 ? 'var(--india-green)' : 'var(--navy)' }}>₹{Number(whatIfResult.scenario.total_tax).toLocaleString('en-IN')}</div>
                                                    <div className="te-whatif-effective">Effective Rate: {whatIfResult.scenario.effective_tax_rate}%</div>
                                                    <div className="te-whatif-rows">
                                                        <div className="te-whatif-row"><span>Gross Income:</span><span>₹{Number(whatIfResult.scenario.gross_income).toLocaleString('en-IN')}</span></div>
                                                        <div className="te-whatif-row"><span>Standard Deduction:</span><span>- ₹{Number(whatIfResult.scenario.standard_deduction).toLocaleString('en-IN')}</span></div>
                                                        <div className="te-whatif-row"><span>Deductions Considered:</span><span>- ₹{Number(whatIfResult.scenario.total_deductions).toLocaleString('en-IN')}</span></div>
                                                        <div className="te-whatif-row"><span>Net Taxable Income:</span><span>₹{Number(whatIfResult.scenario.taxable_income).toLocaleString('en-IN')}</span></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {whatIfResult.delta.explanation_points && whatIfResult.delta.explanation_points.length > 0 && (
                                                <div className="te-whatif-reasons">
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', marginBottom: '6px' }}>Why This Difference Occurs:</div>
                                                    {whatIfResult.delta.explanation_points.map((pt, pIdx) => (
                                                        <div key={pIdx} className="te-whatif-reason-item"><span>•</span><span>{pt}</span></div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text3)' }}>
                                            {simulatingWhatIf ? 'Running what-if calculation through tax engine...' : 'Adjust scenario controls above to project simulated tax outcomes.'}
                                        </div>
                                    )}
                                </div>

                                {/* Trust & Data Provenance */}
                                {calculationResult.trust_metadata && (
                                    <div className="te-trust-card">
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', marginBottom: '4px' }}>🛡️ Trust & Data Provenance</h3>
                                        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>Full audit trail of information sources, user overrides, statutory assumptions, and missing fields.</p>

                                        <div className="te-trust-grid">
                                            <div className="te-trust-section">
                                                <div className="te-trust-section-title"><span>📌 Data Sources Used</span></div>
                                                <div className="te-provenance-list">
                                                    {Object.entries(calculationResult.trust_metadata.data_sources).map(([field, src]) => (
                                                        <div key={field} className="te-provenance-row">
                                                            <span style={{ textTransform: 'capitalize' }}>{field.replace(/_/g, ' ')}:</span>
                                                            {renderProvenanceBadge(src)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="te-trust-section">
                                                <div className="te-trust-section-title"><span>✏️ User Overrides & Status</span></div>
                                                {calculationResult.trust_metadata.user_overrides?.length > 0 ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                                        {calculationResult.trust_metadata.user_overrides.map((ov, i) => (
                                                            <span key={i} className="te-badge te-badge-user">Overridden: {ov.replace(/_/g, ' ')}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '0 0 12px 0' }}>No profile defaults were overridden.</p>
                                                )}

                                                <div className="te-trust-section-title" style={{ marginTop: '12px' }}><span>⚠️ Missing / Incomplete Items</span></div>
                                                {calculationResult.trust_metadata.missing_information?.length > 0 ? (
                                                    <ul className="te-assumptions-list">
                                                        {calculationResult.trust_metadata.missing_information.map((msg, i) => <li key={i}>{msg}</li>)}
                                                    </ul>
                                                ) : (
                                                    <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: 0 }}>All relevant inputs were declared.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </main>
            </div>

            {/* Floating Action Button (Only show on step 0) */}
            {step === 0 && (
                <button className="te-floating-chat-btn" onClick={handleStartInterview}>
                    <span className="chat-icon">🤖</span>
                    Start AI Tax Interview
                </button>
            )}
        </div>
    );
}