import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        padding: '20px'
    },
    card: {
        backgroundColor: 'var(--white)',
        padding: '40px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
        border: '1px solid var(--border)'
    },
    heading: {
        color: 'var(--navy)',
        marginBottom: '12px',
        fontFamily: "'Noto Serif', Georgia, serif",
        fontSize: '28px'
    },
    subtitle: {
        color: 'var(--text2)',
        marginBottom: '32px',
        fontSize: '15px'
    },
    loginButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
        padding: '14px',
        backgroundColor: 'var(--white)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px'
    },
    backButton: {
        backgroundColor: 'transparent',
        color: 'var(--text2)',
        border: 'none',
        fontSize: '14px',
        cursor: 'pointer'
    }
};

export default function LoginPage() {
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, navigate]);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.heading}>Welcome to FinStack</h2>
                <p style={styles.subtitle}>Continue with your Google Account.</p>

                <button style={styles.loginButton} onClick={login}>
                    <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                </button>

                <button style={styles.backButton} onClick={() => navigate('/')}>
                    ← Back to Home
                </button>
            </div>
        </div>
    );
}