import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

export default function TaxInterview() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);

    const prefill = location.state?.prefill || null;

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [isComplete, setIsComplete] = useState(false);
    const [calculating, setCalculating] = useState(false);

    const [slots, setSlots] = useState({
        gross_salary: prefill?.gross_salary || null,
        other_income: prefill?.other_income || null,
        deduction_80c: prefill?.deduction_80c || null,
        deduction_80d: prefill?.deduction_80d || null,
        home_loan_interest: null
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    useEffect(() => {
        const fetchInitialGreeting = async () => {
            try {
                const payload = {
                    messages: [{ role: 'user', content: 'Hi, I am ready to start my tax interview.' }],
                    current_slots: slots
                };

                const response = await taxEstimatorService.sendChatMessage(payload);

                setMessages([{ role: 'assistant', content: response.assistant_reply }]);

                if (response.extracted_slots) {
                    setSlots(response.extracted_slots);
                }
                setIsComplete(response.is_complete);
            } catch (err) {
                console.error("Failed to start chat:", err);
                setMessages([{ role: 'assistant', content: 'Sorry, I am having trouble connecting to the server. Please try refreshing.' }]);
            } finally {
                setIsTyping(false);
            }
        };

        fetchInitialGreeting();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSendMessage = async (textOverride = null) => {
        const text = textOverride !== null ? textOverride : inputValue;
        if (!text.trim()) return;

        const newMessages = [...messages, { role: 'user', content: text }];
        setMessages(newMessages);
        setInputValue('');
        setIsTyping(true);

        try {
            const payload = {
                messages: newMessages,
                current_slots: slots
            };

            const response = await taxEstimatorService.sendChatMessage(payload);

            setMessages(prev => [...prev, { role: 'assistant', content: response.assistant_reply }]);
            setSlots(response.extracted_slots);
            setIsComplete(response.is_complete);

        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, { role: 'assistant', content: "I encountered an error analyzing that. Could you repeat it?" }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const executeTaxCalculation = async () => {
        setCalculating(true);
        try {
            const payload = {
                financial_year: '2024-25',
                gross_salary: slots.gross_salary || 0,
                other_income: slots.other_income || 0,
                deduction_80c: slots.deduction_80c || 0,
                deduction_80d: slots.deduction_80d || 0,
                home_loan_interest: slots.home_loan_interest || 0,
                field_sources: {
                    gross_salary: 'USER_ENTERED',
                    other_income: 'USER_ENTERED',
                    deduction_80c: 'USER_ENTERED',
                    deduction_80d: 'USER_ENTERED',
                    home_loan_interest: 'USER_ENTERED'
                },
                is_user_confirmed: true
            };

            const result = await taxEstimatorService.calculateTax(payload);

            // Navigate back and pass the inputs state so What-If scenarios function perfectly
            navigate('/tax-estimator', { state: { finalResult: result, step: 6, inputs: payload } });

        } catch (err) {
            console.error("Calculation failed:", err);
            alert("Calculation failed. " + (err.response?.data?.detail || err.message));
            setCalculating(false);
        }
    };

    const formatCurrency = (val) => {
        if (val === null || val === undefined) return 'Pending...';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="te-layout">
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

            <div className="te-main" style={{ height: '100vh', overflow: 'hidden' }}>
                <header className="te-topbar">
                    <div style={{ fontWeight: '600', color: 'var(--navy)', fontSize: '15px' }}>
                        AI Tax Interviewer · FY 2024-25
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button className="te-btn-secondary" onClick={() => navigate('/tax-estimator')}>
                            Cancel Interview
                        </button>
                    </div>
                </header>

                <main style={{ marginTop: '64px', height: 'calc(100vh - 64px)', display: 'flex', padding: '24px', gap: '24px', background: '#F8FAFC' }}>

                    {/* LEFT PANEL: Chat Interface */}
                    <div style={{ flex: '2', display: 'flex', flexDirection: 'column', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {messages.map((msg, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    alignItems: 'flex-end'
                                }}>
                                    {msg.role === 'assistant' && (
                                        <div style={{ fontSize: '20px', marginRight: '8px', marginBottom: '4px' }}>🤖</div>
                                    )}
                                    <div style={{
                                        maxWidth: '75%',
                                        padding: '12px 16px',
                                        borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                        background: msg.role === 'user' ? 'var(--navy)' : '#F1F5F9',
                                        color: msg.role === 'user' ? 'var(--white)' : 'var(--navy)',
                                        fontSize: '14.5px',
                                        lineHeight: '1.5',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end' }}>
                                    <div style={{ fontSize: '20px', marginRight: '8px', marginBottom: '4px' }}>🤖</div>
                                    <div style={{
                                        padding: '12px 16px', borderRadius: '16px 16px 16px 0', background: '#F1F5F9', color: 'var(--text3)'
                                    }}>
                                        Typing...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: '#FAFAFA' }}>
                            {!isComplete && (
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                                    <button className="te-btn-pill" onClick={() => handleSendMessage("Yes, that is correct.")}>Yes, correct</button>
                                    <button className="te-btn-pill" onClick={() => handleSendMessage("No, I don't have this.")}>I don't have this</button>
                                    <button className="te-btn-pill" onClick={() => handleSendMessage("What does this mean?")}>What does this mean?</button>
                                </div>
                            )}

                            {isComplete ? (
                                <div style={{ textAlign: 'center', padding: '10px' }}>
                                    <button
                                        className="te-btn-primary"
                                        style={{ width: '100%', justifyContent: 'center', padding: '16px' }}
                                        onClick={executeTaxCalculation}
                                        disabled={calculating}
                                    >
                                        {calculating ? 'Running Deterministic Calculation...' : 'Generate Tax Estimate & Compare Regimes →'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="Type your answer or ask a tax question..."
                                        style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '14.5px', outline: 'none' }}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={isTyping}
                                    />
                                    <button
                                        style={{ padding: '0 24px', background: 'var(--saffron)', color: 'var(--white)', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: isTyping ? 'not-allowed' : 'pointer', opacity: isTyping ? 0.7 : 1 }}
                                        onClick={() => handleSendMessage()}
                                        disabled={isTyping}
                                    >
                                        Send
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Live Slots Tracker */}
                    <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="te-card" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--navy)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                Information Tracker
                                {isComplete && <span style={{ fontSize: '11px', background: '#DCFCE7', color: '#166534', padding: '4px 8px', borderRadius: '12px' }}>COMPLETE</span>}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { key: 'gross_salary', label: 'Gross Annual Salary' },
                                    { key: 'other_income', label: 'Other Income' },
                                    { key: 'deduction_80c', label: 'Sec 80C Investments' },
                                    { key: 'deduction_80d', label: 'Sec 80D Health Premium' },
                                    { key: 'home_loan_interest', label: 'Sec 24b Home Loan' },
                                ].map((item) => {
                                    const val = slots[item.key];
                                    const isFilled = val !== null;

                                    return (
                                        <div key={item.key} style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px', borderRadius: '8px',
                                            border: `1px solid ${isFilled ? '#A7F3D0' : 'var(--border)'}`,
                                            background: isFilled ? '#F0FDF4' : 'var(--bg)',
                                            transition: 'all 0.3s ease'
                                        }}>
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: isFilled ? '#10B981' : 'transparent',
                                                border: isFilled ? 'none' : '2px dashed #CBD5E1',
                                                color: 'white', fontSize: '12px', fontWeight: 'bold'
                                            }}>
                                                {isFilled && '✓'}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '12px', color: isFilled ? '#065F46' : 'var(--text2)', fontWeight: '600' }}>
                                                    {item.label}
                                                </div>
                                                <div style={{ fontSize: '15px', fontWeight: '800', color: isFilled ? '#065F46' : 'var(--text3)' }}>
                                                    {formatCurrency(val)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{ marginTop: '24px', padding: '16px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1E40AF', marginBottom: '4px' }}>🛡️ Deterministic Math Engine</div>
                                <div style={{ fontSize: '12px', color: '#1E3A8A', lineHeight: '1.4' }}>
                                    The AI assistant gathers your inputs and answers questions, but it <strong>does not calculate your tax</strong>. Once all slots are filled, the data is passed to our verified Python engine to execute the complex slab and cess mathematics with 100% accuracy.
                                </div>
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}