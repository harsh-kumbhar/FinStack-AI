import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// --- Helper Arrays ---
const NAV_LINKS = [
    { label: "Features", target: "features" },
    { label: "Modules", target: "modules" },
    { label: "Contact", target: "footer" },
];

const FEATURES = [
    {
        icon: "📈",
        title: "Financial Health Score",
        description: "Analyze your financial condition based on income, expenses, and debt.",
    },
    {
        icon: "📰",
        title: "AI SmartFeed",
        description: "Receive personalized financial news and insights based on your behavior.",
    },
    {
        icon: "📄",
        title: "Secure Document Analysis",
        description: "Extract key clauses and risk indicators from uploaded legal documents.",
    },
    {
        icon: "⚖️",
        title: "Loan Risk Analysis",
        description: "Predict loan repayment probability using Bayesian probabilistic models.",
    },
    {
        icon: "💸",
        title: "Expense Tracking",
        description: "Automatically categorize transactions and identify spending patterns.",
    },
    {
        icon: "☁️",
        title: "Cloud Sync",
        description: "Your financial data is securely synchronized across all your devices.",
    },
];

const MODULES = [
    {
        title: "Financial Health",
        status: "Available",
        description: "Real-time tracking of your financial stability.",
    },
    {
        title: "SmartFeed",
        status: "Available",
        description: "AI-curated financial news and personalized tips.",
    },
    {
        title: "Document AI",
        status: "Available",
        description: "Automated analysis of statements and agreements.",
    },
    {
        title: "Tax Estimator",
        status: "Coming Soon",
        description: "Intelligent tax calculation based on current Indian tax slabs.",
    },
    {
        title: "Investment Advisor",
        status: "Coming Soon",
        description: "Robo-advisory for mutual funds and stock recommendations.",
    },
    {
        title: "AI Assistant",
        status: "Coming Soon",
        description: "Conversational interface for instant financial queries.",
    },
];

