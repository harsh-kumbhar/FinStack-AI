import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { financialHealthService } from '../services/financialHealthService';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const styles = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: "'Noto Sans', 'Segoe UI', sans-serif" },
    sidebar: { position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', backgroundColor: 'var(--navy)', color: 'var(--white)', display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: 'var(--shadow)' },
    sidebarHeader: { padding: '20px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Noto Serif', Georgia, serif", cursor: 'pointer' },
    sidebarNav: { flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '4px' },
    navItem: { padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', transition: 'var(--transition)', fontSize: '14px' },
    navItemActive: { backgroundColor: 'var(--navy2)', color: 'var(--white)', borderLeft: '4px solid var(--saffron)' },
    main: { flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' },
    topbar: { position: 'fixed', top: 0, left: '240px', right: 0, height: '64px', backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', zIndex: 90 },
    logoutBtn: { padding: '8px 16px', backgroundColor: 'var(--error-light)', color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '600', cursor: 'pointer' },
    content: { marginTop: '64px', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1400px', margin: '64px auto 0 auto', width: '100%' },
    headerBox: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '28px', color: 'var(--navy)', fontWeight: '800', fontFamily: "'Noto Serif', Georgia, serif", marginBottom: '8px' },
    subtitle: { color: 'var(--text2)', fontSize: '15px' },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' },
    card: { backgroundColor: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' },
    cardTitle: { fontSize: '14px', color: 'var(--text2)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
    cardValue: { fontSize: '32px', fontWeight: '800', color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif" },
    cardSubValue: { fontSize: '14px', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' },
    chartCard: { backgroundColor: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: 'var(--shadow-sm)', height: '400px', display: 'flex', flexDirection: 'column' },
    sectionTitle: { fontSize: '20px', color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif", marginBottom: '24px', fontWeight: 'bold' },
    miniChartGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' },
    miniChartCard: { backgroundColor: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
    compareTable: { width: '100%', borderCollapse: 'collapse', marginTop: '16px' },
    th: { textAlign: 'left', padding: '12px 16px', borderBottom: '2px solid var(--border)', color: 'var(--text2)', fontSize: '13px', textTransform: 'uppercase' },
    td: { padding: '16px', borderBottom: '1px solid var(--border)', color: 'var(--navy)', fontSize: '15px', fontWeight: '500' },
    listSection: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' },
    listItem: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', backgroundColor: 'var(--bg)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', fontSize: '14px', lineHeight: '1.5' },
    emptyState: { textAlign: 'center', padding: '64px', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' },
    btnPrimary: { padding: '12px 24px', backgroundColor: 'var(--saffron)', color: 'var(--white)', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 'bold', cursor: 'pointer', display: 'inline-block', marginTop: '16px' }
};

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'Financial Journey', path: '/financial-journey', active: true },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Settings', soon: true }
];

export default function FinancialJourney() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const [journeyData, setJourneyData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchJourney();
    }, []);

    const fetchJourney = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await financialHealthService.getFinancialJourney();
            setJourneyData(data);
        } catch (err) {
            console.error("Journey fetch error:", err);
            setError("Unable to load your financial journey.");
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return "N/A";
        return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getMetricColor = (metricKey, change) => {
        if (change === 0) return 'var(--text2)';
        const lowerIsBetter = ['debt_to_income_ratio', 'expense_ratio'].includes(metricKey);
        if (lowerIsBetter) return change < 0 ? 'var(--success)' : 'var(--error)';
        return change > 0 ? 'var(--success)' : 'var(--error)';
    };

    const getMetricIcon = (metricKey, change) => {
        if (change === 0) return '−';
        const lowerIsBetter = ['debt_to_income_ratio', 'expense_ratio'].includes(metricKey);
        if (lowerIsBetter) return change < 0 ? '↓' : '↑';
        return change > 0 ? '↑' : '↓';
    };

    const formatValue = (key, val) => {
        if (key === 'emergency_fund_months') return `${val} mo`;
        if (key === 'score') return val.toFixed(1);
        return `${val}%`;
    };

    if (isLoading) {
        return (
            <div style={styles.layout}>
                <aside style={styles.sidebar}><div style={styles.sidebarHeader}>FinStack</div></aside>
                <main style={styles.main}>
                    <div style={{ ...styles.content, alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                        <h2>Loading your financial journey...</h2>
                    </div>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.layout}>
                <aside style={styles.sidebar}><div style={styles.sidebarHeader} onClick={() => navigate('/dashboard')}>FinStack</div></aside>
                <main style={styles.main}>
                    <div style={{ ...styles.content, alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                        <h2 style={{ color: 'var(--error)' }}>{error}</h2>
                        <button style={styles.btnPrimary} onClick={fetchJourney}>Try Again</button>
                    </div>
                </main>
            </div>
        );
    }

    const { report_count, current, score_change, history, comparison, improvements, areas_to_watch } = journeyData;
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const formattedHistory = (history || []).map(h => ({ ...h, displayDate: formatDate(h.date) })).reverse(); // Reverse if backend sends newest first

    return (
        <div style={styles.layout}>
            {/* SIDEBAR */}
            <aside style={styles.sidebar}>
                <div style={styles.sidebarHeader} onClick={() => navigate('/dashboard')}>FinStack</div>
                <nav style={styles.sidebarNav}>
                    {SIDEBAR_ITEMS.map((item, idx) => (
                        <div key={idx} style={{ ...styles.navItem, ...(item.active ? styles.navItemActive : {}) }} onClick={() => item.path && navigate(item.path)}>
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
                <header style={styles.topbar}>
                    <div style={{ fontWeight: '700', color: 'var(--navy)', fontSize: '18px' }}>Journey & Trends</div>
                    <div style={styles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px', fontWeight: '500' }}>{today}</span>
                        <button style={styles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                <div style={styles.content}>
                    <div style={styles.headerBox}>
                        <div>
                            <h1 style={styles.title}>Financial Journey</h1>
                            <p style={styles.subtitle}>Track how your financial health has changed over time.</p>
                        </div>
                        <button style={{ ...styles.btnPrimary, marginTop: 0, backgroundColor: 'var(--white)', color: 'var(--navy)', border: '1px solid var(--border)' }} onClick={() => navigate('/health-analyzer')}>
                            + New Assessment
                        </button>
                    </div>

                    {report_count === 0 ? (
                        <div style={styles.emptyState}>
                            <h2 style={{ color: 'var(--navy)', marginBottom: '16px' }}>No financial journey data available yet.</h2>
                            <p style={{ color: 'var(--text2)' }}>Complete a Financial Health Analysis to start tracking your progress.</p>
                            <button style={styles.btnPrimary} onClick={() => navigate('/health-analyzer')}>Start Analysis</button>
                        </div>
                    ) : (
                        <>
                            {/* SNAPSHOT WIDGETS */}
                            <div style={styles.grid4}>
                                <div style={styles.card}>
                                    <div style={styles.cardTitle}>Current Score</div>
                                    <div style={styles.cardValue}>{current?.score.toFixed(1)} <span style={{ fontSize: '16px', color: 'var(--text3)' }}>/ 100</span></div>
                                    <div style={{ ...styles.cardSubValue, color: 'var(--navy)' }}>Status: {current?.health_status}</div>
                                </div>
                                <div style={styles.card}>
                                    <div style={styles.cardTitle}>Score Change</div>
                                    <div style={styles.cardValue}>
                                        {score_change > 0 ? '+' : ''}{score_change.toFixed(1)}
                                    </div>
                                    <div style={{ ...styles.cardSubValue, color: getMetricColor('score', score_change) }}>
                                        {score_change === 0 ? 'No change from previous' : `${getMetricIcon('score', score_change)} Since last assessment`}
                                    </div>
                                </div>
                                <div style={styles.card}>
                                    <div style={styles.cardTitle}>Assessments</div>
                                    <div style={styles.cardValue}>{report_count}</div>
                                    <div style={styles.cardSubValue}>Total history points</div>
                                </div>
                                <div style={styles.card}>
                                    <div style={styles.cardTitle}>Last Assessment</div>
                                    <div style={{ ...styles.cardValue, fontSize: '24px', marginTop: '8px' }}>{formatDate(current?.date)}</div>
                                </div>
                            </div>

                            {report_count === 1 ? (
                                <div style={{ ...styles.emptyState, backgroundColor: 'var(--info-light)', borderColor: 'var(--info)' }}>
                                    <h3 style={{ color: 'var(--navy)', marginBottom: '8px' }}>Great start! 🚀</h3>
                                    <p style={{ color: 'var(--text)' }}>You have completed your first assessment. Trends, charts, and progress comparisons will appear here automatically after your next assessment.</p>
                                </div>
                            ) : (
                                <>
                                    {/* MAIN CHART */}
                                    <div style={styles.chartCard}>
                                        <h3 style={styles.sectionTitle}>📈 Financial Health Score History</h3>
                                        <div style={{ flex: 1, minHeight: 0 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={formattedHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                                    <XAxis dataKey="displayDate" tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text3)', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow)' }}
                                                        formatter={(value) => [`${value} / 100`, 'Score']}
                                                    />
                                                    <Line type="monotone" dataKey="score" stroke="var(--navy)" strokeWidth={3} dot={{ r: 4, fill: 'var(--saffron)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* MINI TRENDS */}
                                    <div>
                                        <h3 style={styles.sectionTitle}>Key Financial Trends</h3>
                                        <div style={styles.miniChartGrid}>
                                            {['savings_rate', 'debt_to_income_ratio', 'emergency_fund_months', 'investment_ratio', 'expense_ratio'].map((metric) => {
                                                const compData = comparison[metric];
                                                if (!compData) return null;
                                                const color = getMetricColor(metric, compData.change);

                                                return (
                                                    <div key={metric} style={styles.miniChartCard}>
                                                        <div>
                                                            <div style={styles.cardTitle}>{metric.replace(/_/g, ' ')}</div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                                                <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--navy)' }}>
                                                                    {formatValue(metric, compData.current)}
                                                                </span>
                                                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: color }}>
                                                                    {compData.change > 0 ? '+' : ''}{formatValue(metric, compData.change)} {getMetricIcon(metric, compData.change)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ height: '60px' }}>
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <LineChart data={formattedHistory}>
                                                                    <Line type="monotone" dataKey={metric} stroke={color} strokeWidth={2} dot={false} />
                                                                </LineChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* COMPARISON TABLE */}
                                    <div style={styles.card}>
                                        <h3 style={styles.sectionTitle}>Your Progress (First vs Current)</h3>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table style={styles.compareTable}>
                                                <thead>
                                                    <tr>
                                                        <th style={styles.th}>Metric</th>
                                                        <th style={styles.th}>First Assessment</th>
                                                        <th style={styles.th}>Current</th>
                                                        <th style={styles.th}>Total Change</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Object.entries(comparison).map(([key, data]) => (
                                                        <tr key={key}>
                                                            <td style={{ ...styles.td, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</td>
                                                            <td style={{ ...styles.td, color: 'var(--text2)' }}>{formatValue(key, data.first)}</td>
                                                            <td style={styles.td}>{formatValue(key, data.current)}</td>
                                                            <td style={{ ...styles.td, color: getMetricColor(key, data.change), fontWeight: 'bold' }}>
                                                                {data.change > 0 ? '+' : ''}{formatValue(key, data.change)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* IMPROVEMENTS & RISKS */}
                                    <div style={styles.listSection}>
                                        <div style={{ ...styles.card, borderTop: '4px solid var(--success)' }}>
                                            <h3 style={styles.sectionTitle}>✓ What's Improving</h3>
                                            {improvements && improvements.length > 0 ? (
                                                improvements.map((item, i) => (
                                                    <div key={i} style={styles.listItem}>
                                                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>↑</span>
                                                        <span>{item}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: 'var(--text2)', fontSize: '14px', fontStyle: 'italic' }}>
                                                    No major improvements detected yet. Keep building consistent financial habits.
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ ...styles.card, borderTop: '4px solid var(--warning)' }}>
                                            <h3 style={styles.sectionTitle}>⚠️ Areas to Watch</h3>
                                            {areas_to_watch && areas_to_watch.length > 0 ? (
                                                areas_to_watch.map((item, i) => (
                                                    <div key={i} style={styles.listItem}>
                                                        <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>•</span>
                                                        <span>{item}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ color: 'var(--success)', fontSize: '14px', fontWeight: '500' }}>
                                                    ✓ No major warning areas detected.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}