import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { documentVaultService } from '../services/documentVaultService';

const styles = {
    page: { minHeight: '100vh', backgroundColor: 'var(--bg)', padding: '40px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' },
    card: { backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', width: '100%', maxWidth: '800px', padding: '40px', border: '1px solid var(--border)' },
    title: { color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif", fontSize: '32px', marginBottom: '8px', textAlign: 'center' },
    subtitle: { color: 'var(--text2)', textAlign: 'center', marginBottom: '40px', fontSize: '16px' },
    sectionTitle: { color: 'var(--navy)', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderBottom: '2px solid var(--bg2)', paddingBottom: '10px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' },
    formGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
    label: { color: 'var(--text)', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center' },
    aiBadge: { fontSize: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 'bold' },
    input: { padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', backgroundColor: 'var(--white)', color: 'var(--text)', fontSize: '15px', transition: 'all 0.2s' },
    inputDisabled: { backgroundColor: 'var(--bg2)', color: 'var(--text3)', cursor: 'not-allowed' },
    button: { width: '100%', padding: '14px', backgroundColor: 'var(--saffron)', color: 'var(--white)', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '16px', fontWeight: '700', cursor: 'pointer', marginTop: '20px', transition: 'all 0.2s' },
    buttonDisabled: { backgroundColor: 'var(--border2)', cursor: 'not-allowed' },
    message: { padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', textAlign: 'center', fontWeight: '600', fontSize: '14px' },
    error: { backgroundColor: 'var(--error-light)', color: 'var(--error)', border: '1px solid var(--error)' },
    success: { backgroundColor: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' },
    uploadBox: { border: '2px dashed var(--navy)', padding: '60px 40px', textAlign: 'center', borderRadius: '12px', backgroundColor: '#F8FAFC', cursor: 'pointer', marginBottom: '20px', transition: 'all 0.2s' }
};

export default function ProfileCompletion() {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profileId, setProfileId] = useState(null);
    const [extractedFields, setExtractedFields] = useState({});

    const [personal, setPersonal] = useState({
        full_name: '', email: '', phone_number: '', date_of_birth: '', gender: '', city: '', state: '', country: 'India'
    });

    const [financial, setFinancial] = useState({
        employment_status: '', monthly_income: 0, monthly_expenses: 0, monthly_savings: 0, total_debt: 0, emergency_fund: 0, investments: 0, insurance_cover: 0, financial_goal: ''
    });

    useEffect(() => {
        const fetchProfiles = async () => {
            if (!user) return;
            try {
                const { data: userProfile } = await supabase.from('user_profile').select('*').eq('user_id', user.id).maybeSingle();
                if (userProfile) {
                    setProfileId(userProfile.id);
                    setPersonal({
                        full_name: userProfile.full_name || user.user_metadata?.full_name || '',
                        email: userProfile.email || user.email || '',
                        phone_number: userProfile.phone_number || '',
                        date_of_birth: userProfile.date_of_birth || '',
                        gender: userProfile.gender || '',
                        city: userProfile.city || '',
                        state: userProfile.state || '',
                        country: userProfile.country || 'India'
                    });

                    const { data: finProfile } = await supabase.from('financial_profile').select('*').eq('user_profile_id', userProfile.id).maybeSingle();
                    if (finProfile) {
                        setFinancial({
                            employment_status: finProfile.employment_status || '',
                            monthly_income: finProfile.monthly_income || 0,
                            monthly_expenses: finProfile.monthly_expenses || 0,
                            monthly_savings: finProfile.monthly_savings || 0,
                            total_debt: finProfile.total_debt || 0,
                            emergency_fund: finProfile.emergency_fund || 0,
                            investments: finProfile.investments || 0,
                            insurance_cover: finProfile.insurance_cover || 0,
                            financial_goal: finProfile.financial_goal || ''
                        });

                        // If profile is already completed, skip straight to the form
                        if (userProfile.profile_completed) {
                            setStep(2);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching profiles:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfiles();
    }, [user]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSaving(true);
        setMessage({ type: '', text: '1/3 Uploading to Secure Vault...' });

        try {
            // 1. Upload Document
            const uploadResponse = await documentVaultService.uploadDocument(file, 'salary_slip');

            // Extract the document ID from your backend response structure
            const docId = uploadResponse?.id || uploadResponse?.document?.id || uploadResponse?.data?.id;

            if (docId) {
                setMessage({ type: '', text: '2/3 Analyzing document with AI...' });

                // 2. Trigger AI Analysis
                await documentVaultService.aiAnalyzeDocument(docId);

                setMessage({ type: '', text: '3/3 Structuring financial data...' });

                // 3. Fetch Extracted Data
                const data = await documentVaultService.getExtractedData(docId);
                const extracted = data?.extracted_data || {};

                // Map the extracted JSON keys to our React form state
                // Handling potential fallback keys from the LLM (gross_salary vs monthly_income)
                const parsedIncome = extracted.gross_salary || extracted.net_salary || extracted.monthly_income || 0;

                setFinancial(prev => ({
                    ...prev,
                    employment_status: 'salaried', // Default to salaried if uploading a salary slip
                    monthly_income: parsedIncome > 0 ? Number(parsedIncome) : prev.monthly_income
                }));

                setExtractedFields({
                    employment_status: true,
                    monthly_income: parsedIncome > 0
                });

                // 4. Confirm Data automatically (optional, based on your DocumentVault logic)
                try {
                    await documentVaultService.confirmDocumentData(docId);
                } catch (confirmErr) {
                    console.log("Could not auto-confirm data, continuing anyway.", confirmErr);
                }
            } else {
                console.warn("Could not retrieve document ID from upload response.");
            }

            setMessage({ type: 'success', text: 'Document analyzed & saved to Vault!' });

            if (step === 1) setTimeout(() => setStep(2), 1500);

        } catch (error) {
            console.error("Document Extraction Error:", error);
            setMessage({ type: 'error', text: error.response?.data?.detail || 'AI extraction failed. Please fill details manually.' });

            if (step === 1) setTimeout(() => setStep(2), 1500);
        } finally {
            setSaving(false);
            if (e.target) e.target.value = null; // Reset file input
        }
    };

    const handlePersonalChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone_number' && value && !/^\d+$/.test(value)) return;
        setPersonal(prev => ({ ...prev, [name]: value }));
    };

    const handleFinancialChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'number') {
            const numValue = value === '' ? '' : Number(value);
            if (numValue < 0) return;
            setFinancial(prev => ({ ...prev, [name]: numValue }));
        } else {
            setFinancial(prev => ({ ...prev, [name]: value }));
        }

        if (extractedFields[name]) {
            setExtractedFields(prev => ({ ...prev, [name]: false }));
        }
    };

    const validateForm = () => {
        if (!personal.full_name.trim()) return "Full Name is required.";
        if (!personal.phone_number.trim()) return "Phone Number is required.";
        if (!financial.employment_status) return "Employment Status is required.";
        if (!financial.financial_goal) return "Financial Goal is required.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validateForm();
        if (error) {
            setMessage({ type: 'error', text: error });
            return window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            // 1. Safely UPDATE the user_profile (Bypasses the RLS Insert block)
            const userPayload = {
                ...personal,
                profile_completed: true,
                updated_at: new Date().toISOString()
            };

            const { error: userErr } = await supabase
                .from('user_profile')
                .update(userPayload)
                .eq('user_id', user.id); // Must match auth user ID

            if (userErr) throw userErr;

            // Ensure we have the internal DB ID for the financial profile relation
            let currentProfileId = profileId;
            if (!currentProfileId) {
                const { data: fetchProfile } = await supabase
                    .from('user_profile')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                currentProfileId = fetchProfile.id;
                setProfileId(currentProfileId);
            }

            // 2. Save the Financial Profile using the secure internal ID
            const financialPayload = {
                employment_status: financial.employment_status,
                monthly_income: Number(financial.monthly_income) || 0,
                monthly_expenses: Number(financial.monthly_expenses) || 0,
                monthly_savings: Number(financial.monthly_savings) || 0,
                total_debt: Number(financial.total_debt) || 0,
                emergency_fund: Number(financial.emergency_fund) || 0,
                investments: Number(financial.investments) || 0,
                insurance_cover: Number(financial.insurance_cover) || 0,
                financial_goal: financial.financial_goal,
                updated_at: new Date().toISOString()
            };

            const { data: finCheck } = await supabase
                .from('financial_profile')
                .select('id')
                .eq('user_profile_id', currentProfileId)
                .maybeSingle();

            if (finCheck) {
                // Update existing financial profile
                const { error: finErr } = await supabase
                    .from('financial_profile')
                    .update(financialPayload)
                    .eq('id', finCheck.id);
                if (finErr) throw finErr;
            } else {
                // Insert new financial profile
                const { error: finErr } = await supabase
                    .from('financial_profile')
                    .insert([{ user_profile_id: currentProfileId, ...financialPayload }]);
                if (finErr) throw finErr;
            }

            setMessage({ type: 'success', text: 'Profile Saved Successfully' });
            await refreshProfile();
            setTimeout(() => navigate('/dashboard'), 1000);

        } catch (err) {
            console.error("Save Error:", err);
            setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ ...styles.page, alignItems: 'center' }}><h2 style={styles.title}>Loading...</h2></div>;

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.title}>Complete Your Profile</h1>

                {message.text && (
                    <div style={{ ...styles.message, ...(message.type === 'error' ? styles.error : styles.success) }}>
                        {message.text}
                    </div>
                )}

                {/* HIDDEN FILE INPUT */}
                <input type="file" id="onboarding-upload" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />

                {/* STEP 1: UPLOAD DOCUMENTS */}
                {step === 1 && (
                    <div>
                        <p style={styles.subtitle}>Upload a recent Salary Slip or Bank Statement to auto-fill your details via FinStack AI.</p>

                        <div style={styles.uploadBox} onClick={() => !saving && document.getElementById('onboarding-upload').click()}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                            <h3 style={{ color: 'var(--navy)', margin: '0 0 8px 0' }}>Drag & Drop Document Here</h3>
                            <p style={{ color: 'var(--text2)', fontSize: '14px', margin: 0 }}>PDF, JPG, or PNG (Max 10MB)</p>

                            <button type="button" style={{ ...styles.button, width: 'auto', padding: '10px 32px', marginTop: '24px' }} disabled={saving}>
                                {saving ? 'Analyzing...' : 'Browse Files'}
                            </button>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '24px' }}>
                            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: '14px', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setStep(2)}>
                                Skip and fill manually
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: VERIFY FORM */}
                {step === 2 && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
                            <p style={{ ...styles.subtitle, margin: 0, textAlign: 'left' }}>
                                Verify your information and complete any missing details.
                            </p>

                            <button
                                type="button"
                                onClick={() => document.getElementById('onboarding-upload').click()}
                                disabled={saving}
                                style={{ padding: '10px 16px', backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {saving ? "Analyzing..." : "📄 Auto-Fill with Document"}
                            </button>
                        </div>

                        <h3 style={styles.sectionTitle}>Personal Information</h3>
                        <div style={styles.grid}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Full Name *</label>
                                <input type="text" name="full_name" value={personal.full_name} onChange={handlePersonalChange} style={styles.input} required />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Email (Read Only)</label>
                                <input type="email" name="email" value={personal.email} style={{ ...styles.input, ...styles.inputDisabled }} disabled />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number *</label>
                                <input type="tel" name="phone_number" value={personal.phone_number} onChange={handlePersonalChange} style={styles.input} pattern="[0-9]*" required />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Date of Birth</label>
                                <input type="date" name="date_of_birth" value={personal.date_of_birth} onChange={handlePersonalChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Gender</label>
                                <select name="gender" value={personal.gender} onChange={handlePersonalChange} style={styles.input}>
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>City</label>
                                <input type="text" name="city" value={personal.city} onChange={handlePersonalChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>State</label>
                                <input type="text" name="state" value={personal.state} onChange={handlePersonalChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Country</label>
                                <input type="text" name="country" value={personal.country} onChange={handlePersonalChange} style={styles.input} />
                            </div>
                        </div>

                        <h3 style={styles.sectionTitle}>Financial Information</h3>
                        <div style={styles.grid}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Employment Status *
                                    {extractedFields.employment_status && <span style={styles.aiBadge}>AI Extracted</span>}
                                </label>
                                <select name="employment_status" value={financial.employment_status} onChange={handleFinancialChange} style={styles.input} required>
                                    <option value="">Select Status</option>
                                    <option value="student">Student</option>
                                    <option value="salaried">Employed (Salaried)</option>
                                    <option value="self_employed">Self Employed</option>
                                    <option value="freelancer">Freelancer</option>
                                    <option value="business">Business</option>
                                    <option value="retired">Retired</option>
                                    <option value="unemployed">Unemployed</option>
                                </select>
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>
                                    Monthly Income (₹)
                                    {extractedFields.monthly_income && <span style={styles.aiBadge}>AI Extracted</span>}
                                </label>
                                <input type="number" min="0" name="monthly_income" value={financial.monthly_income} onChange={handleFinancialChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Monthly Expenses (₹)</label>
                                <input type="number" min="0" name="monthly_expenses" value={financial.monthly_expenses} onChange={handleFinancialChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Monthly Savings (₹)</label>
                                <input type="number" min="0" name="monthly_savings" value={financial.monthly_savings} onChange={handleFinancialChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Total Debt (₹)</label>
                                <input type="number" min="0" name="total_debt" value={financial.total_debt} onChange={handleFinancialChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Emergency Fund (₹)</label>
                                <input type="number" min="0" name="emergency_fund" value={financial.emergency_fund} onChange={handleFinancialChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Investments (₹)</label>
                                <input type="number" min="0" name="investments" value={financial.investments} onChange={handleFinancialChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Insurance Cover (₹)</label>
                                <input type="number" min="0" name="insurance_cover" value={financial.insurance_cover} onChange={handleFinancialChange} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Financial Goal *</label>
                                <select name="financial_goal" value={financial.financial_goal} onChange={handleFinancialChange} style={styles.input} required>
                                    <option value="">Select Goal</option>
                                    <option value="emergency_fund">Emergency Fund</option>
                                    <option value="retirement">Retirement</option>
                                    <option value="investment">Investment</option>
                                    <option value="education">Education</option>
                                    <option value="buy_house">Buy House</option>
                                    <option value="travel">Travel</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" style={{ ...styles.button, ...(saving ? styles.buttonDisabled : {}) }} disabled={saving}>
                            {saving ? 'Saving...' : 'Save & Continue'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}