const FOOTER_LINKS = [
    { label: "GitHub", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Privacy Policy", href: "#" },
];

// --- Styles Object ---
const styles = {
    nav: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "70px",
        backgroundColor: "var(--white)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        zIndex: 1000,
        boxShadow: "var(--shadow-sm)",
    },
    navContainer: {
        width: "min(1200px, 92%)",
        margin: "0 auto",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
    },
    logo: {
        fontSize: "24px",
        fontWeight: "bold",
        color: "var(--navy)",
        cursor: "pointer",
    },
    navLinks: {
        display: "flex",
        gap: "32px",
        alignItems: "center",
    },
    navItem: {
        color: "var(--text2)",
        fontWeight: 500,
        cursor: "pointer",
    },
    buttonGroup: {
        display: "flex",
        gap: "16px",
    },
    btnOutline: {
        padding: "8px 24px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "transparent",
        color: "var(--navy)",
        border: "2px solid var(--navy)",
        fontWeight: 600,
    },
    btnPrimary: {
        padding: "8px 24px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--saffron)",
        color: "var(--white)",
        fontWeight: 600,
        boxShadow: "var(--shadow-sm)",
    },
    btnHeroPrimary: {
        padding: "14px 32px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--saffron)",
        color: "var(--white)",
        fontWeight: 700,
        fontSize: "16px",
        boxShadow: "0 4px 20px rgba(230,92,0,0.35)",
    },
    btnHeroOutline: {
        padding: "14px 32px",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--white)",
        color: "var(--navy)",
        border: "2px solid var(--border)",
        fontWeight: 700,
        fontSize: "16px",
    },
    heroSection: {
        paddingTop: "150px",
        paddingBottom: "80px",
        backgroundColor: "var(--bg)",
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
    },
    heroFlex: {
        display: "flex",
        flexWrap: "wrap",
        gap: "60px",
        alignItems: "center",
    },
    heroText: {
        flex: "1 1 500px",
    },
    heroTitle: {
        fontSize: "clamp(36px, 5vw, 56px)",
        color: "var(--navy)",
        lineHeight: 1.2,
        marginBottom: "24px",
        fontFamily: "'Noto Serif', Georgia, serif",
    },
    heroSubtitle: {
        fontSize: "18px",
        color: "var(--text2)",
        marginBottom: "40px",
        maxWidth: "540px",
    },
    heroDashboardPlaceholder: {
        flex: "1 1 400px",
        backgroundColor: "var(--white)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    mockTopBar: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "16px",
        borderBottom: "1px solid var(--border)",
    },
    mockGrid: {
        display: "flex",
        gap: "16px",
    },
    mockCard: {
        flex: 1,
        height: "100px",
        backgroundColor: "var(--bg)",
        borderRadius: "var(--radius-md)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
    },
    mockChart: {
        height: "180px",
        backgroundColor: "var(--bg)",
        borderRadius: "var(--radius-md)",
        marginTop: "8px",
    },
    section: {
        padding: "100px 0",
        backgroundColor: "var(--white)",
    },
    sectionAlt: {
        padding: "100px 0",
        backgroundColor: "var(--bg)",
    },
    sectionHeader: {
        textAlign: "center",
        marginBottom: "60px",
    },
    sectionTitle: {
        fontSize: "32px",
        color: "var(--navy)",
        marginBottom: "16px",
        fontFamily: "'Noto Serif', Georgia, serif",
    },
    sectionSubtitle: {
        color: "var(--text2)",
        fontSize: "16px",
        maxWidth: "600px",
        margin: "0 auto",
    },
    grid: {
        display: "flex",
        flexWrap: "wrap",
        gap: "24px",
        justifyContent: "center",
    },
    card: {
        flex: "1 1 300px",
        maxWidth: "360px",
        padding: "32px 24px",
        backgroundColor: "var(--white)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        transition: "var(--transition)",
        display: "flex",
        flexDirection: "column",
    },
    cardDisabled: {
        flex: "1 1 300px",
        maxWidth: "360px",
        padding: "32px 24px",
        backgroundColor: "var(--bg)",
        border: "1px dashed var(--border2)",
        borderRadius: "var(--radius-lg)",
        opacity: 0.7,
        display: "flex",
        flexDirection: "column",
    },
    iconWrapper: {
        fontSize: "32px",
        marginBottom: "20px",
        width: "60px",
        height: "60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--saffron-light)",
        borderRadius: "50%",
    },
    cardTitle: {
        fontSize: "20px",
        fontWeight: "bold",
        color: "var(--text)",
        marginBottom: "12px",
    },
    cardDesc: {
        color: "var(--text2)",
        fontSize: "14px",
    },
    statusBadge: {
        alignSelf: "flex-start",
        padding: "4px 12px",
        borderRadius: "var(--radius-sm)",
        fontSize: "12px",
        fontWeight: 600,
        marginBottom: "16px",
    },
    statusAvailable: {
        backgroundColor: "var(--success-light)",
        color: "var(--success)",
    },
    statusSoon: {
        backgroundColor: "var(--warning-light)",
        color: "var(--warning)",
    },
    ctaSection: {
        padding: "120px 0",
        backgroundColor: "var(--navy)",
        color: "var(--white)",
        textAlign: "center",
    },
    footer: {
        backgroundColor: "var(--white)",
        borderTop: "1px solid var(--border)",
        padding: "40px 0",
        color: "var(--text2)",
    },
    footerContent: {
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "24px",
    },
};

