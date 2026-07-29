import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

const styles = {
    page: {
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start'
    },
    card: {
        backgroundColor: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
        width: '100%',
        maxWidth: '800px',
        padding: '40px',
        border: '1px solid var(--border)'
    },
    title: {
        color: 'var(--navy)',
        fontFamily: "'Noto Serif', Georgia, serif",
        fontSize: '32px',
        marginBottom: '8px',
        textAlign: 'center'
    },
    subtitle: {
        color: 'var(--text2)',
        textAlign: 'center',
        marginBottom: '40px',
        fontSize: '16px'
    },
    sectionTitle: {
        color: 'var(--navy)',
        fontSize: '20px',
        fontWeight: 'bold',
        marginBottom: '20px',
        borderBottom: '2px solid var(--bg2)',
        paddingBottom: '10px'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    label: {
        color: 'var(--text)',
        fontSize: '14px',
        fontWeight: '600'
    },
    input: {
        padding: '12px 16px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--white)',
        color: 'var(--text)',
        fontSize: '15px',
        transition: 'var(--transition)'
    },
    inputDisabled: {
        backgroundColor: 'var(--bg2)',
        color: 'var(--text3)',
        cursor: 'not-allowed'
    },
    button: {
        width: '100%',
        padding: '14px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        fontSize: '16px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        marginTop: '20px'
    },
    buttonDisabled: {
        backgroundColor: 'var(--border2)',
        cursor: 'not-allowed'
    },
    message: {
        padding: '12px',
        borderRadius: 'var(--radius-sm)',
        marginBottom: '20px',
        textAlign: 'center',
        fontWeight: '600',
        fontSize: '14px'
    },
    error: {
        backgroundColor: 'var(--error-light)',
        color: 'var(--error)',
        border: '1px solid var(--error)'
    },
    success: {
        backgroundColor: 'var(--success-light)',
        color: 'var(--success)',
        border: '1px solid var(--success)'
    }
};

export default function ProfileCompletion() {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // NEW: We need to track the internal database ID of the user profile
    const [profileId, setProfileId] = useState(null);

    const [personal, setPersonal] = useState({
        full_name: '',
        email: '',
        phone_number: '',
        date_of_birth: '',
        gender: '',
        city: '',
        state: '',
        country: 'India'
    });

    const [financial, setFinancial] = useState({
        employment_status: '',
        monthly_income: 0,
        monthly_expenses: 0,
        monthly_savings: 0,
        total_debt: 0,
        emergency_fund: 0,
        investments: 0,
        insurance_cover: 0,
        financial_goal: ''
    });

    useEffect(() => {
        const fetchProfiles = async () => {
            if (!user) return;

            try {
                // 1. Fetch user_profile using the Supabase Auth ID
                const { data: userProfile } = await supabase
                    .from('user_profile')
                    .select('*')
                    .eq('user_id', user.id) // FIXED
                    .maybeSingle();

                if (userProfile) {
                    setProfileId(userProfile.id); // Store the internal database ID
                    setPersonal(prev => ({
                        ...prev,
                        full_name: userProfile.full_name || user.user_metadata?.full_name || '',
                        email: userProfile.email || user.email || '',
                        phone_number: userProfile.phone_number || '',
                        date_of_birth: userProfile.date_of_birth || '',
                        gender: userProfile.gender || '',
                        city: userProfile.city || '',
                        state: userProfile.state || '',
                        country: userProfile.country || 'India'
                    }));

                    // 2. Fetch financial_profile using the internal user_profile.id
                    const { data: finProfile } = await supabase
                        .from('financial_profile')
                        .select('*')
                        .eq('user_profile_id', userProfile.id) // FIXED
                        .maybeSingle();

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
            const userPayload = {
                full_name: personal.full_name,
                phone_number: personal.phone_number,
                date_of_birth: personal.date_of_birth || null,
                gender: personal.gender || null,
                city: personal.city || null,
                state: personal.state || null,
                country: personal.country || null,
                profile_completed: true,
                updated_at: new Date().toISOString()
            };

            // Update user_profile by matching the Supabase Auth ID
            const { error: userErr } = await supabase
                .from('user_profile')
                .update(userPayload)
                .eq('user_id', user.id); // FIXED

            if (userErr) throw userErr;

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

            // Use the internal database profileId to link the financial profile
            const { data: finCheck } = await supabase
                .from('financial_profile')
                .select('id')
                .eq('user_profile_id', profileId) // FIXED
                .maybeSingle();

            if (finCheck) {
                const { error: finErr } = await supabase
                    .from('financial_profile')
                    .update(financialPayload)
                    .eq('user_profile_id', profileId); // FIXED
                if (finErr) throw finErr;
            } else {
                const { error: finErr } = await supabase
                    .from('financial_profile')
                    .insert([{ user_profile_id: profileId, ...financialPayload }]); // FIXED
                if (finErr) throw finErr;
            }

            setMessage({ type: 'success', text: 'Profile Saved Successfully' });
            await refreshProfile();

            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);

        } catch (err) {
            console.error("Supabase Save Error:", err);
            setMessage({ type: 'error', text: 'Failed to save profile. Please check your inputs.' });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ ...styles.page, alignItems: 'center' }}>
                <h2 style={styles.title}>Loading...</h2>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.title}>Complete Your Profile</h1>
                <p style={styles.subtitle}>Let's set up your account to provide the best financial insights.</p>

                {message.text && (
                    <div style={{ ...styles.message, ...(message.type === 'error' ? styles.error : styles.success) }}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* SECTION 1: PERSONAL INFORMATION */}
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
                                {/* Changed values to lowercase to match PostgreSQL Enum */}
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

                    {/* SECTION 2: FINANCIAL INFORMATION */}
                    <h3 style={styles.sectionTitle}>Financial Information</h3>
                    <div style={styles.grid}>
                        {/* EMPLOYMENT STATUS DROPDOWN */}
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Employment Status *</label>
                            <select name="employment_status" value={financial.employment_status} onChange={handleFinancialChange} style={styles.input} required>
                                <option value="">Select Status</option>
                                {/* Updated to match database enums exactly based on SQL */}
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
                            <label style={styles.label}>Monthly Income (₹)</label>
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
                        {/* FINANCIAL GOAL DROPDOWN */}
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Financial Goal *</label>
                            <select name="financial_goal" value={financial.financial_goal} onChange={handleFinancialChange} style={styles.input} required>
                                <option value="">Select Goal</option>
                                {/* Updated to match database enums exactly based on SQL */}
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

                    <button
                        type="submit"
                        style={{ ...styles.button, ...(saving ? styles.buttonDisabled : {}) }}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save & Continue'}
                    </button>
                </form>
            </div>
        </div>
    );
}