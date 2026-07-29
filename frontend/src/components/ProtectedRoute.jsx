import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requireProfile = false }) {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg)' }}>
                <h2 style={{ color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif" }}>Loading...</h2>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requireProfile && userProfile && !userProfile.profile_completed) {
        return <Navigate to="/profile" replace />;
    }

    return children;
}