export default function LandingPage() {
    const navigate = useNavigate();

    const handleScroll = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
            {/* 1. Navbar */}
            <nav style={styles.nav}>
                <div style={styles.navContainer}>
                    <div style={styles.logo} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                        FinStack
                    </div>
                    <div style={styles.navLinks}>
                        {NAV_LINKS.map((link, index) => (
                            <span
                                key={index}
                                style={styles.navItem}
                                onClick={() => handleScroll(link.target)}
                            >
                                {link.label}
                            </span>
                        ))}
                    </div>
                    <div style={styles.buttonGroup}>
                        <button style={styles.btnOutline} onClick={() => navigate("/login")}>
                            Login
                        </button>
                        <button style={styles.btnPrimary} onClick={() => navigate("/login")}>
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* 2. Hero Section */}
            <section style={styles.heroSection}>
                <div className="container" style={styles.heroFlex}>
                    <div style={styles.heroText}>
                        <h1 style={styles.heroTitle}>
                            AI Powered Personal Finance Platform for India
                        </h1>
                        <p style={styles.heroSubtitle}>
                            A platform that helps users analyze financial health, manage finances, understand documents and receive AI powered insights.
                        </p>
                        <div style={styles.buttonGroup}>
                            <button style={styles.btnHeroPrimary} onClick={() => navigate("/login")}>
                                Get Started
                            </button>
                            <button style={styles.btnHeroOutline} onClick={() => handleScroll("features")}>
                                Explore Features
                            </button>
                        </div>
                    </div>

                    <div style={styles.heroDashboardPlaceholder}>
                        <div style={styles.mockTopBar}>
                            <div style={{ width: "120px", height: "16px", backgroundColor: "var(--border)", borderRadius: "4px" }}></div>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <div style={{ width: "32px", height: "32px", backgroundColor: "var(--bg)", borderRadius: "50%" }}></div>
                                <div style={{ width: "32px", height: "32px", backgroundColor: "var(--saffron-light)", borderRadius: "50%" }}></div>
                            </div>
                        </div>
                        <div style={styles.mockGrid}>
                            <div style={styles.mockCard}>
                                <div style={{ width: "40px", height: "8px", backgroundColor: "var(--border2)", borderRadius: "4px" }}></div>
                                <div style={{ width: "80%", height: "24px", backgroundColor: "var(--navy)", borderRadius: "4px", opacity: 0.1 }}></div>
                            </div>
                            <div style={styles.mockCard}>
                                <div style={{ width: "40px", height: "8px", backgroundColor: "var(--border2)", borderRadius: "4px" }}></div>
                                <div style={{ width: "60%", height: "24px", backgroundColor: "var(--success)", borderRadius: "4px", opacity: 0.1 }}></div>
                            </div>
                        </div>
                        <div style={styles.mockChart}>
                            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
                                <div style={{ width: "30%", height: "12px", backgroundColor: "var(--border)", borderRadius: "4px" }}></div>
                                <div style={{ flex: 1, borderBottom: "1px dashed var(--border)", display: "flex", alignItems: "flex-end", gap: "16px", padding: "0 16px" }}>
                                    {[40, 70, 45, 90, 60, 80].map((h, i) => (
                                        <div key={i} style={{ flex: 1, height: `${h}%`, backgroundColor: "var(--navy)", opacity: 0.8, borderRadius: "4px 4px 0 0" }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Features Section */}
            <section id="features" style={styles.section}>
                <div className="container">
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>Intelligent Financial Insights</h2>
                        <p style={styles.sectionSubtitle}>
                            Empowering your financial journey with advanced machine learning and comprehensive analytics.
                        </p>
                    </div>
                    <div style={styles.grid}>
                        {FEATURES.map((feature, index) => (
                            <div key={index} className="card" style={styles.card}>
                                <div style={styles.iconWrapper}>{feature.icon}</div>
                                <h3 style={styles.cardTitle}>{feature.title}</h3>
                                <p style={styles.cardDesc}>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. Modules Section */}
            <section id="modules" style={styles.sectionAlt}>
                <div className="container">
                    <div style={styles.sectionHeader}>
                        <h2 style={styles.sectionTitle}>FinStack Modules</h2>
                        <p style={styles.sectionSubtitle}>
                            A suite of specialized tools designed to handle every aspect of your personal finances.
                        </p>
                    </div>
                    <div style={styles.grid}>
                        {MODULES.map((mod, index) => {
                            const isAvailable = mod.status === "Available";
                            return (
                                <div key={index} style={isAvailable ? styles.card : styles.cardDisabled}>
                                    <span
                                        style={{
                                            ...styles.statusBadge,
                                            ...(isAvailable ? styles.statusAvailable : styles.statusSoon),
                                        }}
                                    >
                                        {mod.status}
                                    </span>
                                    <h3 style={styles.cardTitle}>{mod.title}</h3>
                                    <p style={styles.cardDesc}>{mod.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 5. Call To Action */}
            <section style={styles.ctaSection}>
                <div className="container">
                    <h2 style={{ ...styles.sectionTitle, color: "var(--white)", marginBottom: "24px" }}>
                        Start your financial journey today.
                    </h2>
                    <p style={{ fontSize: "18px", opacity: 0.9, maxWidth: "600px", margin: "0 auto 40px" }}>
                        Join FinStack and make smarter financial decisions using AI.
                    </p>
                    <button style={styles.btnHeroPrimary} onClick={() => navigate("/login")}>
                        Get Started
                    </button>
                </div>
            </section>

            {/* 6. Footer */}
            <footer id="footer" style={styles.footer}>
                <div className="container" style={styles.footerContent}>
                    <div>
                        <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--navy)", marginBottom: "8px" }}>
                            FinStack
                        </div>
                        <p style={{ fontSize: "14px", maxWidth: "300px" }}>
                            AI Powered Personal Finance and Financial Decision Intelligence Platform.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "24px" }}>
                        {FOOTER_LINKS.map((link, index) => (
                            <a key={index} href={link.href} style={{ fontSize: "14px", fontWeight: 500 }}>
                                {link.label}
                            </a>
                        ))}
                    </div>
                    <div style={{ fontSize: "14px" }}>
                        &copy; 2026 FinStack. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}