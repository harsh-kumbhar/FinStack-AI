import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taxEstimatorService } from '../services/taxEstimatorService';
import '../styles/taxEstimator.css';

// Project sidebar navigation items matching Dashboard.jsx
const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Document Intelligence', soon: true },
    { label: 'Loan Risk Assessment', soon: true },
    { label: 'Tax Estimator', path: '/tax-estimator', active: true },
    { label: 'Investment Advisor', soon: true },
    { label: 'Settings', soon: true },
];

export default function TaxEstimator() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // ── State Management ──
    // Step 0: Landing, 1: Basic Profile, 2: Income, 3: Housing/Rent, 4: Deductions, 5: Review/Missing Info, 6: Results, 7: History
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(false);
    const [error, setError] = useState(null);
    const [flowExpanded, setFlowExpanded] = useState(true);

    // Form inputs state
    const [formData, setFormData] = useState({
        financial_year: '2024-25',
        age: 30,
        residential_status: 'resident',
        employment_type: 'salaried',
        gross_salary: 0,
        other_income: 0,
        // Housing conditionals
        pays_rent: false,
        annual_rent: 0,
        has_home_loan: false,
        home_loan_principal: 0,
        home_loan_interest: 0,
        // Deduction conditionals
        has_80c: false,
        deduction_80c: 0,
        has_80d: false,
        deduction_80d: 0,
        has_80tta: false,
        deduction_80tta: 0,
    });

    // Provenance tracker for each field
    const [fieldSources, setFieldSources] = useState({
        gross_salary: { source: 'DEFAULT', notes: 'Default 0.0' },
        age: { source: 'DEFAULT', notes: 'Default age 30' },
        deduction_80c: { source: 'DEFAULT', notes: 'Default 0.0' },
        deduction_80d: { source: 'DEFAULT', notes: 'Default 0.0' },
        deduction_80tta: { source: 'DEFAULT', notes: 'Default 0.0' },
    });

    // Missing information check state
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [missingItems, setMissingItems] = useState([]);

    // Calculation result state
    const [calculationResult, setCalculationResult] = useState(null);

    // ── What-If Scenario Simulator State (Module 5) ──
    const [whatIfType, setWhatIfType] = useState('salary_change'); // 'salary_change', 'additional_deductions', 'home_loan_interest', 'regime_switch'
    const [whatIfSalaryDelta, setWhatIfSalaryDelta] = useState(100000);
    const [whatIf80C, setWhatIf80C] = useState(50000);
    const [whatIf80D, setWhatIf80D] = useState(15000);
    const [whatIfHomeLoan, setWhatIfHomeLoan] = useState(200000);
    const [whatIfForcedRegime, setWhatIfForcedRegime] = useState(null);
    const [whatIfResult, setWhatIfResult] = useState(null);
    const [simulatingWhatIf, setSimulatingWhatIf] = useState(false);

    // History state
    const [historyList, setHistoryList] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // ── Module 7: History & Comparison State ──
    const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);
    const [comparisonResult, setComparisonResult] = useState(null);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [loadingComparison, setLoadingComparison] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [recalculatingId, setRecalculatingId] = useState(null);
    const [journeyMilestone, setJourneyMilestone] = useState(null);

    // ── Module 7: Document Vault Boundary State ──
    const [showDocReviewModal, setShowDocReviewModal] = useState(false);
    const [stagedDocPayload, setStagedDocPayload] = useState(null);
    const [docDecisions, setDocDecisions] = useState({});
    const [confirmingDoc, setConfirmingDoc] = useState(false);
    const [docAuditTrail, setDocAuditTrail] = useState(null);

    // ── Module 6: Tax Education & Learn Hub State ──
    const [showLearnModal, setShowLearnModal] = useState(false);
    const [educationData, setEducationData] = useState(null);
    const [loadingEducation, setLoadingEducation] = useState(false);
    const [activeLearnTab, setActiveLearnTab] = useState('overview');
    const [glossarySearch, setGlossarySearch] = useState('');
    const [glossaryCategory, setGlossaryCategory] = useState('ALL');

    const handleOpenLearnModal = async (tab = null) => {
        if (tab) setActiveLearnTab(tab);
        setShowLearnModal(true);
        const fy = formData.financial_year || '2024-25';
        if (!educationData || educationData.financial_year !== fy) {
            setLoadingEducation(true);
            try {
                const data = await taxEstimatorService.getTaxEducation(fy);
                setEducationData(data);
            } catch (err) {
                console.error('Tax Estimator: Failed to load tax education rules.', err);
            } finally {
                setLoadingEducation(false);
            }
        }
    };

    // ── Load FinStack Profile Defaults on Mount ──
    useEffect(() => {
        const loadDefaults = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const data = await taxEstimatorService.getProfileDefaults('2024-25');

                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        age: data.age || 30,
                        gross_salary: data.gross_salary || 0,
                        other_income: data.other_income || 0,
                        deduction_80c: data.deduction_80c || 0,
                        deduction_80d: data.deduction_80d || 0,
                        deduction_80tta: data.deduction_80tta || 0,
                    }));

                    if (data.field_sources) {
                        setFieldSources(data.field_sources);
                    }
                }
            } catch (err) {
                console.error('Failed to load profile defaults:', err);
            } finally {
                setLoading(false);
            }
        };

        loadDefaults();
    }, [user]);

    // ── Input Change Handler with Provenance Tracking ──
    const handleInputChange = (field, value) => {
        const numValue = value === '' ? 0 : Math.max(0, parseFloat(value) || 0);
        setFormData(prev => ({ ...prev, [field]: numValue }));

        // Mark field provenance as USER_ENTERED upon manual override
        setFieldSources(prev => ({
            ...prev,
            [field]: {
                source: 'USER_ENTERED',
                notes: 'Directly entered or modified by user'
            }
        }));
    };

    // ── Conditional Toggles ──
    const handleToggle = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (!value) {
            // Reset relevant sub-fields if toggled to No
            if (field === 'pays_rent') setFormData(prev => ({ ...prev, annual_rent: 0 }));
            if (field === 'has_home_loan') setFormData(prev => ({ ...prev, home_loan_principal: 0, home_loan_interest: 0 }));
            if (field === 'has_80c') setFormData(prev => ({ ...prev, deduction_80c: 0 }));
            if (field === 'has_80d') setFormData(prev => ({ ...prev, deduction_80d: 0 }));
            if (field === 'has_80tta') setFormData(prev => ({ ...prev, deduction_80tta: 0 }));
        }
    };

    // ── Missing Information Detection ──
    const detectMissingInformation = () => {
        const missing = [];

        if (formData.gross_salary <= 0) {
            missing.push({
                field: 'Gross Salary',
                stepTarget: 2,
                message: 'Gross annual salary is currently ₹0. Enter your salary to receive an accurate estimate.'
            });
        }

        if (formData.pays_rent && formData.annual_rent <= 0) {
            missing.push({
                field: 'Rent Paid',
                stepTarget: 3,
                message: 'You indicated that you pay rent, but annual rent paid is ₹0.'
            });
        }

        if (formData.has_80c && formData.deduction_80c <= 0) {
            missing.push({
                field: 'Section 80C Investments',
                stepTarget: 4,
                message: 'You indicated having eligible investments, but Section 80C is ₹0.'
            });
        }

        if (!formData.has_80c && formData.deduction_80c <= 0) {
            missing.push({
                field: 'Tax Deductions (80C / 80D)',
                stepTarget: 4,
                message: 'No deductions entered. If you made eligible investments, you can lower Old Regime liability.'
            });
        }

        return missing;
    };

    // ── Calculation Trigger ──
    const handlePreCalculationCheck = () => {
        const missing = detectMissingInformation();
        if (missing.length > 0) {
            setMissingItems(missing);
            setShowMissingModal(true);
        } else {
            executeCalculation();
        }
    };

    const executeCalculation = async () => {
        setShowMissingModal(false);
        setCalculating(true);
        setError(null);

        try {
            const sourcesMap = {};
            Object.keys(fieldSources).forEach((key) => {
                sourcesMap[key] = fieldSources[key]?.source || 'USER_ENTERED';
            });
            const overrides = Object.keys(fieldSources).filter(
                (k) => fieldSources[k]?.source === 'USER_ENTERED'
            );
            const missing = missingItems.map((m) => `${m.field}: ${m.message}`);

            const payload = {
                financial_year: formData.financial_year,
                gross_salary: formData.gross_salary,
                other_income: formData.other_income,
                deduction_80c: formData.deduction_80c,
                deduction_80d: formData.deduction_80d,
                deduction_80tta: formData.deduction_80tta,
                home_loan_interest: formData.home_loan_interest || 0,
                field_sources: sourcesMap,
                user_overrides: overrides,
                missing_fields: missing,
            };

            const result = await taxEstimatorService.calculateTax(payload);
            setCalculationResult(result);
            setStep(6); // Move to results view
            // Automatically initialize live What-If workbench with salary change simulation
            runWhatIf('salary_change', { salary_change_amount: 100000 }, result);
        } catch (err) {
            setError(err.response?.data?.detail || 'Calculation failed. Please check inputs and try again.');
        } finally {
            setCalculating(false);
        }
    };

    // ── What-If Simulation Runner (Module 5) ──
    const runWhatIf = async (overrideType, overrides = {}, activeResult = null) => {
        const baseResult = activeResult || calculationResult;
        if (!baseResult) return;
        setSimulatingWhatIf(true);
        const sType = overrideType || whatIfType;
        try {
            const baseInput = {
                financial_year: formData.financial_year || '2024-25',
                gross_salary: parseFloat(formData.gross_salary || 0),
                other_income: parseFloat(formData.other_income || 0),
                deduction_80c: parseFloat(formData.deduction_80c || 0),
                deduction_80d: parseFloat(formData.deduction_80d || 0),
                deduction_80tta: parseFloat(formData.deduction_80tta || 0),
                home_loan_interest: parseFloat(formData.home_loan_interest || 0),
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

    // ── Module 7: History Handlers ──
    const handleOpenHistory = async () => {
        setLoadingHistory(true);
        setStep(7);
        try {
            const [history, milestone] = await Promise.all([
                taxEstimatorService.getHistory(),
                taxEstimatorService.getJourneyMilestone(),
            ]);
            setHistoryList(history);
            setJourneyMilestone(milestone);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleToggleSelectHistory = (id) => {
        setSelectedHistoryIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((x) => x !== id);
            }
            if (prev.length >= 2) {
                return [prev[1], id];
            }
            return [...prev, id];
        });
    };

    const handleCompareSelected = async () => {
        if (selectedHistoryIds.length !== 2) return;
        setLoadingComparison(true);
        setShowComparisonModal(true);
        try {
            const res = await taxEstimatorService.compareAssessments(
                selectedHistoryIds[0],
                selectedHistoryIds[1]
            );
            setComparisonResult(res);
        } catch (err) {
            console.error('Failed to compare assessments:', err);
            alert('Failed to compare assessments. Please ensure both belong to your account.');
            setShowComparisonModal(false);
        } finally {
            setLoadingComparison(false);
        }
    };

    const handleViewDetail = async (id) => {
        setLoadingDetail(true);
        setShowDetailModal(true);
        try {
            const detail = await taxEstimatorService.getAssessmentDetail(id);
            setSelectedDetail(detail);
        } catch (err) {
            console.error('Failed to load assessment detail:', err);
            alert('Failed to load assessment detail.');
            setShowDetailModal(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleRecalculate = async (id) => {
        setRecalculatingId(id);
        try {
            const newAssessment = await taxEstimatorService.recalculateAssessment(id);
            const [history, milestone] = await Promise.all([
                taxEstimatorService.getHistory(),
                taxEstimatorService.getJourneyMilestone(),
            ]);
            setHistoryList(history);
            setJourneyMilestone(milestone);
            setCalculationResult(newAssessment);
            setStep(6);
        } catch (err) {
            console.error('Failed to recalculate assessment:', err);
            alert('Failed to recalculate assessment. Please try again.');
        } finally {
            setRecalculatingId(null);
        }
    };

    // ── Module 7: Document Vault Boundary Handlers ──
    const handleOpenDocReview = async () => {
        const initialPayload = {
            document_id: 'doc_form16_' + Date.now().toString().slice(-6),
            document_type: 'FORM_16',
            document_name: 'Form 16 - FY 2024-25 (Part B).pdf',
            financial_year: formData.financial_year || '2024-25',
            extracted_fields: [
                {
                    field_name: 'gross_salary',
                    extracted_value: 1250000,
                    extraction_confidence: 0.96,
                    source_clause: 'Clause 17(1) - Gross Salary as per section 17(1)',
                    is_confirmed: false,
                    review_status: 'PENDING_USER_REVIEW'
                },
                {
                    field_name: 'deduction_80c',
                    extracted_value: 150000,
                    extraction_confidence: 0.94,
                    source_clause: 'Clause 10(a) - Deductions in respect of life insurance premia, contributions to PF etc.',
                    is_confirmed: false,
                    review_status: 'PENDING_USER_REVIEW'
                },
                {
                    field_name: 'deduction_80d',
                    extracted_value: 25000,
                    extraction_confidence: 0.91,
                    source_clause: 'Clause 10(d) - Deductions in respect of health insurance premia (Section 80D)',
                    is_confirmed: false,
                    review_status: 'PENDING_USER_REVIEW'
                },
                {
                    field_name: 'deduction_80tta',
                    extracted_value: 10000,
                    extraction_confidence: 0.88,
                    source_clause: 'Clause 10(l) - Interest on deposits in savings accounts (Section 80TTA)',
                    is_confirmed: false,
                    review_status: 'PENDING_USER_REVIEW'
                }
            ],
            is_user_confirmed: false,
            disclaimer: 'Document extracted values are unconfirmed drafts. A human user must review and confirm or override all figures before they can become trusted tax inputs.'
        };

        try {
            const staged = await taxEstimatorService.stageDocumentData(initialPayload);
            setStagedDocPayload(staged);
            const defaultDecisions = {};
            staged.extracted_fields.forEach((f) => {
                defaultDecisions[f.field_name] = {
                    action: 'ACCEPT',
                    confirmed_value: f.extracted_value,
                    rejection_reason: ''
                };
            });
            setDocDecisions(defaultDecisions);
            setShowDocReviewModal(true);
        } catch (err) {
            console.error('Failed to stage document data:', err);
            alert('Failed to initialize document review boundary.');
        }
    };

    const handleDocDecisionChange = (fieldName, action, extra = {}) => {
        setDocDecisions((prev) => ({
            ...prev,
            [fieldName]: {
                ...prev[fieldName],
                action,
                ...extra
            }
        }));
    };

    const handleConfirmDocReview = async () => {
        if (!stagedDocPayload) return;
        setConfirmingDoc(true);
        try {
            const confirmationReq = {
                document_id: stagedDocPayload.document_id,
                decisions: docDecisions,
                staged_payload: stagedDocPayload
            };
            const result = await taxEstimatorService.confirmDocumentReview(confirmationReq);

            const norm = result.normalized_tax_input;
            setFormData((prev) => ({
                ...prev,
                gross_salary: norm.gross_salary || 0,
                other_income: norm.other_income || 0,
                deduction_80c: norm.deduction_80c || 0,
                deduction_80d: norm.deduction_80d || 0,
                deduction_80tta: norm.deduction_80tta || 0,
                has_80c: (norm.deduction_80c || 0) > 0,
                has_80d: (norm.deduction_80d || 0) > 0,
                has_80tta: (norm.deduction_80tta || 0) > 0,
            }));

            if (norm.field_sources) {
                setFieldSources((prev) => ({
                    ...prev,
                    ...norm.field_sources
                }));
            }

            setDocAuditTrail(result.audit_trail || []);
            setShowDocReviewModal(false);
            setStep(1);
        } catch (err) {
            console.error('Failed to confirm document review:', err);
            alert('Document review confirmation failed: ' + (err.response?.data?.detail || err.message));
        } finally {
            setConfirmingDoc(false);
        }
    };


    // ── Badge Renderer ──
    const renderSourceBadge = (fieldName) => {
        const sourceMeta = fieldSources[fieldName];
        if (!sourceMeta) return null;

        const source = sourceMeta.source;
        if (source === 'FINSTACK_PROFILE') {
            return (
                <span className="te-badge te-badge-profile" title={sourceMeta.notes || 'From FinStack profile'}>
                    ● FinStack Profile
                </span>
            );
        }
        if (source === 'USER_ENTERED') {
            return (
                <span className="te-badge te-badge-user" title="Directly entered or modified by user">
                    ● User Entered
                </span>
            );
        }
        if (source === 'DOCUMENT_EXTRACTED') {
            return (
                <span className="te-badge te-badge-doc" title="Extracted from tax document">
                    ● Document Extracted
                </span>
            );
        }
        return (
            <span className="te-badge te-badge-default" title="Default fallback value">
                Default
            </span>
        );
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

    return (
        <div className="te-layout">
            {/* ── Sidebar ── */}
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
                            onClick={() => !item.soon && navigate(item.path)}
                            style={{
                                padding: '12px 20px', display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center', cursor: item.soon ? 'default' : 'pointer',
                                opacity: item.soon ? 0.5 : 1,
                                backgroundColor: item.active ? 'var(--navy2)' : 'transparent',
                                borderLeft: item.active ? '4px solid var(--saffron)' : '4px solid transparent',
                                color: 'var(--white)', fontSize: '14px', transition: 'var(--transition)'
                            }}
                        >
                            <span>{item.label}</span>
                            {item.soon && (
                                <span style={{
                                    fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.2)',
                                    padding: '2px 6px', borderRadius: '4px'
                                }}>SOON</span>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* ── Main Area ── */}
            <div className="te-main">
                {/* Topbar */}
                <header className="te-topbar">
                    <div style={{ fontWeight: '600', color: 'var(--navy)', fontSize: '15px' }}>
                        Income Tax Estimator · FY 2024-25
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text2)' }}>
                            {user?.email}
                        </span>
                        <button
                            onClick={logout}
                            style={{
                                padding: '6px 14px', backgroundColor: 'var(--error-light)',
                                color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-sm)',
                                fontWeight: '600', cursor: 'pointer'
                            }}
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="te-content">
                    {/* Header */}
                    <div className="te-header">
                        <div>
                            <h1 className="te-title">Tax Estimator & Regime Advisor</h1>
                            <p className="te-subtitle">
                                Compare Old vs. New Tax Regime liabilities with authoritative rules for FY 2024-25.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                className="te-btn-secondary"
                                onClick={() => handleOpenLearnModal()}
                            >
                                📚 Tax Guide & Learn
                            </button>
                            {step !== 7 ? (
                                <button className="te-btn-secondary" onClick={handleOpenHistory}>
                                    Past Estimates
                                </button>
                            ) : (
                                <button className="te-btn-secondary" onClick={() => setStep(0)}>
                                    Back to Estimator
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stepper Navigation (visible during input flow steps 1 to 4) */}
                    {step >= 1 && step <= 4 && (
                        <div className="te-stepper">
                            {[
                                { num: 1, title: 'Profile' },
                                { num: 2, title: 'Income' },
                                { num: 3, title: 'Housing' },
                                { num: 4, title: 'Deductions' },
                            ].map((s) => (
                                <React.Fragment key={s.num}>
                                    <div
                                        className={`te-step-item ${step === s.num ? 'active' : ''} ${step > s.num ? 'completed' : ''}`}
                                        onClick={() => setStep(s.num)}
                                    >
                                        <div className="te-step-circle">
                                            {step > s.num ? '✓' : s.num}
                                        </div>
                                        <div className="te-step-label">{s.title}</div>
                                    </div>
                                    {s.num < 4 && <div className="te-step-divider" />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {/* Error Banner */}
                    {error && (
                        <div style={{
                            backgroundColor: 'var(--error-light)', border: '1px solid var(--error)',
                            color: 'var(--error)', padding: '14px 18px', borderRadius: 'var(--radius-md)',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        STEP 0: CLEAN LANDING & TRUSTED ENTRY
                        ══════════════════════════════════════════════════ */}
                    {step === 0 && (
                        <div className="te-landing-hero">
                            <div className="te-landing-banner">
                                <h2 className="te-landing-title">Smart, Transparent Tax Estimation</h2>
                                <p className="te-landing-desc">
                                    Understand your tax obligations under Indian tax laws for FY 2024-25 (AY 2025-26).
                                    Compare Old and New Tax Regimes side-by-side to identify your optimal tax path.
                                </p>
                                <div style={{ marginTop: '24px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                    <button className="te-btn-primary" onClick={() => setStep(1)}>
                                        Start Assessment →
                                    </button>
                                    <button
                                        style={{
                                            padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.15)',
                                            color: 'var(--white)', border: '1px solid rgba(255,255,255,0.3)',
                                            borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer'
                                        }}
                                        onClick={() => handleOpenLearnModal()}
                                    >
                                        📚 Learn Tax Rules
                                    </button>
                                    <button
                                        style={{
                                            padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.15)',
                                            color: 'var(--white)', border: '1px solid rgba(255,255,255,0.3)',
                                            borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer'
                                        }}
                                        onClick={handleOpenHistory}
                                    >
                                        View History
                                    </button>
                                    <button
                                        style={{
                                            padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.15)',
                                            color: 'var(--white)', border: '1px solid rgba(255,255,255,0.3)',
                                            borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer'
                                        }}
                                        onClick={handleOpenDocReview}
                                    >
                                        📄 Document Vault Review (Form 16)
                                    </button>
                                </div>
                            </div>

                            {/* Reuse Notice Banner */}
                            <div className="te-reuse-notice">
                                <div style={{ fontSize: '20px' }}>⚡</div>
                                <div className="te-reuse-text">
                                    <strong>Seamless FinStack Data Reuse:</strong> {loading ? 'Syncing your verified profile defaults...' : 'We automatically pre-populate your verified profile information (such as age and monthly income) to save you time. You have complete control to review or override every value before calculating. Overrides will not alter your permanent FinStack profile.'}
                                </div>
                            </div>

                            {/* Features Grid */}
                            <div className="te-features-grid">
                                <div className="te-feature-card">
                                    <div className="te-feature-icon">⚖️</div>
                                    <div className="te-feature-title">Dual Regime Comparison</div>
                                    <div className="te-feature-text">
                                        Calculates liabilities under both Old and New Tax Regimes, including Section 87A rebate and marginal relief.
                                    </div>
                                </div>
                                <div className="te-feature-card">
                                    <div className="te-feature-icon">🛡️</div>
                                    <div className="te-feature-title">Authoritative Engine</div>
                                    <div className="te-feature-text">
                                        Deterministic, verified Income Tax Department rules. No ML guesses or arbitrary calculations.
                                    </div>
                                </div>
                                <div className="te-feature-card">
                                    <div className="te-feature-icon">🔍</div>
                                    <div className="te-feature-title">Transparent Provenance</div>
                                    <div className="te-feature-text">
                                        Every field explicitly shows whether it came from your FinStack profile, a document, or manual entry.
                                    </div>
                                </div>
                                <div
                                    className="te-feature-card"
                                    style={{ cursor: 'pointer', borderColor: '#93C5FD' }}
                                    onClick={() => handleOpenLearnModal()}
                                >
                                    <div className="te-feature-icon">📚</div>
                                    <div className="te-feature-title">Tax Education Hub</div>
                                    <div className="te-feature-text">
                                        Explore the FY calendar (April 1 – March 31), visual calculation funnels, and glossary of all 12 statutory terms.
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        STEP 1: BASIC PROFILE
                        ══════════════════════════════════════════════════ */}
                    {step === 1 && (
                        <div className="te-card">
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                                Step 1: Taxpayer Profile
                            </h2>
                            <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '24px' }}>
                                Define the tax year, age, and filing status for applicable deduction limits.
                            </p>

                            {docAuditTrail && docAuditTrail.length > 0 && (
                                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13px', color: '#065F46' }}>
                                    <strong>✓ Document Ingestion Audit Trail:</strong>
                                    <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px' }}>
                                        {docAuditTrail.map((item, idx) => (
                                            <li key={idx}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="te-form-group">
                                <label className="te-label">Financial Year (Assessment Year)</label>
                                <input
                                    type="text"
                                    className="te-input te-input-no-prefix"
                                    value="FY 2024-25 (AY 2025-26)"
                                    disabled
                                    style={{ backgroundColor: 'var(--bg2)', cursor: 'not-allowed' }}
                                />
                                <span className="te-helper">
                                    Authoritative rules for the current financial year under Finance Act 2024.
                                </span>
                            </div>

                            <div className="te-form-group">
                                <div className="te-label-row">
                                    <label className="te-label">Taxpayer Age</label>
                                    {renderSourceBadge('age')}
                                </div>
                                <input
                                    type="number"
                                    className="te-input te-input-no-prefix"
                                    value={formData.age}
                                    onChange={(e) => handleInputChange('age', e.target.value)}
                                    min="0"
                                    max="120"
                                />
                                <span className="te-helper">
                                    {fieldSources.age?.notes || 'Age is used to determine senior citizen slab benefits in the Old Regime.'}
                                </span>
                            </div>

                            <div className="te-form-group">
                                <label className="te-label">Employment / Income Type</label>
                                <select
                                    className="te-input te-input-no-prefix"
                                    value={formData.employment_type}
                                    onChange={(e) => setFormData(prev => ({ ...prev, employment_type: e.target.value }))}
                                >
                                    <option value="salaried">Salaried Individual (Standard deduction applies)</option>
                                    <option value="freelancer">Freelancer / Professional (Presumptive 44ADA)</option>
                                    <option value="business">Business Owner (Section 44AD)</option>
                                </select>
                            </div>

                            <div className="te-actions-row">
                                <button className="te-btn-secondary" onClick={() => setStep(0)}>
                                    ← Back
                                </button>
                                <button className="te-btn-primary" onClick={() => setStep(2)}>
                                    Continue to Income →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        STEP 2: INCOME
                        ══════════════════════════════════════════════════ */}
                    {step === 2 && (
                        <div className="te-card">
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                                Step 2: Annual Income Details
                            </h2>
                            <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '24px' }}>
                                Enter your gross income from salary and any other taxable sources.
                            </p>

                            <div className="te-form-group">
                                <div className="te-label-row">
                                    <label className="te-label">Annual Gross Salary</label>
                                    {renderSourceBadge('gross_salary')}
                                </div>
                                <div className="te-input-wrapper">
                                    <span className="te-input-prefix">₹</span>
                                    <input
                                        type="number"
                                        className="te-input"
                                        value={formData.gross_salary || ''}
                                        onChange={(e) => handleInputChange('gross_salary', e.target.value)}
                                        placeholder="e.g. 1200000"
                                    />
                                </div>
                                <span className="te-helper te-helper-annualized">
                                    {fieldSources.gross_salary?.notes || 'Total earnings before standard deduction or EPF.'}
                                </span>
                            </div>

                            <div className="te-form-group">
                                <div className="te-label-row">
                                    <label className="te-label">Other Taxable Income</label>
                                    {renderSourceBadge('other_income')}
                                </div>
                                <div className="te-input-wrapper">
                                    <span className="te-input-prefix">₹</span>
                                    <input
                                        type="number"
                                        className="te-input"
                                        value={formData.other_income || ''}
                                        onChange={(e) => handleInputChange('other_income', e.target.value)}
                                        placeholder="e.g. 25000"
                                    />
                                </div>
                                <span className="te-helper">
                                    Include savings interest, fixed deposit interest, dividends, or freelance side income.
                                </span>
                            </div>

                            <div className="te-actions-row">
                                <button className="te-btn-secondary" onClick={() => setStep(1)}>
                                    ← Back
                                </button>
                                <button className="te-btn-primary" onClick={() => setStep(3)}>
                                    Continue to Housing →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        STEP 3: HOUSING & RENT (PROGRESSIVE / CONDITIONAL)
                        ══════════════════════════════════════════════════ */}
                    {step === 3 && (
                        <div className="te-card">
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                                Step 3: Housing & Real Estate
                            </h2>
                            <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '24px' }}>
                                Tell us about your living situation to evaluate regime-specific housing deductions.
                            </p>

                            {/* Conditional: Rent Paid */}
                            <div className={`te-cond-card ${formData.pays_rent ? 'active' : ''}`}>
                                <div className="te-cond-header" onClick={() => handleToggle('pays_rent', !formData.pays_rent)}>
                                    <span className="te-cond-title">Do you live in rented accommodation and pay rent?</span>
                                    <div className="te-toggle-group">
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${formData.pays_rent ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('pays_rent', true); }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${!formData.pays_rent ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('pays_rent', false); }}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                {formData.pays_rent && (
                                    <div className="te-cond-content">
                                        <div className="te-form-group">
                                            <label className="te-label">Total Annual Rent Paid</label>
                                            <div className="te-input-wrapper">
                                                <span className="te-input-prefix">₹</span>
                                                <input
                                                    type="number"
                                                    className="te-input"
                                                    value={formData.annual_rent || ''}
                                                    onChange={(e) => handleInputChange('annual_rent', e.target.value)}
                                                    placeholder="e.g. 180000"
                                                />
                                            </div>
                                        </div>
                                        <div className="te-rule-badge-box">
                                            ℹ️ <strong>Regime Rule Notice:</strong> HRA exemption (Section 10(13A)) is an <strong>Old Regime only</strong> benefit.
                                            The New Tax Regime (default for FY 2024-25) does not allow HRA exemption deductions.
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conditional: Home Loan */}
                            <div className={`te-cond-card ${formData.has_home_loan ? 'active' : ''}`}>
                                <div className="te-cond-header" onClick={() => handleToggle('has_home_loan', !formData.has_home_loan)}>
                                    <span className="te-cond-title">Do you have a home loan on a self-occupied property?</span>
                                    <div className="te-toggle-group">
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${formData.has_home_loan ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_home_loan', true); }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${!formData.has_home_loan ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_home_loan', false); }}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                {formData.has_home_loan && (
                                    <div className="te-cond-content">
                                        <div className="te-rule-badge-box">
                                            🏡 <strong>Home Loan Tax Rules (FY 2024-25):</strong>
                                            <ul style={{ paddingLeft: '18px', marginTop: '6px' }}>
                                                <li><strong>Principal Repayment:</strong> Eligible under Section 80C (up to ₹1,50,000 overall limit in Old Regime). You can include this in Section 80C next.</li>
                                                <li><strong>Interest Repayment (Section 24b):</strong> Eligible up to ₹2,00,000 under Old Regime only. In the New Regime, interest on self-occupied property cannot be deducted.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="te-actions-row">
                                <button className="te-btn-secondary" onClick={() => setStep(2)}>
                                    ← Back
                                </button>
                                <button className="te-btn-primary" onClick={() => setStep(4)}>
                                    Continue to Deductions →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        STEP 4: INVESTMENTS & DEDUCTIONS (CONDITIONAL)
                        ══════════════════════════════════════════════════ */}
                    {step === 4 && (
                        <div className="te-card">
                            <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                                Step 4: Tax Deductions (Old Regime)
                            </h2>
                            <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '24px' }}>
                                Answer only for deductions that apply to you. Under the New Regime, standard deduction (₹50,000) applies automatically.
                            </p>

                            {/* Conditional: Section 80C */}
                            <div className={`te-cond-card ${formData.has_80c || formData.deduction_80c > 0 ? 'active' : ''}`}>
                                <div className="te-cond-header" onClick={() => handleToggle('has_80c', !formData.has_80c)}>
                                    <span className="te-cond-title">Do you make eligible Section 80C investments? (EPF, PPF, ELSS, Life Insurance)</span>
                                    <div className="te-toggle-group">
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${formData.has_80c || formData.deduction_80c > 0 ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_80c', true); }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${!formData.has_80c && formData.deduction_80c === 0 ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_80c', false); }}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                {(formData.has_80c || formData.deduction_80c > 0) && (
                                    <div className="te-cond-content">
                                        <div className="te-form-group">
                                            <div className="te-label-row">
                                                <label className="te-label">Section 80C Amount (Capped at ₹1,50,000)</label>
                                                {renderSourceBadge('deduction_80c')}
                                            </div>
                                            <div className="te-input-wrapper">
                                                <span className="te-input-prefix">₹</span>
                                                <input
                                                    type="number"
                                                    className="te-input"
                                                    value={formData.deduction_80c || ''}
                                                    onChange={(e) => handleInputChange('deduction_80c', e.target.value)}
                                                    placeholder="e.g. 150000"
                                                />
                                            </div>
                                            <span className="te-helper">
                                                {fieldSources.deduction_80c?.notes || 'Includes EPF, PPF, ELSS, NSC, SSY, and Life Insurance premium.'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conditional: Section 80D */}
                            <div className={`te-cond-card ${formData.has_80d || formData.deduction_80d > 0 ? 'active' : ''}`}>
                                <div className="te-cond-header" onClick={() => handleToggle('has_80d', !formData.has_80d)}>
                                    <span className="te-cond-title">Do you pay health/medical insurance premium? (Section 80D)</span>
                                    <div className="te-toggle-group">
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${formData.has_80d || formData.deduction_80d > 0 ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_80d', true); }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${!formData.has_80d && formData.deduction_80d === 0 ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_80d', false); }}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                {(formData.has_80d || formData.deduction_80d > 0) && (
                                    <div className="te-cond-content">
                                        <div className="te-form-group">
                                            <div className="te-label-row">
                                                <label className="te-label">Section 80D Medical Premium (Capped at ₹25,000 for self/family)</label>
                                                {renderSourceBadge('deduction_80d')}
                                            </div>
                                            <div className="te-input-wrapper">
                                                <span className="te-input-prefix">₹</span>
                                                <input
                                                    type="number"
                                                    className="te-input"
                                                    value={formData.deduction_80d || ''}
                                                    onChange={(e) => handleInputChange('deduction_80d', e.target.value)}
                                                    placeholder="e.g. 25000"
                                                />
                                            </div>
                                            <span className="te-helper">
                                                {fieldSources.deduction_80d?.notes || 'Health insurance premium paid for self, spouse, and dependent children.'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Conditional: Section 80TTA */}
                            <div className={`te-cond-card ${formData.has_80tta || formData.deduction_80tta > 0 ? 'active' : ''}`}>
                                <div className="te-cond-header" onClick={() => handleToggle('has_80tta', !formData.has_80tta)}>
                                    <span className="te-cond-title">Did you earn savings bank interest? (Section 80TTA)</span>
                                    <div className="te-toggle-group">
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${formData.has_80tta || formData.deduction_80tta > 0 ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_80tta', true); }}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            className={`te-toggle-btn ${!formData.has_80tta && formData.deduction_80tta === 0 ? 'active' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); handleToggle('has_80tta', false); }}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                {(formData.has_80tta || formData.deduction_80tta > 0) && (
                                    <div className="te-cond-content">
                                        <div className="te-form-group">
                                            <div className="te-label-row">
                                                <label className="te-label">Section 80TTA Savings Interest (Capped at ₹10,000)</label>
                                                {renderSourceBadge('deduction_80tta')}
                                            </div>
                                            <div className="te-input-wrapper">
                                                <span className="te-input-prefix">₹</span>
                                                <input
                                                    type="number"
                                                    className="te-input"
                                                    value={formData.deduction_80tta || ''}
                                                    onChange={(e) => handleInputChange('deduction_80tta', e.target.value)}
                                                    placeholder="e.g. 10000"
                                                />
                                            </div>
                                            <span className="te-helper">
                                                Deduction for interest earned on savings accounts with banks and post offices.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="te-actions-row">
                                <button className="te-btn-secondary" onClick={() => setStep(3)}>
                                    ← Back
                                </button>
                                <button
                                    className="te-btn-primary"
                                    onClick={handlePreCalculationCheck}
                                    disabled={calculating}
                                >
                                    {calculating ? 'Calculating...' : 'Review & Calculate Tax →'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        STEP 5 MODAL: MISSING INFORMATION & PRE-CALCULATION CHECK
                        ══════════════════════════════════════════════════ */}
                    {showMissingModal && (
                        <div className="te-modal-overlay">
                            <div className="te-modal-box">
                                <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                                    Pre-Calculation Review
                                </h3>
                                <p style={{ fontSize: '13.5px', color: 'var(--text2)', marginBottom: '16px' }}>
                                    Please review your input summary. We identified the following items:
                                </p>

                                {missingItems.length > 0 && (
                                    <div className="te-warning-notice">
                                        <div style={{ fontWeight: '700', marginBottom: '6px' }}>
                                            ⚠️ Unentered or Incomplete Information:
                                        </div>
                                        <ul style={{ paddingLeft: '18px', margin: 0 }}>
                                            {missingItems.map((item, idx) => (
                                                <li key={idx} style={{ marginBottom: '4px' }}>
                                                    <strong>{item.field}:</strong> {item.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <table className="te-review-table">
                                    <thead>
                                        <tr>
                                            <th>Field</th>
                                            <th>Value</th>
                                            <th>Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Gross Salary</td>
                                            <td>₹{Number(formData.gross_salary).toLocaleString('en-IN')}</td>
                                            <td>{renderSourceBadge('gross_salary')}</td>
                                        </tr>
                                        <tr>
                                            <td>Other Income</td>
                                            <td>₹{Number(formData.other_income).toLocaleString('en-IN')}</td>
                                            <td>{renderSourceBadge('other_income')}</td>
                                        </tr>
                                        <tr>
                                            <td>Section 80C Deductions</td>
                                            <td>₹{Number(formData.deduction_80c).toLocaleString('en-IN')}</td>
                                            <td>{renderSourceBadge('deduction_80c')}</td>
                                        </tr>
                                        <tr>
                                            <td>Section 80D Health Premium</td>
                                            <td>₹{Number(formData.deduction_80d).toLocaleString('en-IN')}</td>
                                            <td>{renderSourceBadge('deduction_80d')}</td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div style={{ fontSize: '12.5px', color: 'var(--text2)', marginBottom: '20px', lineHeight: '1.4' }}>
                                    <em>Notice: If you continue with current information, the tax estimator will compute liabilities based solely on these values. Any unentered deductions will be treated as ₹0.</em>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button
                                        className="te-btn-secondary"
                                        onClick={() => {
                                            setShowMissingModal(false);
                                            // Take user back to the first missing step
                                            if (missingItems.length > 0) setStep(missingItems[0].stepTarget);
                                        }}
                                    >
                                        Add Information
                                    </button>
                                    <button
                                        className="te-btn-primary"
                                        onClick={executeCalculation}
                                    >
                                        Continue with Current Information →
                                    </button>
                                </div>
                            </div>
                        </div>
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
                                {/* 1. Recommendation Hero Banner */}
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

                                {/* 2. Key Metrics Summary Grid */}
                                <div className="te-metrics-grid">
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Recommended Regime</span>
                                        <span className="te-metric-val" style={{ color: 'var(--india-green)' }}>
                                            {recRegime}
                                        </span>
                                        <span className="te-metric-sub">Based on provided inputs</span>
                                    </div>
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Estimated Tax Liability</span>
                                        <span className="te-metric-val">
                                            ₹{Number(recTax).toLocaleString('en-IN')}
                                        </span>
                                        <span className="te-metric-sub">Under {recRegime}</span>
                                    </div>
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Estimated Difference</span>
                                        <span className="te-metric-val" style={{ color: diff > 0 ? 'var(--saffron)' : 'var(--navy)' }}>
                                            ₹{Number(diff).toLocaleString('en-IN')}
                                        </span>
                                        <span className="te-metric-sub">
                                            {diff > 0 ? `Advantage over other regime` : 'Both regimes equal'}
                                        </span>
                                    </div>
                                    <div className="te-metric-card">
                                        <span className="te-metric-label">Effective Tax Rate</span>
                                        <span className="te-metric-val">
                                            {effectiveRate}%
                                        </span>
                                        <span className="te-metric-sub">Of gross income</span>
                                    </div>
                                </div>

                                {/* 3. Side-by-Side Regime Cards */}
                                <div className="te-regime-grid">
                                    {/* New Regime Card */}
                                    <div className={`te-regime-card ${recRegime === 'New Regime' ? 'recommended' : ''}`}>
                                        {recRegime === 'New Regime' && (
                                            <div className="te-recommended-pill">Recommended</div>
                                        )}
                                        <div className="te-regime-title">New Tax Regime</div>
                                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Section 115BAC · Default Regime for FY 2024-25</span>
                                        <div className="te-tax-amount">
                                            ₹{Number(calculationResult.new_regime.total_tax_liability).toLocaleString('en-IN')}
                                        </div>

                                        <div className="te-breakdown-list">
                                            <div className="te-breakdown-row">
                                                <span>Gross Income</span>
                                                <span>₹{Number(calculationResult.new_regime.gross_income).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Standard Deduction</span>
                                                <span>- ₹{Number(calculationResult.new_regime.standard_deduction).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Chapter VI-A Deductions</span>
                                                <span>₹0 (Not applicable)</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Net Taxable Income</span>
                                                <span>₹{Number(calculationResult.new_regime.taxable_income).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Tax on Slabs</span>
                                                <span>₹{Number(calculationResult.new_regime.tax_on_income).toLocaleString('en-IN')}</span>
                                            </div>
                                            {calculationResult.new_regime.rebate_87a > 0 && (
                                                <div className="te-breakdown-row" style={{ color: 'var(--india-green)' }}>
                                                    <span>Section 87A Rebate</span>
                                                    <span>- ₹{Number(calculationResult.new_regime.rebate_87a).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            {calculationResult.new_regime.surcharge > 0 && (
                                                <div className="te-breakdown-row">
                                                    <span>Surcharge</span>
                                                    <span>₹{Number(calculationResult.new_regime.surcharge).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            <div className="te-breakdown-row">
                                                <span>Health & Education Cess (4%)</span>
                                                <span>₹{Number(calculationResult.new_regime.health_and_education_cess).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row total">
                                                <span>Final Estimated Liability</span>
                                                <span>₹{Number(calculationResult.new_regime.total_tax_liability).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Old Regime Card */}
                                    <div className={`te-regime-card ${recRegime === 'Old Regime' ? 'recommended' : ''}`}>
                                        {recRegime === 'Old Regime' && (
                                            <div className="te-recommended-pill">Recommended</div>
                                        )}
                                        <div className="te-regime-title">Old Tax Regime</div>
                                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Traditional Slabs with Chapter VI-A Deductions</span>
                                        <div className="te-tax-amount">
                                            ₹{Number(calculationResult.old_regime.total_tax_liability).toLocaleString('en-IN')}
                                        </div>

                                        <div className="te-breakdown-list">
                                            <div className="te-breakdown-row">
                                                <span>Gross Income</span>
                                                <span>₹{Number(calculationResult.old_regime.gross_income).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Standard Deduction</span>
                                                <span>- ₹{Number(calculationResult.old_regime.standard_deduction).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Chapter VI-A Deductions (80C, 80D, 80TTA)</span>
                                                <span>- ₹{Number(calculationResult.old_regime.total_chapter_vi_a_deductions).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Net Taxable Income</span>
                                                <span>₹{Number(calculationResult.old_regime.taxable_income).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row">
                                                <span>Tax on Slabs</span>
                                                <span>₹{Number(calculationResult.old_regime.tax_on_income).toLocaleString('en-IN')}</span>
                                            </div>
                                            {calculationResult.old_regime.rebate_87a > 0 && (
                                                <div className="te-breakdown-row" style={{ color: 'var(--india-green)' }}>
                                                    <span>Section 87A Rebate</span>
                                                    <span>- ₹{Number(calculationResult.old_regime.rebate_87a).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            {calculationResult.old_regime.surcharge > 0 && (
                                                <div className="te-breakdown-row">
                                                    <span>Surcharge</span>
                                                    <span>₹{Number(calculationResult.old_regime.surcharge).toLocaleString('en-IN')}</span>
                                                </div>
                                            )}
                                            <div className="te-breakdown-row">
                                                <span>Health & Education Cess (4%)</span>
                                                <span>₹{Number(calculationResult.old_regime.health_and_education_cess).toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="te-breakdown-row total">
                                                <span>Final Estimated Liability</span>
                                                <span>₹{Number(calculationResult.old_regime.total_tax_liability).toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Comprehensive Comparative Breakdown Table */}
                                <div className="te-comparison-table-wrap">
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', marginBottom: '6px' }}>
                                        Regime Comparison Matrix
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>
                                        Side-by-side comparison of deductions, taxable base, and final tax components.
                                    </p>

                                    <table className="te-comp-table">
                                        <thead>
                                            <tr>
                                                <th>Tax Calculation Component</th>
                                                <th>New Regime (Sec 115BAC)</th>
                                                <th>Old Regime</th>
                                                <th>Difference</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Gross Total Income</td>
                                                <td>₹{Number(calculationResult.new_regime.gross_income).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(calculationResult.old_regime.gross_income).toLocaleString('en-IN')}</td>
                                                <td>₹0</td>
                                            </tr>
                                            <tr>
                                                <td>Standard Deduction</td>
                                                <td>₹{Number(calculationResult.new_regime.standard_deduction).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(calculationResult.old_regime.standard_deduction).toLocaleString('en-IN')}</td>
                                                <td>₹0</td>
                                            </tr>
                                            <tr>
                                                <td>Chapter VI-A Deductions (80C, 80D, 80TTA)</td>
                                                <td>₹0</td>
                                                <td>₹{Number(calculationResult.old_regime.total_chapter_vi_a_deductions).toLocaleString('en-IN')}</td>
                                                <td style={{ color: 'var(--india-green)', fontWeight: '600' }}>
                                                    +₹{Number(calculationResult.old_regime.total_chapter_vi_a_deductions).toLocaleString('en-IN')} (Old)
                                                </td>
                                            </tr>
                                            <tr className="highlight-row">
                                                <td>Net Taxable Income</td>
                                                <td>₹{Number(calculationResult.new_regime.taxable_income).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(calculationResult.old_regime.taxable_income).toLocaleString('en-IN')}</td>
                                                <td>₹{Math.abs(calculationResult.old_regime.taxable_income - calculationResult.new_regime.taxable_income).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr>
                                                <td>Slab Tax on Income</td>
                                                <td>₹{Number(calculationResult.new_regime.tax_on_income).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(calculationResult.old_regime.tax_on_income).toLocaleString('en-IN')}</td>
                                                <td>₹{Math.abs(calculationResult.old_regime.tax_on_income - calculationResult.new_regime.tax_on_income).toLocaleString('en-IN')}</td>
                                            </tr>
                                            <tr>
                                                <td>Section 87A Tax Rebate</td>
                                                <td>-₹{Number(calculationResult.new_regime.rebate_87a).toLocaleString('en-IN')}</td>
                                                <td>-₹{Number(calculationResult.old_regime.rebate_87a).toLocaleString('en-IN')}</td>
                                                <td>-</td>
                                            </tr>
                                            <tr>
                                                <td>Health & Education Cess (4%)</td>
                                                <td>₹{Number(calculationResult.new_regime.health_and_education_cess).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(calculationResult.old_regime.health_and_education_cess).toLocaleString('en-IN')}</td>
                                                <td>-</td>
                                            </tr>
                                            <tr className="total-row">
                                                <td>Final Estimated Tax Liability</td>
                                                <td>₹{Number(calculationResult.new_regime.total_tax_liability).toLocaleString('en-IN')}</td>
                                                <td>₹{Number(calculationResult.old_regime.total_tax_liability).toLocaleString('en-IN')}</td>
                                                <td style={{ color: recRegime === 'New Regime' ? 'var(--india-green)' : 'var(--saffron)' }}>
                                                    {diff > 0 ? `₹${Number(diff).toLocaleString('en-IN')} (${recRegime} lower)` : 'Equal'}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* 5. How Did We Calculate This? (Expandable Calculation Flow Pipeline) */}
                                {calculationResult.calculation_flow && calculationResult.calculation_flow.length > 0 && (
                                    <div className="te-card" style={{ marginBottom: '24px' }}>
                                        <div className="te-collapsible-header" onClick={() => setFlowExpanded(!flowExpanded)}>
                                            <div>
                                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', margin: 0 }}>
                                                    📐 How Did We Calculate This? (Calculation Flow)
                                                </h3>
                                                <p style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px', marginBottom: 0 }}>
                                                    Deterministic calculation stages evaluated directly by the FinStack tax engine.
                                                </p>
                                            </div>
                                            <div className="te-toggle-pill">
                                                <span>{flowExpanded ? 'Hide Details ▲' : 'Expand Flow ▼'}</span>
                                            </div>
                                        </div>

                                        {/* Visual Pipeline Flow */}
                                        <div className="te-flow-pipeline">
                                            <div className="te-flow-pipeline-step">
                                                <span className="te-flow-step-pill">Gross Income</span>
                                            </div>
                                            <span className="te-flow-arrow">→</span>
                                            <div className="te-flow-pipeline-step">
                                                <span className="te-flow-step-pill">Deductions</span>
                                            </div>
                                            <span className="te-flow-arrow">→</span>
                                            <div className="te-flow-pipeline-step">
                                                <span className="te-flow-step-pill">Taxable Income</span>
                                            </div>
                                            <span className="te-flow-arrow">→</span>
                                            <div className="te-flow-pipeline-step">
                                                <span className="te-flow-step-pill">Tax Slabs</span>
                                            </div>
                                            <span className="te-flow-arrow">→</span>
                                            <div className="te-flow-pipeline-step">
                                                <span className="te-flow-step-pill">Surcharge</span>
                                            </div>
                                            <span className="te-flow-arrow">→</span>
                                            <div className="te-flow-pipeline-step">
                                                <span className="te-flow-step-pill">Cess (4%)</span>
                                            </div>
                                            <span className="te-flow-arrow">→</span>
                                            <div className="te-flow-pipeline-step">
                                                <span className="te-flow-step-pill" style={{ background: 'var(--navy)', color: 'var(--white)' }}>
                                                    Estimated Tax
                                                </span>
                                            </div>
                                        </div>

                                        {/* Detailed Flow Table */}
                                        {flowExpanded && (
                                            <div style={{ overflowX: 'auto', marginTop: '14px' }}>
                                                <table className="te-flow-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Calculation Stage</th>
                                                            <th>New Regime (Sec 115BAC)</th>
                                                            <th>Old Regime</th>
                                                            <th>Difference</th>
                                                            <th>Statutory Basis & Engine Logic</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {calculationResult.calculation_flow.map((st) => (
                                                            <tr key={st.step_key}>
                                                                <td>
                                                                    <div style={{ fontWeight: '700', color: 'var(--navy)' }}>{st.step_name}</div>
                                                                    {st.formula_hint && (
                                                                        <div className="te-flow-hint">{st.formula_hint}</div>
                                                                    )}
                                                                </td>
                                                                <td>₹{Number(st.new_regime_value).toLocaleString('en-IN')}</td>
                                                                <td>₹{Number(st.old_regime_value).toLocaleString('en-IN')}</td>
                                                                <td style={{ color: st.difference > 0 ? 'var(--navy2)' : 'var(--text3)' }}>
                                                                    {st.difference > 0 ? `₹${Number(st.difference).toLocaleString('en-IN')}` : '₹0'}
                                                                </td>
                                                                <td style={{ textAlign: 'left' }}>
                                                                    <div className="te-flow-desc">{st.description}</div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 6. Deduction Breakdown (Relevant to Actual Situation) */}
                                {calculationResult.deduction_breakdown && calculationResult.deduction_breakdown.length > 0 && (
                                    <div className="te-card" style={{ marginBottom: '24px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', marginBottom: '4px' }}>
                                            📋 Deduction Breakdown: What Was Considered
                                        </h3>
                                        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>
                                            Itemized breakdown of permissible deductions, caps, and regime eligibility evaluated for your specific profile.
                                        </p>

                                        <div className="te-deduction-grid">
                                            {calculationResult.deduction_breakdown.map((item, idx) => (
                                                <div key={idx} className="te-deduction-card">
                                                    <div>
                                                        <div className="te-deduction-header">
                                                            <div>
                                                                <span className="te-deduction-section">{item.section}</span>
                                                                <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>
                                                                    {item.label}
                                                                </div>
                                                            </div>
                                                            <span className="te-badge te-badge-profile">
                                                                {item.applicable_regime}
                                                            </span>
                                                        </div>

                                                        <div className="te-deduction-amounts">
                                                            <div className="te-deduction-amount-col">
                                                                <span className="te-deduction-amount-label">Declared</span>
                                                                <span className="te-deduction-amount-val">
                                                                    ₹{Number(item.declared_amount).toLocaleString('en-IN')}
                                                                </span>
                                                            </div>
                                                            <div className="te-deduction-amount-col">
                                                                <span className="te-deduction-amount-label">Considered</span>
                                                                <span className="te-deduction-amount-val" style={{ color: 'var(--india-green)' }}>
                                                                    ₹{Number(item.considered_amount).toLocaleString('en-IN')}
                                                                </span>
                                                            </div>
                                                            {item.statutory_limit !== null && (
                                                                <div className="te-deduction-amount-col">
                                                                    <span className="te-deduction-amount-label">Cap</span>
                                                                    <span className="te-deduction-amount-val" style={{ color: 'var(--text2)' }}>
                                                                        ₹{Number(item.statutory_limit).toLocaleString('en-IN')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="te-deduction-why">
                                                            <strong>Why included:</strong> {item.why_included}
                                                        </div>
                                                        {item.why_not_included && (
                                                            <div className="te-deduction-why" style={{ color: 'var(--saffron-dark)', marginTop: '6px' }}>
                                                                <strong>Why not included:</strong> {item.why_not_included}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 7. Why This Regime? (Deterministic Statutory Analysis) */}
                                {calculationResult.why_this_regime && (
                                    <div className="te-why-regime-card">
                                        <div className="te-why-headline">
                                            {calculationResult.why_this_regime.headline}
                                        </div>
                                        <div className="te-why-driver">
                                            Key Determinant: {calculationResult.why_this_regime.primary_driver}
                                        </div>
                                        <div className="te-why-bullets">
                                            {calculationResult.why_this_regime.bullets.map((bullet, idx) => (
                                                <div key={idx} className="te-why-bullet">
                                                    <span style={{ fontWeight: 'bold' }}>•</span>
                                                    <span>{bullet}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 8. Step-by-Step Explanation for Non-Experts */}
                                {calculationResult.explanation && calculationResult.explanation.length > 0 && (
                                    <div className="te-explanation-card">
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', marginBottom: '4px' }}>
                                            How This Estimate Was Produced
                                        </h3>
                                        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '14px' }}>
                                            Plain-language breakdown of deductions, exemptions, and tax provisions applied by the calculation engine.
                                        </p>
                                        <div className="te-explanation-list">
                                            {calculationResult.explanation.map((item, idx) => (
                                                <div key={idx} className="te-explanation-item">
                                                    <span style={{ color: 'var(--navy2)', fontWeight: 'bold' }}>✓</span>
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 9. Personalized Tax Opportunities (Module 5 - Part B) */}
                                {calculationResult.opportunities && calculationResult.opportunities.length > 0 && (
                                    <div className="te-card" style={{ marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', margin: 0 }}>
                                                💡 Personalized Tax Opportunities
                                            </h3>
                                            <span className="te-badge te-badge-profile">
                                                Grounded in Your Data · No Product Pushing
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>
                                            Statutory opportunities evaluated directly from your income, declared deductions, and regime selection.
                                        </p>

                                        <div className="te-opp-grid">
                                            {calculationResult.opportunities.map((opp) => {
                                                const isMissing = opp.status === 'missing_information' || opp.status === 'potentially_missing';
                                                const isOptimization = opp.status === 'optimization';

                                                return (
                                                    <div key={opp.id} className="te-opp-card">
                                                        <div className="te-opp-card-header">
                                                            <div>
                                                                <span className="te-opp-section">{opp.section}</span>
                                                                <h4 className="te-opp-title">{opp.title}</h4>
                                                            </div>
                                                            <span className={`te-opp-status-badge ${isMissing ? 'status-missing' : isOptimization ? 'status-opt' : 'status-gap'}`}>
                                                                {isMissing ? '⚠️ Missing Information' : isOptimization ? '⚖️ Regime Strategy' : '📈 Unutilized Headroom'}
                                                            </span>
                                                        </div>

                                                        <div className="te-opp-why">
                                                            <strong>Why this appears:</strong> {opp.why_it_appears}
                                                        </div>

                                                        {opp.potential_tax_impact > 0 && (
                                                            <div className="te-opp-impact">
                                                                <span className="te-opp-impact-label">Potential Tax Relief:</span>
                                                                <span className="te-opp-impact-val">
                                                                    Up to ₹{Number(opp.potential_tax_impact).toLocaleString('en-IN')}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {opp.missing_fields_required && opp.missing_fields_required.length > 0 && (
                                                            <div className="te-opp-docs">
                                                                <div className="te-opp-docs-title">Required Verification Documentation:</div>
                                                                <ul className="te-opp-docs-list">
                                                                    {opp.missing_fields_required.map((doc, dIdx) => (
                                                                        <li key={dIdx}>{doc}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        <div className="te-opp-caution">
                                                            <strong>🛡️ Advisory Note:</strong> {opp.cautionary_note}
                                                        </div>

                                                        <div style={{ marginTop: '14px' }}>
                                                            <button
                                                                className="te-opp-action-btn"
                                                                onClick={() => applyOpportunityToWhatIf(opp)}
                                                            >
                                                                Simulate in What-If Workbench ⚡
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* 10. Interactive What-If Scenario Workbench (Module 5 - Part A) */}
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

                                    {/* Scenario Preset Tabs */}
                                    <div className="te-whatif-tabs">
                                        <button
                                            className={`te-whatif-tab ${whatIfType === 'salary_change' ? 'active' : ''}`}
                                            onClick={() => {
                                                setWhatIfType('salary_change');
                                                runWhatIf('salary_change', { salary_change_amount: whatIfSalaryDelta });
                                            }}
                                        >
                                            💼 Salary Change
                                        </button>
                                        <button
                                            className={`te-whatif-tab ${whatIfType === 'additional_deductions' ? 'active' : ''}`}
                                            onClick={() => {
                                                setWhatIfType('additional_deductions');
                                                runWhatIf('additional_deductions', { additional_80c: whatIf80C, additional_80d: whatIf80D, forced_regime: 'OLD' });
                                            }}
                                        >
                                            🛡️ Additional Deductions (80C / 80D)
                                        </button>
                                        <button
                                            className={`te-whatif-tab ${whatIfType === 'home_loan_interest' ? 'active' : ''}`}
                                            onClick={() => {
                                                setWhatIfType('home_loan_interest');
                                                runWhatIf('home_loan_interest', { home_loan_interest: whatIfHomeLoan, forced_regime: 'OLD' });
                                            }}
                                        >
                                            🏠 Home Loan Interest (Sec 24b)
                                        </button>
                                        <button
                                            className={`te-whatif-tab ${whatIfType === 'regime_switch' ? 'active' : ''}`}
                                            onClick={() => {
                                                setWhatIfType('regime_switch');
                                                runWhatIf('regime_switch', {});
                                            }}
                                        >
                                            🔄 Regime Switch
                                        </button>
                                    </div>

                                    {/* Scenario Interactive Controls */}
                                    <div className="te-whatif-controls-panel">
                                        {whatIfType === 'salary_change' && (
                                            <div>
                                                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '8px' }}>
                                                    Simulated Gross Salary Adjustment:
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {[-50000, 50000, 100000, 200000, 300000, 500000].map((delta) => (
                                                        <button
                                                            key={delta}
                                                            type="button"
                                                            className={`te-btn-pill ${whatIfSalaryDelta === delta ? 'active' : ''}`}
                                                            onClick={() => {
                                                                setWhatIfSalaryDelta(delta);
                                                                runWhatIf('salary_change', { salary_change_amount: delta });
                                                            }}
                                                        >
                                                            {delta > 0 ? `+₹${(delta/1000).toLocaleString('en-IN')}k` : `-₹${(Math.abs(delta)/1000).toLocaleString('en-IN')}k`}
                                                        </button>
                                                    ))}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                        <span style={{ fontSize: '12px', color: 'var(--text3)' }}>Custom delta: ₹</span>
                                                        <input
                                                            type="number"
                                                            value={whatIfSalaryDelta}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setWhatIfSalaryDelta(val);
                                                                runWhatIf('salary_change', { salary_change_amount: val });
                                                            }}
                                                            style={{ width: '110px', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {whatIfType === 'additional_deductions' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                                                <div>
                                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>
                                                        Simulated Section 80C Addition (Cap: ₹1.5L):
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input
                                                            type="number"
                                                            value={whatIf80C}
                                                            max={150000}
                                                            min={0}
                                                            onChange={(e) => {
                                                                const val = Math.min(150000, Math.max(0, parseFloat(e.target.value) || 0));
                                                                setWhatIf80C(val);
                                                                runWhatIf('additional_deductions', { additional_80c: val, additional_80d: whatIf80D, forced_regime: 'OLD' });
                                                            }}
                                                            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="te-btn-pill"
                                                            onClick={() => {
                                                                setWhatIf80C(150000);
                                                                runWhatIf('additional_deductions', { additional_80c: 150000, additional_80d: whatIf80D, forced_regime: 'OLD' });
                                                            }}
                                                        >
                                                            Max ₹1.5L
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>
                                                        Simulated Section 80D Addition (Cap: ₹25k):
                                                    </label>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <input
                                                            type="number"
                                                            value={whatIf80D}
                                                            max={25000}
                                                            min={0}
                                                            onChange={(e) => {
                                                                const val = Math.min(25000, Math.max(0, parseFloat(e.target.value) || 0));
                                                                setWhatIf80D(val);
                                                                runWhatIf('additional_deductions', { additional_80c: whatIf80C, additional_80d: val, forced_regime: 'OLD' });
                                                            }}
                                                            style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="te-btn-pill"
                                                            onClick={() => {
                                                                setWhatIf80D(25000);
                                                                runWhatIf('additional_deductions', { additional_80c: whatIf80C, additional_80d: 25000, forced_regime: 'OLD' });
                                                            }}
                                                        >
                                                            Max ₹25k
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {whatIfType === 'home_loan_interest' && (
                                            <div>
                                                <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', display: 'block', marginBottom: '6px' }}>
                                                    Simulated Section 24(b) Housing Loan Interest (Self-occupied cap: ₹2,00,000):
                                                </label>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '380px' }}>
                                                    <input
                                                        type="number"
                                                        value={whatIfHomeLoan}
                                                        max={200000}
                                                        min={0}
                                                        onChange={(e) => {
                                                            const val = Math.min(200000, Math.max(0, parseFloat(e.target.value) || 0));
                                                            setWhatIfHomeLoan(val);
                                                            runWhatIf('home_loan_interest', { home_loan_interest: val, forced_regime: 'OLD' });
                                                        }}
                                                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', fontWeight: '600' }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="te-btn-pill"
                                                        onClick={() => {
                                                            setWhatIfHomeLoan(200000);
                                                            runWhatIf('home_loan_interest', { home_loan_interest: 200000, forced_regime: 'OLD' });
                                                        }}
                                                    >
                                                        Max ₹2.0L
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {whatIfType === 'regime_switch' && (
                                            <div>
                                                <div style={{ fontSize: '13.5px', color: 'var(--text2)', lineHeight: '1.5', marginBottom: '10px' }}>
                                                    Direct statutory comparison between <strong>New Tax Regime (Section 115BAC)</strong> and <strong>Old Tax Regime</strong> under your current declared numbers.
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                    <button
                                                        type="button"
                                                        className={`te-btn-pill ${whatIfForcedRegime === null ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setWhatIfForcedRegime(null);
                                                            runWhatIf('regime_switch', { forced_regime: null });
                                                        }}
                                                    >
                                                        Automatic Alternate
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`te-btn-pill ${whatIfForcedRegime === 'NEW' ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setWhatIfForcedRegime('NEW');
                                                            runWhatIf('regime_switch', { forced_regime: 'NEW' });
                                                        }}
                                                    >
                                                        Force New Regime
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`te-btn-pill ${whatIfForcedRegime === 'OLD' ? 'active' : ''}`}
                                                        onClick={() => {
                                                            setWhatIfForcedRegime('OLD');
                                                            runWhatIf('regime_switch', { forced_regime: 'OLD' });
                                                        }}
                                                    >
                                                        Force Old Regime
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Simulation Results Side-by-Side: CURRENT vs SCENARIO */}
                                    {whatIfResult ? (
                                        <div style={{ marginTop: '20px' }}>
                                            {/* Delta Summary Header */}
                                            <div className="te-whatif-delta-banner">
                                                <div>
                                                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text3)', fontWeight: '700' }}>
                                                        {whatIfResult.scenario_title} · Impact Analysis
                                                    </div>
                                                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--navy)', marginTop: '4px' }}>
                                                        {whatIfResult.delta.summary_sentence}
                                                    </div>
                                                </div>
                                                <div className={`te-whatif-delta-pill ${whatIfResult.delta.tax_difference > 0 ? 'pill-save' : whatIfResult.delta.tax_difference < 0 ? 'pill-tax' : 'pill-neutral'}`}>
                                                    {whatIfResult.delta.tax_difference > 0
                                                        ? `Saves ₹${Number(whatIfResult.delta.tax_difference).toLocaleString('en-IN')}`
                                                        : whatIfResult.delta.tax_difference < 0
                                                            ? `+₹${Number(Math.abs(whatIfResult.delta.tax_difference)).toLocaleString('en-IN')} Tax`
                                                            : '₹0 Change'}
                                                </div>
                                            </div>

                                            {/* Side-by-Side CURRENT vs SCENARIO Comparison Grid */}
                                            <div className="te-whatif-grid">
                                                {/* Card 1: CURRENT */}
                                                <div className="te-whatif-card current">
                                                    <div className="te-whatif-card-badge current">CURRENT ASSESSMENT</div>
                                                    <h4 className="te-whatif-regime-title">{whatIfResult.current.regime_name}</h4>
                                                    <div className="te-whatif-tax">
                                                        ₹{Number(whatIfResult.current.total_tax).toLocaleString('en-IN')}
                                                    </div>
                                                    <div className="te-whatif-effective">
                                                        Effective Rate: {whatIfResult.current.effective_tax_rate}%
                                                    </div>

                                                    <div className="te-whatif-rows">
                                                        <div className="te-whatif-row">
                                                            <span>Gross Income:</span>
                                                            <span>₹{Number(whatIfResult.current.gross_income).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Standard Deduction:</span>
                                                            <span>- ₹{Number(whatIfResult.current.standard_deduction).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Deductions Claimed:</span>
                                                            <span>- ₹{Number(whatIfResult.current.total_deductions).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Net Taxable Income:</span>
                                                            <span>₹{Number(whatIfResult.current.taxable_income).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Section 87A Rebate:</span>
                                                            <span>- ₹{Number(whatIfResult.current.rebate_87a).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Cess (4%):</span>
                                                            <span>₹{Number(whatIfResult.current.health_and_education_cess).toLocaleString('en-IN')}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card 2: SCENARIO */}
                                                <div className="te-whatif-card scenario">
                                                    <div className="te-whatif-card-badge scenario">SCENARIO PROJECTION</div>
                                                    <h4 className="te-whatif-regime-title">{whatIfResult.scenario.regime_name}</h4>
                                                    <div className="te-whatif-tax" style={{ color: whatIfResult.delta.tax_difference > 0 ? 'var(--india-green)' : 'var(--navy)' }}>
                                                        ₹{Number(whatIfResult.scenario.total_tax).toLocaleString('en-IN')}
                                                    </div>
                                                    <div className="te-whatif-effective">
                                                        Effective Rate: {whatIfResult.scenario.effective_tax_rate}%
                                                    </div>

                                                    <div className="te-whatif-rows">
                                                        <div className="te-whatif-row">
                                                            <span>Gross Income:</span>
                                                            <span>₹{Number(whatIfResult.scenario.gross_income).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Standard Deduction:</span>
                                                            <span>- ₹{Number(whatIfResult.scenario.standard_deduction).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Deductions Considered:</span>
                                                            <span>- ₹{Number(whatIfResult.scenario.total_deductions).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Net Taxable Income:</span>
                                                            <span>₹{Number(whatIfResult.scenario.taxable_income).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Section 87A Rebate:</span>
                                                            <span>- ₹{Number(whatIfResult.scenario.rebate_87a).toLocaleString('en-IN')}</span>
                                                        </div>
                                                        <div className="te-whatif-row">
                                                            <span>Cess (4%):</span>
                                                            <span>₹{Number(whatIfResult.scenario.health_and_education_cess).toLocaleString('en-IN')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Explanation Points */}
                                            {whatIfResult.delta.explanation_points && whatIfResult.delta.explanation_points.length > 0 && (
                                                <div className="te-whatif-reasons">
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', marginBottom: '6px' }}>
                                                        Why This Difference Occurs:
                                                    </div>
                                                    {whatIfResult.delta.explanation_points.map((pt, pIdx) => (
                                                        <div key={pIdx} className="te-whatif-reason-item">
                                                            <span>•</span>
                                                            <span>{pt}</span>
                                                        </div>
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

                                {/* 10. Trust & Data Provenance */}
                                {calculationResult.trust_metadata && (
                                    <div className="te-trust-card">
                                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--navy)', marginBottom: '4px' }}>
                                            🛡️ Trust & Data Provenance
                                        </h3>
                                        <p style={{ fontSize: '13px', color: 'var(--text2)', marginBottom: '16px' }}>
                                            Full audit trail of information sources, user overrides, statutory assumptions, and missing fields.
                                        </p>

                                        <div className="te-trust-grid">
                                            {/* Data Sources */}
                                            <div className="te-trust-section">
                                                <div className="te-trust-section-title">
                                                    <span>📌 Data Sources Used</span>
                                                </div>
                                                <div className="te-provenance-list">
                                                    {Object.entries(calculationResult.trust_metadata.data_sources).map(([field, src]) => (
                                                        <div key={field} className="te-provenance-row">
                                                            <span style={{ textTransform: 'capitalize' }}>
                                                                {field.replace(/_/g, ' ')}:
                                                            </span>
                                                            {renderProvenanceBadge(src)}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Overrides & Missing Info */}
                                            <div className="te-trust-section">
                                                <div className="te-trust-section-title">
                                                    <span>✏️ User Overrides & Status</span>
                                                </div>
                                                {calculationResult.trust_metadata.user_overrides?.length > 0 ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                                        {calculationResult.trust_metadata.user_overrides.map((ov, i) => (
                                                            <span key={i} className="te-badge te-badge-user">
                                                                Overridden: {ov.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: '0 0 12px 0' }}>
                                                        No profile defaults were overridden.
                                                    </p>
                                                )}

                                                <div className="te-trust-section-title" style={{ marginTop: '12px' }}>
                                                    <span>⚠️ Missing / Incomplete Items</span>
                                                </div>
                                                {calculationResult.trust_metadata.missing_information?.length > 0 ? (
                                                    <ul className="te-assumptions-list">
                                                        {calculationResult.trust_metadata.missing_information.map((msg, i) => (
                                                            <li key={i}>{msg}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p style={{ fontSize: '12.5px', color: 'var(--text3)', margin: 0 }}>
                                                        All relevant inputs were declared.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Statutory Assumptions */}
                                            <div className="te-trust-section" style={{ gridColumn: '1 / -1' }}>
                                                <div className="te-trust-section-title">
                                                    <span>⚖️ Core Statutory Assumptions</span>
                                                </div>
                                                <ul className="te-assumptions-list">
                                                    {calculationResult.trust_metadata.assumptions.map((assump, i) => (
                                                        <li key={i}>{assump}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 11. Statutory Legal & Tax Disclaimer */}
                                <div className="te-disclaimer-box">
                                    ⚖️ <strong>Legal & Tax Disclaimer:</strong> {calculationResult.disclaimer}
                                    <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text3)' }}>
                                        FinStack AI is a financial planning and educational platform. Actual tax liabilities are determined upon filing official ITR with the Income Tax Department. Tax rules are subject to statutory amendments.
                                    </div>
                                </div>

                                {/* 8. Actions */}
                                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <button className="te-btn-secondary" onClick={() => setStep(1)}>
                                        ← Adjust Inputs & Recalculate
                                    </button>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            className="te-btn-secondary"
                                            onClick={() => handleOpenLearnModal()}
                                        >
                                            📚 View Tax Rules & Guide
                                        </button>
                                        <button className="te-btn-primary" onClick={handleOpenHistory}>
                                            View Past Estimates
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ══════════════════════════════════════════════════
                        STEP 7: ASSESSMENT HISTORY
                        ══════════════════════════════════════════════════ */}
                    {/* ══════════════════════════════════════════════════
                        STEP 7: ASSESSMENT HISTORY (MODULE 7)
                        ══════════════════════════════════════════════════ */}
                    {step === 7 && (
                        <div className="te-card">
                            <div className="te-history-header-row">
                                <div>
                                    <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--navy)', marginBottom: '4px' }}>
                                        Past Tax Assessments
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--text2)', margin: 0 }}>
                                        Your historical tax estimates saved securely in your FinStack account.
                                    </p>
                                </div>
                                <button className="te-btn-secondary" onClick={() => handleOpenDocReview()}>
                                    📄 Document Vault Review (Form 16)
                                </button>
                            </div>

                            {/* Financial Journey Decoupled Integration Boundary Milestone Card */}
                            {journeyMilestone && (
                                <div className="te-journey-milestone-card">
                                    <div className="te-journey-milestone-info">
                                        <span className="te-journey-badge">Financial Journey Milestone</span>
                                        <div style={{ fontSize: '13px', color: '#065F46' }}>
                                            <strong>Status: {journeyMilestone.milestone_status}</strong>
                                            {journeyMilestone.has_assessment ? (
                                                <span> · Latest FY {journeyMilestone.financial_year}: {journeyMilestone.recommended_regime} recommended (Est. Tax: ₹{Number(journeyMilestone.estimated_tax || 0).toLocaleString('en-IN')})</span>
                                            ) : (
                                                <span> · {journeyMilestone.notes}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '11.5px', color: '#047857', fontStyle: 'italic' }}>
                                        Decoupled Integration Boundary
                                    </span>
                                </div>
                            )}

                            {/* Comparison Action Bar */}
                            <div className="te-compare-action-bar">
                                <div style={{ fontSize: '13px', color: '#1E40AF' }}>
                                    {selectedHistoryIds.length === 2 ? (
                                        <span><strong>2 assessments selected.</strong> Ready for side-by-side delta comparison.</span>
                                    ) : selectedHistoryIds.length === 1 ? (
                                        <span><strong>1 assessment selected.</strong> Check a 2nd assessment to enable side-by-side comparison.</span>
                                    ) : (
                                        <span>Tip: Check any 2 past assessments to compare side-by-side with full delta breakdown.</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {selectedHistoryIds.length > 0 && (
                                        <button
                                            className="te-btn-xs te-btn-xs-outline"
                                            onClick={() => setSelectedHistoryIds([])}
                                        >
                                            Clear Selection
                                        </button>
                                    )}
                                    <button
                                        className="te-btn-xs te-btn-xs-primary"
                                        disabled={selectedHistoryIds.length !== 2 || loadingComparison}
                                        onClick={handleCompareSelected}
                                    >
                                        {loadingComparison ? 'Comparing...' : 'Compare Selected (2) →'}
                                    </button>
                                </div>
                            </div>

                            {loadingHistory ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text2)' }}>
                                    Loading past assessments...
                                </div>
                            ) : historyList.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text3)' }}>
                                    No past tax assessments found. Run your first estimate to start tracking!
                                </div>
                            ) : (
                                <table className="te-review-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px', textAlign: 'center' }}>Select</th>
                                            <th>Financial Year</th>
                                            <th>Date</th>
                                            <th>Gross Income</th>
                                            <th>Recommended Regime</th>
                                            <th>Estimated Tax</th>
                                            <th>Estimated Difference</th>
                                            <th style={{ textAlign: 'center' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historyList.map((item) => {
                                            const isSelected = selectedHistoryIds.includes(item.id);
                                            const isRecalculating = recalculatingId === item.id;
                                            const grossVal = (item.gross_income !== undefined && item.gross_income !== null)
                                                ? item.gross_income
                                                : (Number(item.gross_salary || 0) + Number(item.other_income || 0));
                                            const estTaxVal = (item.estimated_tax !== undefined && item.estimated_tax !== null)
                                                ? item.estimated_tax
                                                : (item.recommended_regime === 'New Regime' ? item.new_regime_total_tax : item.old_regime_total_tax);
                                            const estDiffVal = (item.estimated_difference !== undefined && item.estimated_difference !== null)
                                                ? item.estimated_difference
                                                : item.estimated_tax_savings;

                                            return (
                                                <tr key={item.id} className={isSelected ? 'te-table-row-selected' : ''}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => handleToggleSelectHistory(item.id)}
                                                            aria-label={`Select assessment FY ${item.financial_year}`}
                                                        />
                                                    </td>
                                                    <td style={{ fontWeight: '600' }}>FY {item.financial_year}</td>
                                                    <td>{new Date(item.created_at).toLocaleDateString('en-IN')}</td>
                                                    <td>₹{Number(grossVal || 0).toLocaleString('en-IN')}</td>
                                                    <td>
                                                        <span className="te-badge te-badge-profile">
                                                            {item.recommended_regime}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: '600', color: 'var(--navy)' }}>
                                                        ₹{Number(estTaxVal || 0).toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ color: 'var(--india-green)', fontWeight: '700' }}>
                                                        ₹{Number(estDiffVal || 0).toLocaleString('en-IN')}
                                                    </td>
                                                    <td>
                                                        <div className="te-history-actions-cell">
                                                            <button
                                                                className="te-btn-xs te-btn-xs-outline"
                                                                onClick={() => handleViewDetail(item.id)}
                                                                disabled={loadingDetail}
                                                            >
                                                                View Details
                                                            </button>
                                                            <button
                                                                className="te-btn-xs te-btn-xs-primary"
                                                                onClick={() => handleRecalculate(item.id)}
                                                                disabled={isRecalculating}
                                                            >
                                                                {isRecalculating ? 'Recalculating...' : 'Recalculate'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <button className="te-btn-primary" onClick={() => setStep(0)}>
                                    Start New Assessment →
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        MODULE 6: LEARN / TAX EDUCATION MODAL
                        ══════════════════════════════════════════════════ */}
                    {showLearnModal && (
                        <div
                            className="te-learn-modal-overlay"
                            onClick={() => setShowLearnModal(false)}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="te-learn-title"
                        >
                            <div
                                className="te-learn-modal-container"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="te-learn-modal-header">
                                    <div>
                                        <h2 id="te-learn-title" className="te-learn-modal-title">
                                            📚 Tax Guide & Education Hub
                                        </h2>
                                        <p className="te-learn-modal-subtitle">
                                            Clear, beginner-friendly explanations powered by official statutory tax rules for FY {educationData?.financial_year || '2024-25'} (AY {educationData?.assessment_year || '2025-26'}).
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setShowLearnModal(false)}
                                        aria-label="Close Tax Guide"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: '22px',
                                            cursor: 'pointer',
                                            color: 'var(--text2)',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Navigation Tabs Bar */}
                                <div className="te-learn-tabs-bar" role="tablist">
                                    <button
                                        role="tab"
                                        aria-selected={activeLearnTab === 'overview'}
                                        className={`te-learn-tab-btn ${activeLearnTab === 'overview' ? 'active' : ''}`}
                                        onClick={() => setActiveLearnTab('overview')}
                                    >
                                        🎓 Overview & Principles
                                    </button>
                                    <button
                                        role="tab"
                                        aria-selected={activeLearnTab === 'timeline'}
                                        className={`te-learn-tab-btn ${activeLearnTab === 'timeline' ? 'active' : ''}`}
                                        onClick={() => setActiveLearnTab('timeline')}
                                    >
                                        📅 Financial Year (April 1 → March 31)
                                    </button>
                                    <button
                                        role="tab"
                                        aria-selected={activeLearnTab === 'flow'}
                                        className={`te-learn-tab-btn ${activeLearnTab === 'flow' ? 'active' : ''}`}
                                        onClick={() => setActiveLearnTab('flow')}
                                    >
                                        🔄 Calculation Flow Funnel
                                    </button>
                                    <button
                                        role="tab"
                                        aria-selected={activeLearnTab === 'regimes'}
                                        className={`te-learn-tab-btn ${activeLearnTab === 'regimes' ? 'active' : ''}`}
                                        onClick={() => setActiveLearnTab('regimes')}
                                    >
                                        ⚖️ Old vs New Regime Slabs
                                    </button>
                                    <button
                                        role="tab"
                                        aria-selected={activeLearnTab === 'glossary'}
                                        className={`te-learn-tab-btn ${activeLearnTab === 'glossary' ? 'active' : ''}`}
                                        onClick={() => setActiveLearnTab('glossary')}
                                    >
                                        📖 Terms Dictionary ({educationData?.glossary?.length || 12})
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="te-learn-body">
                                    {loadingEducation && !educationData ? (
                                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
                                            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔄</div>
                                            Loading authoritative tax rules and glossary...
                                        </div>
                                    ) : !educationData ? (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--error)' }}>
                                            Failed to load tax education rules from backend.
                                            <div style={{ marginTop: '12px' }}>
                                                <button className="te-btn-secondary" onClick={() => handleOpenLearnModal()}>
                                                    Retry
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* ── TAB 1: OVERVIEW & PRINCIPLES ── */}
                                            {activeLearnTab === 'overview' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    <div className="te-card" style={{ background: '#F8FAFC', border: '1px solid var(--border)' }}>
                                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: '0 0 8px 0' }}>
                                                            What is the FinStack Tax Estimator?
                                                        </h3>
                                                        <p style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.6', margin: 0 }}>
                                                            The FinStack Tax Estimator is an intelligent planning and forecasting tool designed to calculate projected income tax liabilities under the Indian Income Tax Act, 1961. It concurrently runs your numbers through both the <strong>New Tax Regime (Section 115BAC)</strong> and the <strong>Old Tax Regime</strong>, recommending the regime that minimizes your tax liability.
                                                        </p>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                                        <div className="te-card" style={{ borderTop: '4px solid var(--blue)' }}>
                                                            <h4 style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--navy)', margin: '0 0 8px 0' }}>
                                                                🛡️ Authoritative Deterministic Engine
                                                            </h4>
                                                            <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5', margin: 0 }}>
                                                                Every computation is performed by a single centralized backend engine adhering strictly to statutory tax rates, slab intervals, Section 87A rebate rules, and Health & Education Cess formulas. No machine-learning guesswork is used in computing liabilities.
                                                            </p>
                                                        </div>

                                                        <div className="te-card" style={{ borderTop: '4px solid #10B981' }}>
                                                            <h4 style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--navy)', margin: '0 0 8px 0' }}>
                                                                💡 Why is this an Estimate?
                                                            </h4>
                                                            <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5', margin: 0 }}>
                                                                Official tax liabilities are formally assessed when you file your Income Tax Return (ITR) with the Income Tax Department. Mid-year salary revisions, employer TDS deductions, medical reimbursements, and Form 26AS/AIS reconciliation impact your final return. FinStack provides the foresight to plan deductions ahead of deadlines.
                                                            </p>
                                                        </div>

                                                        <div className="te-card" style={{ borderTop: '4px solid #F59E0B' }}>
                                                            <h4 style={{ fontSize: '15.5px', fontWeight: '700', color: 'var(--navy)', margin: '0 0 8px 0' }}>
                                                                ⚠️ Golden Rule of Tax Planning
                                                            </h4>
                                                            <p style={{ fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5', margin: 0 }}>
                                                                <strong>Never invest in a financial product solely to save tax.</strong> Always evaluate liquidity, lock-in duration (e.g. 15 years for PPF, 5 years for FDs), and expected real return before committing funds to Section 80C or 80D instruments.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── TAB 2: FINANCIAL YEAR TIMELINE (April 1 → March 31) ── */}
                                            {activeLearnTab === 'timeline' && (
                                                <div className="te-fy-timeline-wrapper">
                                                    <div className="te-fy-timeline-banner">
                                                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, fontWeight: '700' }}>
                                                            Statutory Indian Tax Calendar
                                                        </div>
                                                        <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '6px' }}>
                                                            April 1 ➔ March 31: The Fiscal Lifecycle
                                                        </div>
                                                        <div style={{ fontSize: '13.5px', opacity: 0.9, marginTop: '8px', lineHeight: '1.5' }}>
                                                            Income earned between <strong>April 1</strong> and <strong>March 31</strong> is categorized under the <em>Financial Year (FY)</em>, and subsequently evaluated for taxation in the following <em>Assessment Year (AY)</em>.
                                                        </div>
                                                    </div>

                                                    <div className="te-fy-timeline-stages">
                                                        {/* Stage 1: Financial Year */}
                                                        <div className="te-fy-stage-card accent-blue">
                                                            <span className="te-fy-stage-badge blue">Income Earning Phase</span>
                                                            <h3 className="te-fy-stage-title">
                                                                Financial Year (FY {educationData.financial_year})
                                                            </h3>
                                                            <div className="te-fy-stage-span">
                                                                📅 {educationData.fy_date_span}
                                                            </div>
                                                            <p className="te-fy-stage-desc">
                                                                The 12-month period during which you receive income and execute tax-saving investments.
                                                            </p>
                                                            <ul className="te-fy-stage-bullets">
                                                                <li>Monthly salary, freelance income, bonuses, and interest accrued.</li>
                                                                <li>Employers deduct monthly TDS based on your chosen regime.</li>
                                                                <li><strong>Crucial Deadline:</strong> All 80C, 80D, and NPS investments must be completed on or before <strong>March 31</strong> to count for this year.</li>
                                                            </ul>
                                                        </div>

                                                        {/* Connector Arrow */}
                                                        <div className="te-fy-connector-arrow">
                                                            ➔
                                                            <span style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px', textTransform: 'uppercase' }}>Next Year</span>
                                                        </div>

                                                        {/* Stage 2: Assessment Year */}
                                                        <div className="te-fy-stage-card accent-purple">
                                                            <span className="te-fy-stage-badge purple">Assessment & Filing Phase</span>
                                                            <h3 className="te-fy-stage-title">
                                                                Assessment Year (AY {educationData.assessment_year})
                                                            </h3>
                                                            <div className="te-fy-stage-span" style={{ color: '#6D28D9', background: '#F5F3FF' }}>
                                                                📅 {educationData.ay_date_span}
                                                            </div>
                                                            <p className="te-fy-stage-desc">
                                                                The immediate next year where the Income Tax Department assesses your earnings and you file your return.
                                                            </p>
                                                            <ul className="te-fy-stage-bullets">
                                                                <li>Employers issue <strong>Form 16</strong> around May–June summarizing TDS.</li>
                                                                <li>Taxpayers reconcile TDS with <strong>Form 26AS</strong> and the Annual Information Statement (AIS).</li>
                                                                <li><strong>Statutory Deadline:</strong> Individual ITR filing is typically due on <strong>July 31</strong> of the Assessment Year.</li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    <div className="te-card" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                            <div style={{ fontSize: '24px' }}>💡</div>
                                                            <div style={{ fontSize: '13px', color: '#1E40AF', lineHeight: '1.5' }}>
                                                                <strong>Pro Tip:</strong> When filling forms or checking your tax summary, remember that <strong>FY 2024-25</strong> always corresponds to <strong>AY 2025-26</strong>. You earn in the Financial Year; you file and assess in the Assessment Year.
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── TAB 3: CALCULATION FLOW FUNNEL ── */}
                                            {activeLearnTab === 'flow' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <div style={{ fontSize: '14px', color: 'var(--text2)', lineHeight: '1.5' }}>
                                                        Indian income tax is calculated through an 8-stage progressive waterfall. Every stage is computed authoritatively by our calculation engine:
                                                    </div>

                                                    <div className="te-calc-flow-list">
                                                        {educationData.calculation_flow_stages.map((stg) => (
                                                            <div key={stg.stage_number} className="te-calc-flow-card">
                                                                <div className="te-calc-stage-num">{stg.stage_number}</div>
                                                                <div className="te-calc-flow-body">
                                                                    <div className="te-calc-flow-header-row">
                                                                        <h4 className="te-calc-stage-title">{stg.title}</h4>
                                                                        <span className="te-calc-stage-sub">{stg.subtitle}</span>
                                                                    </div>
                                                                    <p className="te-calc-stage-desc">{stg.description}</p>
                                                                    <div>
                                                                        <span className="te-calc-formula-box">{stg.formula}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── TAB 4: OLD VS NEW REGIME SLABS ── */}
                                            {activeLearnTab === 'regimes' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                                    <div className="te-learn-regimes-grid">
                                                        {/* New Regime Card */}
                                                        <div className="te-learn-regime-card featured">
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
                                                                    {educationData.new_regime.regime_name}
                                                                </h3>
                                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: '#DBEAFE', color: '#1E40AF' }}>
                                                                    DEFAULT
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                                                                {educationData.new_regime.statutory_basis}
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Standard Deduction</div>
                                                                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy)' }}>
                                                                        ₹{Number(educationData.new_regime.standard_deduction).toLocaleString('en-IN')}
                                                                    </div>
                                                                </div>
                                                                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>87A Rebate Threshold</div>
                                                                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--india-green)' }}>
                                                                        ₹{Number(educationData.new_regime.rebate_87a_limit).toLocaleString('en-IN')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                                                                    Official Slabs (FY {educationData.financial_year})
                                                                </div>
                                                                <table className="te-learn-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Income Slab</th>
                                                                            <th style={{ textAlign: 'right' }}>Tax Rate</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {educationData.new_regime.slabs.map((slb, idx) => (
                                                                            <tr key={idx}>
                                                                                <td>{slb.slab_range}</td>
                                                                                <td style={{ textAlign: 'right', fontWeight: '700' }}>{slb.tax_rate_label}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                            <div>
                                                                <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--navy)', marginBottom: '6px' }}>
                                                                    Key Highlights:
                                                                </div>
                                                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>
                                                                    {educationData.new_regime.key_features.map((feat, idx) => (
                                                                        <li key={idx}>{feat}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>

                                                        {/* Old Regime Card */}
                                                        <div className="te-learn-regime-card">
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
                                                                    {educationData.old_regime.regime_name}
                                                                </h3>
                                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '4px', background: '#F1F5F9', color: '#475569' }}>
                                                                    OPTIONAL
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
                                                                {educationData.old_regime.statutory_basis}
                                                            </div>

                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Standard Deduction</div>
                                                                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy)' }}>
                                                                        ₹{Number(educationData.old_regime.standard_deduction).toLocaleString('en-IN')}
                                                                    </div>
                                                                </div>
                                                                <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>87A Rebate Threshold</div>
                                                                    <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--india-green)' }}>
                                                                        ₹{Number(educationData.old_regime.rebate_87a_limit).toLocaleString('en-IN')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', marginBottom: '8px' }}>
                                                                    Official Slabs (FY {educationData.financial_year})
                                                                </div>
                                                                <table className="te-learn-table">
                                                                    <thead>
                                                                        <tr>
                                                                            <th>Income Slab</th>
                                                                            <th style={{ textAlign: 'right' }}>Tax Rate</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {educationData.old_regime.slabs.map((slb, idx) => (
                                                                            <tr key={idx}>
                                                                                <td>{slb.slab_range}</td>
                                                                                <td style={{ textAlign: 'right', fontWeight: '700' }}>{slb.tax_rate_label}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>

                                                            <div>
                                                                <div style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--navy)', marginBottom: '6px' }}>
                                                                    Key Highlights:
                                                                </div>
                                                                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text2)', lineHeight: '1.5' }}>
                                                                    {educationData.old_regime.key_features.map((feat, idx) => (
                                                                        <li key={idx}>{feat}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Statutory Deduction Caps */}
                                                    <div>
                                                        <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy)', marginBottom: '12px' }}>
                                                            Statutory Deduction Limits (Old Regime Chapter VI-A)
                                                        </h4>
                                                        <div className="te-deduction-caps-grid">
                                                            {educationData.deduction_limits.map((ded) => (
                                                                <div key={ded.code} className="te-deduction-cap-card">
                                                                    <div className="te-cap-header">
                                                                        <span className="te-cap-code">{ded.statutory_section}</span>
                                                                        <span className="te-cap-amount">
                                                                            ₹{Number(ded.limit_amount).toLocaleString('en-IN')}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--navy)', marginBottom: '4px' }}>
                                                                        {ded.name}
                                                                    </div>
                                                                    <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '8px', lineHeight: '1.4' }}>
                                                                        {ded.description}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>
                                                                        <strong>Eligible:</strong> {ded.eligible_instruments.slice(0, 3).join(', ')}...
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── TAB 5: STATUTORY GLOSSARY (ALL 12 TERMS) ── */}
                                            {activeLearnTab === 'glossary' && (() => {
                                                const filteredGlossary = (educationData.glossary || []).filter(item => {
                                                    const matchesCat = glossaryCategory === 'ALL' || item.category === glossaryCategory;
                                                    const q = glossarySearch.toLowerCase().trim();
                                                    const matchesQ = !q ||
                                                        item.term.toLowerCase().includes(q) ||
                                                        item.short_definition.toLowerCase().includes(q) ||
                                                        item.detailed_explanation.toLowerCase().includes(q);
                                                    return matchesCat && matchesQ;
                                                });

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                        <div className="te-glossary-controls">
                                                            <input
                                                                type="text"
                                                                className="te-glossary-search-input"
                                                                placeholder="🔍 Search tax terms, sections (e.g. 80C, HRA, Rebate, Cess)..."
                                                                value={glossarySearch}
                                                                onChange={(e) => setGlossarySearch(e.target.value)}
                                                            />

                                                            <div className="te-glossary-categories">
                                                                {['ALL', 'Income & Deductions', 'Taxes & Levies', 'Timeline'].map((cat) => (
                                                                    <button
                                                                        key={cat}
                                                                        type="button"
                                                                        className={`te-glossary-cat-pill ${glossaryCategory === cat ? 'active' : ''}`}
                                                                        onClick={() => setGlossaryCategory(cat)}
                                                                    >
                                                                        {cat === 'ALL' ? 'All Terms (12)' : cat}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {filteredGlossary.length === 0 ? (
                                                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text3)' }}>
                                                                No tax terms match "{glossarySearch}".
                                                            </div>
                                                        ) : (
                                                            <div className="te-glossary-grid">
                                                                {filteredGlossary.map((item) => (
                                                                    <div key={item.term} className="te-glossary-card">
                                                                        <div className="te-glossary-card-top">
                                                                            <h4 className="te-glossary-term">{item.term}</h4>
                                                                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                                {item.statutory_reference && (
                                                                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', background: '#EFF6FF', color: 'var(--blue)' }}>
                                                                                        {item.statutory_reference}
                                                                                    </span>
                                                                                )}
                                                                                <span className="te-glossary-cat-badge">{item.category}</span>
                                                                            </div>
                                                                        </div>
                                                                        <p className="te-glossary-short-def">{item.short_definition}</p>
                                                                        <p className="te-glossary-detail">{item.detailed_explanation}</p>
                                                                        {item.example && (
                                                                            <div className="te-glossary-example-box">
                                                                                <strong>Example:</strong> {item.example}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {/* Statutory Disclaimer at bottom of Learn Hub */}
                                            <div style={{ marginTop: '10px', padding: '12px 16px', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text3)', lineHeight: '1.45' }}>
                                                ⚖️ <strong>Legal & Statutory Disclaimer:</strong> {educationData.disclaimer}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        MODULE 7: ASSESSMENT DETAIL MODAL
                        ══════════════════════════════════════════════════ */}
                    {showDetailModal && selectedDetail && (
                        <div
                            className="te-modal-backdrop"
                            onClick={() => setShowDetailModal(false)}
                            role="dialog"
                            aria-modal="true"
                        >
                            <div className="te-modal-box" onClick={(e) => e.stopPropagation()}>
                                <div className="te-modal-header">
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
                                            Assessment Detail · FY {selectedDetail.financial_year}
                                        </h3>
                                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                                            Assessment ID: {selectedDetail.id} · Recorded on {new Date(selectedDetail.created_at).toLocaleDateString('en-IN')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text2)' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="te-modal-body">
                                    {/* Recommendation Banner */}
                                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '14px 18px', borderRadius: 'var(--radius-sm)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <span className="te-badge te-badge-profile">{selectedDetail.recommended_regime}</span>
                                            <strong style={{ color: '#166534', fontSize: '14px' }}>
                                                Estimated Benefit: ₹{Number(selectedDetail.estimated_tax_savings || 0).toLocaleString('en-IN')}
                                            </strong>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#15803D' }}>
                                            {selectedDetail.why_this_regime?.headline || selectedDetail.recommendation_message || 'Assessment estimated via FinStack Authoritative Tax Engine.'}
                                        </div>
                                    </div>

                                    {/* Input Summary */}
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--navy)', marginBottom: '10px' }}>
                                            Declared Financial Inputs
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Gross Salary</div>
                                                <div style={{ fontSize: '14px', fontWeight: '700' }}>₹{Number(selectedDetail.gross_salary || 0).toLocaleString('en-IN')}</div>
                                            </div>
                                            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Other Income</div>
                                                <div style={{ fontSize: '14px', fontWeight: '700' }}>₹{Number(selectedDetail.other_income || 0).toLocaleString('en-IN')}</div>
                                            </div>
                                            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Section 80C Deductions</div>
                                                <div style={{ fontSize: '14px', fontWeight: '700' }}>₹{Number(selectedDetail.deduction_80c || 0).toLocaleString('en-IN')}</div>
                                            </div>
                                            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Section 80D Health Insurance</div>
                                                <div style={{ fontSize: '14px', fontWeight: '700' }}>₹{Number(selectedDetail.deduction_80d || 0).toLocaleString('en-IN')}</div>
                                            </div>
                                            {selectedDetail.home_loan_interest > 0 && (
                                                <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Section 24(b) Home Loan Interest</div>
                                                    <div style={{ fontSize: '14px', fontWeight: '700' }}>₹{Number(selectedDetail.home_loan_interest).toLocaleString('en-IN')}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Side-by-side Regime Comparison Breakdown */}
                                    <div>
                                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--navy)', marginBottom: '10px' }}>
                                            Regime Computation Breakdown
                                        </h4>
                                        <table className="te-review-table">
                                            <thead>
                                                <tr>
                                                    <th>Metric</th>
                                                    <th>Old Regime</th>
                                                    <th>New Regime (Default)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>Gross Total Income</td>
                                                    <td>₹{Number(selectedDetail.old_regime.gross_income).toLocaleString('en-IN')}</td>
                                                    <td>₹{Number(selectedDetail.new_regime.gross_income).toLocaleString('en-IN')}</td>
                                                </tr>
                                                <tr>
                                                    <td>Standard Deduction (Sec 16ia)</td>
                                                    <td>- ₹{Number(selectedDetail.old_regime.standard_deduction).toLocaleString('en-IN')}</td>
                                                    <td>- ₹{Number(selectedDetail.new_regime.standard_deduction).toLocaleString('en-IN')}</td>
                                                </tr>
                                                <tr>
                                                    <td>Chapter VI-A Deductions</td>
                                                    <td>- ₹{Number(selectedDetail.old_regime.total_chapter_vi_a_deductions).toLocaleString('en-IN')}</td>
                                                    <td style={{ color: 'var(--text3)' }}>Not Applicable</td>
                                                </tr>
                                                <tr style={{ fontWeight: '700' }}>
                                                    <td>Net Taxable Income</td>
                                                    <td>₹{Number(selectedDetail.old_regime.taxable_income).toLocaleString('en-IN')}</td>
                                                    <td>₹{Number(selectedDetail.new_regime.taxable_income).toLocaleString('en-IN')}</td>
                                                </tr>
                                                <tr>
                                                    <td>Section 87A Rebate</td>
                                                    <td>- ₹{Number(selectedDetail.old_regime.rebate_87a).toLocaleString('en-IN')}</td>
                                                    <td>- ₹{Number(selectedDetail.new_regime.rebate_87a).toLocaleString('en-IN')}</td>
                                                </tr>
                                                <tr>
                                                    <td>Health & Education Cess (4%)</td>
                                                    <td>₹{Number(selectedDetail.old_regime.health_and_education_cess).toLocaleString('en-IN')}</td>
                                                    <td>₹{Number(selectedDetail.new_regime.health_and_education_cess).toLocaleString('en-IN')}</td>
                                                </tr>
                                                <tr style={{ fontWeight: '800', background: '#F8FAFC' }}>
                                                    <td style={{ color: 'var(--navy)' }}>Total Estimated Tax Liability</td>
                                                    <td style={{ color: selectedDetail.recommended_regime === 'Old Regime' ? 'var(--india-green)' : 'var(--navy)' }}>
                                                        ₹{Number(selectedDetail.old_regime.total_tax_liability).toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ color: selectedDetail.recommended_regime === 'New Regime' ? 'var(--india-green)' : 'var(--navy)' }}>
                                                        ₹{Number(selectedDetail.new_regime.total_tax_liability).toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                                        <button
                                            className="te-btn-primary"
                                            onClick={() => {
                                                setShowDetailModal(false);
                                                handleRecalculate(selectedDetail.id);
                                            }}
                                        >
                                            🔄 Recalculate with Latest Rules →
                                        </button>
                                        <button className="te-btn-secondary" onClick={() => setShowDetailModal(false)}>
                                            Close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        MODULE 7: SIDE-BY-SIDE COMPARISON MODAL
                        ══════════════════════════════════════════════════ */}
                    {showComparisonModal && comparisonResult && (
                        <div
                            className="te-modal-backdrop"
                            onClick={() => setShowComparisonModal(false)}
                            role="dialog"
                            aria-modal="true"
                        >
                            <div className="te-modal-box" onClick={(e) => e.stopPropagation()}>
                                <div className="te-modal-header">
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
                                            Historical Assessment Comparison
                                        </h3>
                                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                                            FY {comparisonResult.assessment_1.financial_year} vs FY {comparisonResult.assessment_2.financial_year}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowComparisonModal(false)}
                                        style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text2)' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="te-modal-body">
                                    {/* Delta Summary Box */}
                                    <div className="te-delta-summary-box">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                            <strong style={{ fontSize: '14px', color: '#1E3A8A' }}>
                                                {comparisonResult.delta.regime_transition}
                                            </strong>
                                            <span style={{ fontSize: '11px', background: '#DBEAFE', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                                                DELTA BREAKDOWN
                                            </span>
                                        </div>
                                        <div className="te-delta-metrics-row">
                                            <div className="te-delta-metric-tile">
                                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Gross Earnings Delta</div>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: comparisonResult.delta.gross_income_diff >= 0 ? '#1E40AF' : '#64748B' }}>
                                                    {comparisonResult.delta.gross_income_diff >= 0 ? '+' : ''}₹{Number(comparisonResult.delta.gross_income_diff).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="te-delta-metric-tile">
                                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Taxable Income Delta</div>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: comparisonResult.delta.taxable_income_diff >= 0 ? '#1E40AF' : '#64748B' }}>
                                                    {comparisonResult.delta.taxable_income_diff >= 0 ? '+' : ''}₹{Number(comparisonResult.delta.taxable_income_diff).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                            <div className="te-delta-metric-tile">
                                                <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Tax Liability Delta</div>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: comparisonResult.delta.tax_difference <= 0 ? 'var(--india-green)' : '#DC2626' }}>
                                                    {comparisonResult.delta.tax_difference >= 0 ? '+' : ''}₹{Number(comparisonResult.delta.tax_difference).toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>
                                        {comparisonResult.delta.summary_notes?.length > 0 && (
                                            <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#1E3A8A', lineHeight: '1.5' }}>
                                                <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                                    {comparisonResult.delta.summary_notes.map((note, idx) => (
                                                        <li key={idx}>{note}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>

                                    {/* Side-by-side assessment cards */}
                                    <div className="te-comparison-grid">
                                        {/* Assessment 1 */}
                                        <div className="te-comparison-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--navy)' }}>
                                                    Assessment 1 (FY {comparisonResult.assessment_1.financial_year})
                                                </h4>
                                                <span className="te-badge te-badge-profile">
                                                    {comparisonResult.assessment_1.recommended_regime}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>
                                                Recorded on {new Date(comparisonResult.assessment_1.created_at).toLocaleDateString('en-IN')}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text2)' }}>Gross Income:</span>
                                                    <strong>₹{Number(comparisonResult.assessment_1.gross_salary + comparisonResult.assessment_1.other_income).toLocaleString('en-IN')}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text2)' }}>Old Regime Tax:</span>
                                                    <span>₹{Number(comparisonResult.assessment_1.old_regime.total_tax_liability).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text2)' }}>New Regime Tax:</span>
                                                    <span>₹{Number(comparisonResult.assessment_1.new_regime.total_tax_liability).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                                                    <span style={{ fontWeight: '700', color: 'var(--navy)' }}>Estimated Tax:</span>
                                                    <strong style={{ color: 'var(--navy)' }}>
                                                        ₹{Number(comparisonResult.assessment_1.recommended_regime === 'New Regime' ? comparisonResult.assessment_1.new_regime.total_tax_liability : comparisonResult.assessment_1.old_regime.total_tax_liability).toLocaleString('en-IN')}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Assessment 2 */}
                                        <div className="te-comparison-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: 'var(--navy)' }}>
                                                    Assessment 2 (FY {comparisonResult.assessment_2.financial_year})
                                                </h4>
                                                <span className="te-badge te-badge-profile">
                                                    {comparisonResult.assessment_2.recommended_regime}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '12px' }}>
                                                Recorded on {new Date(comparisonResult.assessment_2.created_at).toLocaleDateString('en-IN')}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text2)' }}>Gross Income:</span>
                                                    <strong>₹{Number(comparisonResult.assessment_2.gross_salary + comparisonResult.assessment_2.other_income).toLocaleString('en-IN')}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text2)' }}>Old Regime Tax:</span>
                                                    <span>₹{Number(comparisonResult.assessment_2.old_regime.total_tax_liability).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text2)' }}>New Regime Tax:</span>
                                                    <span>₹{Number(comparisonResult.assessment_2.new_regime.total_tax_liability).toLocaleString('en-IN')}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                                                    <span style={{ fontWeight: '700', color: 'var(--navy)' }}>Estimated Tax:</span>
                                                    <strong style={{ color: 'var(--navy)' }}>
                                                        ₹{Number(comparisonResult.assessment_2.recommended_regime === 'New Regime' ? comparisonResult.assessment_2.new_regime.total_tax_liability : comparisonResult.assessment_2.old_regime.total_tax_liability).toLocaleString('en-IN')}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                                        <button className="te-btn-secondary" onClick={() => setShowComparisonModal(false)}>
                                            Close Comparison
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════
                        MODULE 7: DOCUMENT VAULT BOUNDARY REVIEW MODAL
                        ══════════════════════════════════════════════════ */}
                    {showDocReviewModal && stagedDocPayload && (
                        <div
                            className="te-modal-backdrop"
                            onClick={() => setShowDocReviewModal(false)}
                            role="dialog"
                            aria-modal="true"
                        >
                            <div className="te-modal-box" onClick={(e) => e.stopPropagation()}>
                                <div className="te-modal-header">
                                    <div>
                                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--navy)', margin: 0 }}>
                                            Document Vault · Provisional Review Boundary
                                        </h3>
                                        <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '3px' }}>
                                            Document: {stagedDocPayload.document_name} ({stagedDocPayload.document_type}) · Staged on {new Date(stagedDocPayload.uploaded_at).toLocaleDateString('en-IN')}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowDocReviewModal(false)}
                                        style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text2)' }}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="te-modal-body">
                                    {/* Critical Guardrail Banner */}
                                    <div className="te-doc-vault-guardrail-banner">
                                        <span style={{ fontSize: '20px' }}>🛡️</span>
                                        <div>
                                            <strong>FinStack Architectural Boundary Guardrail:</strong>
                                            <div style={{ marginTop: '3px' }}>
                                                Values extracted by Document Vault are provisional drafts. Under FinStack security policies, document-extracted figures must <strong>NEVER</strong> silently become trusted tax inputs. A human user must review, accept, modify, or reject each field before calculation.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Candidate Fields Review Table */}
                                    <table className="te-doc-field-review-table">
                                        <thead>
                                            <tr>
                                                <th>Tax Input Field</th>
                                                <th>Extracted Amount</th>
                                                <th>Document Citation</th>
                                                <th>Confidence</th>
                                                <th>Your Decision</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stagedDocPayload.extracted_fields.map((f) => {
                                                const currentDec = docDecisions[f.field_name] || { action: 'ACCEPT', confirmed_value: f.extracted_value };
                                                return (
                                                    <tr key={f.field_name}>
                                                        <td>
                                                            <strong style={{ color: 'var(--navy)' }}>{f.field_name}</strong>
                                                        </td>
                                                        <td style={{ fontWeight: '700' }}>
                                                            ₹{Number(f.extracted_value).toLocaleString('en-IN')}
                                                        </td>
                                                        <td style={{ color: 'var(--text2)', fontSize: '12px' }}>
                                                            {f.source_clause || 'Form 16 Schedule'}
                                                        </td>
                                                        <td>
                                                            <span style={{ background: '#ECFDF5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                                                {Math.round(f.extraction_confidence * 100)}%
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                <div className="te-doc-action-group">
                                                                    <button
                                                                        type="button"
                                                                        className={`te-btn-decision accept ${currentDec.action === 'ACCEPT' ? 'active' : ''}`}
                                                                        onClick={() => handleDocDecisionChange(f.field_name, 'ACCEPT', { confirmed_value: f.extracted_value })}
                                                                    >
                                                                        ✓ Accept
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={`te-btn-decision modify ${currentDec.action === 'MODIFY' ? 'active' : ''}`}
                                                                        onClick={() => handleDocDecisionChange(f.field_name, 'MODIFY', { confirmed_value: currentDec.confirmed_value ?? f.extracted_value })}
                                                                    >
                                                                        ✏️ Modify
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className={`te-btn-decision reject ${currentDec.action === 'REJECT' ? 'active' : ''}`}
                                                                        onClick={() => handleDocDecisionChange(f.field_name, 'REJECT', { confirmed_value: 0 })}
                                                                    >
                                                                        ✕ Reject
                                                                    </button>
                                                                </div>

                                                                {currentDec.action === 'MODIFY' && (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                                                        <span style={{ fontSize: '12px', color: 'var(--text2)' }}>₹</span>
                                                                        <input
                                                                            type="number"
                                                                            value={currentDec.confirmed_value ?? ''}
                                                                            onChange={(e) => handleDocDecisionChange(f.field_name, 'MODIFY', { confirmed_value: Math.max(0, parseFloat(e.target.value) || 0) })}
                                                                            style={{ width: '120px', padding: '4px 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}
                                                                            placeholder="New amount"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {currentDec.action === 'REJECT' && (
                                                                    <input
                                                                        type="text"
                                                                        value={currentDec.rejection_reason || ''}
                                                                        onChange={(e) => handleDocDecisionChange(f.field_name, 'REJECT', { rejection_reason: e.target.value })}
                                                                        placeholder="Reason (optional)"
                                                                        style={{ width: '180px', padding: '4px 8px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '4px' }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Action Footers */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                        <button
                                            className="te-btn-primary"
                                            onClick={handleConfirmDocReview}
                                            disabled={confirmingDoc}
                                        >
                                            {confirmingDoc ? 'Confirming...' : '✓ Confirm & Load into Tax Estimator →'}
                                        </button>
                                        <button className="te-btn-secondary" onClick={() => setShowDocReviewModal(false)}>
                                            Cancel / Discard Draft
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

