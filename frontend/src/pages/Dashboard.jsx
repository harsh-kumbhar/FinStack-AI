import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import SmartFeedWidget from '../components/smartfeed/SmartFeedWidget';
import { documentVaultService } from '../services/documentVaultService';

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
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.8)',
        transition: 'var(--transition)',
        fontSize: '14px',
        fontWeight: '500'
    },
    navItemActive: {
        backgroundColor: 'var(--navy2)',
        color: 'var(--white)',
        borderLeft: '4px solid var(--saffron)'
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
        marginTop: '70px',
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        maxWidth: '1400px',
        margin: '70px auto 0 auto',
        width: '100%'
    },
    alertCard: {
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
        padding: '20px 24px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    },
    grid2: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
    },
    grid3: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px'
    },
    card: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)'
    },
    cardTitle: {
        fontSize: '14px',
        color: 'var(--text2)',
        marginBottom: '12px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    cardValue: {
        fontSize: '28px',
        color: 'var(--navy)',
        fontWeight: '800',
        fontFamily: "'Noto Sans', sans-serif"
    },
    btnPrimary: {
        padding: '12px 24px',
        backgroundColor: 'var(--saffron)',
        color: 'var(--white)',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '700',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        transition: 'var(--transition)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px'
    },
    btnOutline: {
        padding: '10px 16px',
        backgroundColor: '#F8FAFC',
        color: 'var(--navy)',
        border: '1px solid #E2E8F0',
        borderRadius: '6px',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '13px',
        transition: 'all 0.2s',
    },
    moduleCard: {
        backgroundColor: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '160px',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
    },
    timelineItem: {
        display: 'flex',
        gap: '16px',
        marginBottom: '20px',
        alignItems: 'flex-start'
    },
    timelineIcon: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '16px',
        flexShrink: 0
    }
};

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', active: true, path: '/dashboard' },
    { label: 'Document Vault', path: '/document-vault' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Financial Journey', path: '/financial-journey' },
    { label: 'Loan Risk Assessment', path: '/loan-analyzer' },
    { label: 'Tax Estimator', path: '/tax-estimator' }
];

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [financialData, setFinancialData] = useState(null);
    const [recentDocs, setRecentDocs] = useState([]);

    const [modalOpen, setModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                // 1. Fetch User Profile
                const { data: userProfile } = await supabase
                    .from('user_profile')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (userProfile) {
                    setUserData(userProfile);
                    // 2. Fetch Financial Profile
                    const { data: finProfile } = await supabase
                        .from('financial_profile')
                        .select('*')
                        .eq('user_profile_id', userProfile.id)
                        .maybeSingle();

                    if (finProfile) setFinancialData(finProfile);
                }

                // 3. Fetch Recent Documents from Vault for Activity Feed
                const docsResponse = await documentVaultService.listDocuments(1, 3);
                if (docsResponse && docsResponse.documents) {
                    setRecentDocs(docsResponse.documents);
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
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '40px', height: '40px', border: '4px solid var(--border)', borderTop: '4px solid var(--saffron)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }}></div>
                    <h2 style={{ color: 'var(--navy)', fontFamily: "'Noto Serif', serif" }}>Loading Command Center...</h2>
                </div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const isProfileComplete = userData?.profile_completed || false;
    const income = financialData?.monthly_income || 0;
    const debt = financialData?.total_debt || 0;
    const efund = financialData?.emergency_fund || 0;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div style={styles.layout}>
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader}>FinStack AI</div>
                <nav style={styles.sidebarNav}>
                    {SIDEBAR_ITEMS.map((item, idx) => (
                        <div
                            key={idx}
                            style={{ ...styles.navItem, ...(item.active ? styles.navItemActive : {}) }}
                            onClick={() => item.path && navigate(item.path)}
                        >
                            <span>{item.label}</span>
                        </div>
                    ))}
                </nav>
            </aside>

            <main style={styles.main}>
                <header style={styles.topbar}>
                    <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '18px', fontFamily: "'Noto Serif', serif" }}>
                        Financial Command Center
                    </div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{today}</span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '1px solid var(--border)' }}>
                            🔔
                        </div>
                        <button style={styles.logoutBtn} onClick={logout}>Sign Out</button>
                    </div>
                </header>

                <div style={styles.content}>
                    {!isProfileComplete && (
                        <div style={styles.alertCard}>
                            <div>
                                <h3 style={{ color: '#B45309', marginBottom: '6px', fontSize: '18px' }}>⚠️ Profile Incomplete</h3>
                                <p style={{ color: '#92400E', fontSize: '14px', margin: 0 }}>Upload a salary slip to instantly unlock all AI features.</p>
                            </div>
                            <button style={{ ...styles.btnPrimary, backgroundColor: '#D97706' }} onClick={() => navigate('/profile')}>Complete Profile</button>
                        </div>
                    )}

                    <div style={styles.grid2}>
                        {/* WELCOME CARD */}
                        <div style={{ ...styles.card, background: 'linear-gradient(135deg, #0A192F 0%, #112240 100%)', color: 'white', border: 'none' }}>
                            <h2 style={{ fontSize: '28px', marginBottom: '8px', fontFamily: "'Noto Serif', serif", fontWeight: '700' }}>
                                Welcome back, {userData?.full_name?.split(' ')[0] || 'User'} 👋
                            </h2>
                            <p style={{ color: '#94A3B8', fontSize: '14px', marginBottom: '24px' }}>Here is your financial pulse for today.</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</div>
                                    <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>{userData?.city ? `${userData.city}, ${userData.country}` : 'Not provided'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Primary Goal</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--saffron)', marginTop: '4px' }}>
                                        {financialData?.financial_goal ? financialData.financial_goal.replace('_', ' ').toUpperCase() : 'Not Set'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* QUICK ACTIONS */}
                        <div style={styles.card}>
                            <h3 style={{ ...styles.cardTitle, color: 'var(--navy)' }}>⚡ Quick Actions</h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '20px' }}>
                                <button style={styles.btnOutline} onClick={() => navigate('/document-vault')}>📄 Upload Document</button>
                                <button style={styles.btnOutline} onClick={() => navigate('/health-analyzer')}>🩺 Analyze Finances</button>
                                <button style={styles.btnOutline} onClick={() => navigate('/tax-estimator')}>📊 Estimate Taxes</button>
                                <button style={styles.btnOutline} onClick={() => navigate('/profile')}>✏️ Edit Profile</button>
                            </div>
                        </div>
                    </div>

                    {/* FINANCIAL SNAPSHOT */}
                    <div>
                        <h3 style={{ color: 'var(--navy)', fontSize: '20px', marginBottom: '16px', fontFamily: "'Noto Serif', serif", fontWeight: 'bold' }}>Financial Snapshot</h3>
                        <div style={styles.grid3}>
                            <div style={styles.card}>
                                <div style={styles.cardTitle}>Monthly Income</div>
                                <div style={styles.cardValue}>₹{income.toLocaleString('en-IN')}</div>
                            </div>
                            <div style={styles.card}>
                                <div style={styles.cardTitle}>Total Outstanding Debt</div>
                                <div style={styles.cardValue}>₹{debt.toLocaleString('en-IN')}</div>
                            </div>
                            <div style={styles.card}>
                                <div style={styles.cardTitle}>Emergency Fund</div>
                                <div style={{ ...styles.cardValue, color: efund > (income * 3) ? 'var(--success)' : 'var(--navy)' }}>
                                    ₹{efund.toLocaleString('en-IN')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={styles.grid2}>
                        {/* AI MODULES */}
                        <div>
                            <h3 style={{ color: 'var(--navy)', fontSize: '20px', marginBottom: '16px', fontFamily: "'Noto Serif', serif", fontWeight: 'bold' }}>
                                Application Modules
                            </h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                                <div style={styles.moduleCard} onClick={() => navigate('/document-vault')} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>📁</div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px', fontWeight: '700' }}>Document Vault</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: '1.4' }}>Extract and store data securely from PDFs.</p>
                                    </div>
                                    <div style={{ color: 'var(--saffron)', fontSize: '13px', fontWeight: '700', marginTop: '16px' }}>Open Module →</div>
                                </div>

                                <div style={styles.moduleCard} onClick={() => navigate('/health-analyzer')} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🩺</div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px', fontWeight: '700' }}>Health Analyzer</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: '1.4' }}>AI scoring for savings and debt metrics.</p>
                                    </div>
                                    <div style={{ color: 'var(--saffron)', fontSize: '13px', fontWeight: '700', marginTop: '16px' }}>Open Module →</div>
                                </div>

                                <div style={styles.moduleCard} onClick={() => navigate('/loan-analyzer')} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>💳</div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px', fontWeight: '700' }}>Loan Risk Assessor</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: '1.4' }}>Predict approval odds using XGBoost ML.</p>
                                    </div>
                                    <div style={{ color: 'var(--saffron)', fontSize: '13px', fontWeight: '700', marginTop: '16px' }}>Open Module →</div>
                                </div>

                                <div style={styles.moduleCard} onClick={() => navigate('/tax-estimator')} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚖️</div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px', fontWeight: '700' }}>Tax Estimator</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: '1.4' }}>Conversational Old vs New regime calculator.</p>
                                    </div>
                                    <div style={{ color: 'var(--saffron)', fontSize: '13px', fontWeight: '700', marginTop: '16px' }}>Open Module →</div>
                                </div>

                                <div style={styles.moduleCard} onClick={() => navigate('/smartfeed')} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>📰</div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px', fontWeight: '700' }}>SmartFeed</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: '1.4' }}>Curated financial news and RAG insights.</p>
                                    </div>
                                    <div style={{ color: 'var(--saffron)', fontSize: '13px', fontWeight: '700', marginTop: '16px' }}>Open Module →</div>
                                </div>

                                <div style={styles.moduleCard} onClick={() => navigate('/financial-journey')} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <div>
                                        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🗺️</div>
                                        <h3 style={{ fontSize: '16px', color: 'var(--navy)', marginBottom: '6px', fontWeight: '700' }}>Financial Journey</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text2)', margin: 0, lineHeight: '1.4' }}>Track your milestone progress over time.</p>
                                    </div>
                                    <div style={{ color: 'var(--saffron)', fontSize: '13px', fontWeight: '700', marginTop: '16px' }}>Open Module →</div>
                                </div>

                            </div>
                        </div>

                        {/* RECENT ACTIVITY & SMARTFEED */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <h3 style={{ color: 'var(--navy)', fontSize: '20px', marginBottom: '16px', fontFamily: "'Noto Serif', serif", fontWeight: 'bold' }}>Recent Activity</h3>
                                <div style={{ ...styles.card, padding: '24px 24px 8px 24px' }}>

                                    {recentDocs.length > 0 ? recentDocs.map(doc => (
                                        <div key={doc.id} style={styles.timelineItem}>
                                            <div style={{ ...styles.timelineIcon, backgroundColor: '#E0F2FE', color: '#0284C7' }}>📄</div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '14px', marginBottom: '2px' }}>{doc.original_filename}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>
                                                    Status: <span style={{ color: doc.processing_status === 'completed' ? 'var(--success)' : 'var(--saffron)', fontWeight: '600' }}>{doc.processing_status.toUpperCase()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={styles.timelineItem}>
                                            <div style={{ ...styles.timelineIcon, backgroundColor: '#F1F5F9', color: '#64748B' }}>📝</div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '14px', marginBottom: '2px' }}>Welcome to FinStack</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Account created and ready for setup.</div>
                                            </div>
                                        </div>
                                    )}

                                    {isProfileComplete && (
                                        <div style={styles.timelineItem}>
                                            <div style={{ ...styles.timelineIcon, backgroundColor: '#DCFCE7', color: '#16A34A' }}>✓</div>
                                            <div>
                                                <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '14px', marginBottom: '2px' }}>Financial Profile Secured</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text2)' }}>Core parameters saved to database.</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <SmartFeedWidget />
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