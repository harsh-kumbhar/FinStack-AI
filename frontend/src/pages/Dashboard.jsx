import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

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
        fontFamily: "'Noto Serif', Georgia, serif"
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
    alertCard: {
        backgroundColor: 'var(--warning-light)',
        border: '1px solid var(--warning)',
        padding: '20px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
    },
    grid3: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px'
    },
    card: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)'
    },
    cardTitle: {
        fontSize: '16px',
        color: 'var(--text2)',
        marginBottom: '16px',
        fontWeight: '600'
    },
    cardValue: {
        fontSize: '28px',
        color: 'var(--navy)',
        fontWeight: 'bold',
        fontFamily: "'Noto Serif', Georgia, serif"
    },
    btnPrimary: {
        padding: '10px 20px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)'
    },
    btnOutline: {
        padding: '10px 20px',
        backgroundColor: 'var(--white)',
        color: 'var(--navy)',
        border: '1px solid var(--navy)',
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    moduleCard: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '140px',
        transition: 'var(--transition)',
        cursor: 'pointer'
    },
    moduleReady: {
        borderTop: '4px solid var(--success)'
    },
    moduleSoon: {
        borderTop: '4px solid var(--border2)',
        opacity: 0.8
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,35,80,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modalContent: {
        backgroundColor: 'var(--white)',
        padding: '32px',
        borderRadius: 'var(--radius-lg)',
        width: '400px',
        textAlign: 'center',
        boxShadow: 'var(--shadow-md)'
    },
    timelineItem: {
        display: 'flex',
        gap: '16px',
        marginBottom: '16px'
    },
    timelineDot: {
        width: '12px',
        height: '12px',
        backgroundColor: 'var(--saffron)',
        borderRadius: '50%',
        marginTop: '4px'
    }
};

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', active: true, path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', soon: true },
    { label: 'Document Intelligence', soon: true },
    { label: 'Loan Risk Assessment', soon: true },
    { label: 'Tax Estimator', soon: true },
    { label: 'Investment Advisor', soon: true },
    { label: 'Settings', soon: true }
];

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [financialData, setFinancialData] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                const { data: userProfile } = await supabase
                    .from('user_profile')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (userProfile) {
                    setUserData(userProfile);

                    const { data: finProfile } = await supabase
                        .from('financial_profile')
                        .select('*')
                        .eq('user_profile_id', userProfile.id)
                        .maybeSingle();

                    if (finProfile) {
                        setFinancialData(finProfile);
                    }
                }
            } catch (err) {
                console.error("Dashboard Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const handleFeatureClick = (status) => {
        if (status === 'soon') {
            setModalMessage("This feature will be implemented in the next sprint.");
            setModalOpen(true);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg)' }}>
                <h2 style={{ color: 'var(--navy)' }}>Loading Dashboard...</h2>
            </div>
        );
    }

    const isProfileComplete = userData?.profile_completed || false;
    const income = financialData?.monthly_income || 0;
    const savings = financialData?.monthly_savings || 0;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div style={styles.layout}>
            {/* SIDEBAR */}
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader}>FinStack</div>
                <nav style={styles.sidebarNav}>
                    {SIDEBAR_ITEMS.map((item, idx) => (
                        <div
                            key={idx}
                            style={{ ...styles.navItem, ...(item.active ? styles.navItemActive : {}) }}
                            onClick={() => {
                                if (item.soon) {
                                    handleFeatureClick('soon');
                                } else if (item.path) {
                                    navigate(item.path);
                                }
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
                        Welcome back, {userData?.full_name?.split(' ')[0] || 'User'}
                    </div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px' }}>{today}</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>
                            🔔
                        </div>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                {/* CONTENT */}
                <div style={styles.content}>

                    {/* ALERT */}
                    {!isProfileComplete && (
                        <div style={styles.alertCard}>
                            <div>
                                <h3 style={{ color: 'var(--warning)', marginBottom: '4px' }}>Profile Incomplete</h3>
                                <p style={{ color: 'var(--text)', fontSize: '14px' }}>Complete your profile to unlock all FinStack AI features.</p>
                            </div>
                            <button style={styles.btnPrimary} onClick={() => navigate('/profile')}>Complete Profile</button>
                        </div>
                    )}

                    <div style={styles.grid2}>
                        {/* WELCOME CARD */}
                        <div style={styles.card}>
                            <h2 style={{ ...styles.cardValue, fontSize: '24px', marginBottom: '16px' }}>
                                Hello, {userData?.full_name || 'User'}
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text2)' }}>
                                <p><strong>Email:</strong> {userData?.email || 'N/A'}</p>
                                <p><strong>Location:</strong> {userData?.city ? `${userData.city}, ${userData.state}, ${userData.country}` : 'Not provided'}</p>
                                <p><strong>Financial Goal:</strong> <span style={{ color: 'var(--saffron)', fontWeight: 'bold' }}>{financialData?.financial_goal ? financialData.financial_goal.replace('_', ' ').toUpperCase() : 'Not Set'}</span></p>
                            </div>
                        </div>

                        {/* QUICK ACTIONS */}
                        <div style={styles.card}>
                            <h3 style={styles.cardTitle}>Quick Actions</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                <button style={styles.btnPrimary} onClick={() => navigate('/profile')}>Edit Profile</button>
                                <button style={styles.btnOutline} onClick={() => handleFeatureClick('soon')}>Upload Document</button>
                                <button style={styles.btnOutline} onClick={() => navigate('/health-analyzer')}>Analyze Finances</button>
                                <button style={styles.btnOutline} onClick={() => handleFeatureClick('soon')}>Refresh Dashboard</button>
                            </div>
                        </div>
                    </div>

                    {/* FINANCIAL SUMMARY / QUICK STATS */}
                    <h3 style={{ color: 'var(--navy)', fontSize: '20px', marginTop: '10px' }}>Financial Summary</h3>
                    <div style={styles.grid3}>
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Monthly Income</div>
                            <div style={styles.cardValue}>₹{income.toLocaleString('en-IN')}</div>
                        </div>
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Monthly Expenses</div>
                            <div style={styles.cardValue}>₹{(financialData?.monthly_expenses || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Monthly Savings</div>
                            <div style={styles.cardValue}>₹{savings.toLocaleString('en-IN')}</div>
                        </div>
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Savings Rate</div>
                            <div style={{ ...styles.cardValue, color: 'var(--success)' }}>{savingsRate}%</div>
                        </div>
                        <div style={styles.card}>
                            <div style={styles.cardTitle}>Emergency Fund</div>
                            <div style={styles.cardValue}>₹{(financialData?.emergency_fund || 0).toLocaleString('en-IN')}</div>
                        </div>
                    </div>

                    <div style={styles.grid2}>
                        {/* AI MODULES */}
                        <div>
                            <h3 style={{ color: 'var(--navy)', fontSize: '20px', marginBottom: '20px' }}>AI Modules</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                                <div style={{ ...styles.moduleCard, ...styles.moduleReady }}>
                                    <div style={{ fontWeight: 'bold', color: 'var(--navy)' }}>Financial Health Analyzer</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--success)', backgroundColor: 'var(--success-light)', padding: '4px 8px', borderRadius: '4px' }}>Ready</span>
                                        <button style={{ ...styles.btnPrimary, padding: '6px 12px', fontSize: '12px' }} onClick={() => navigate('/health-analyzer')}>Open</button>
                                    </div>
                                </div>

                                {[
                                    'SmartFeed',
                                    'Document Intelligence',
                                    'Loan Risk Assessment',
                                    'Tax Estimator',
                                    'Investment Advisor'
                                ].map((mod, i) => (
                                    <div key={i} style={{ ...styles.moduleCard, ...styles.moduleSoon }} onClick={() => handleFeatureClick('soon')}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--text2)' }}>{mod}</div>
                                        <div style={{ marginTop: '16px' }}>
                                            <span style={{ fontSize: '12px', color: 'var(--warning)', backgroundColor: 'var(--warning-light)', padding: '4px 8px', borderRadius: '4px' }}>Coming Soon</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RECENT ACTIVITY */}
                        <div>
                            <h3 style={{ color: 'var(--navy)', fontSize: '20px', marginBottom: '20px' }}>Recent Activity</h3>
                            <div style={styles.card}>
                                <div style={styles.timelineItem}>
                                    <div style={styles.timelineDot}></div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>Dashboard Loaded</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Just now</div>
                                    </div>
                                </div>
                                {isProfileComplete && (
                                    <div style={styles.timelineItem}>
                                        <div style={{ ...styles.timelineDot, backgroundColor: 'var(--success)' }}></div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'var(--text)' }}>Financial Information Saved</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Recent</div>
                                        </div>
                                    </div>
                                )}
                                <div style={styles.timelineItem}>
                                    <div style={{ ...styles.timelineDot, backgroundColor: 'var(--info)' }}></div>
                                    <div>
                                        <div style={{ fontWeight: '600', color: 'var(--text)' }}>Google Login Successful</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Recent</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* MODAL */}
            {modalOpen && (
                <div style={styles.modalOverlay} onClick={() => setModalOpen(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🚧</div>
                        <h3 style={{ color: 'var(--navy)', marginBottom: '12px' }}>Feature In Development</h3>
                        <p style={{ color: 'var(--text2)', marginBottom: '24px' }}>{modalMessage}</p>
                        <button style={styles.btnPrimary} onClick={() => setModalOpen(false)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}