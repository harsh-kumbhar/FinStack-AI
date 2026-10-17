import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { documentVaultService } from "../services/documentVaultService";

import "../styles/documentVault.css";

// FinStack Layout Styles
const layoutStyles = {
    layout: { display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)', fontFamily: "'Noto Sans', 'Segoe UI', sans-serif" },
    sidebar: { position: 'fixed', left: 0, top: 0, bottom: 0, width: '240px', backgroundColor: 'var(--navy)', color: 'var(--white)', display: 'flex', flexDirection: 'column', zIndex: 100, boxShadow: 'var(--shadow)' },
    sidebarHeader: { padding: '20px', fontSize: '24px', fontWeight: 'bold', borderBottom: '1px solid rgba(255,255,255,0.1)', fontFamily: "'Noto Serif', Georgia, serif" },
    sidebarNav: { flex: 1, padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '4px' },
    navItem: { padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', transition: 'var(--transition)', fontSize: '14px' },
    navItemActive: { backgroundColor: 'var(--navy2)', color: 'var(--white)', borderLeft: '4px solid var(--saffron)' },
    badge: { fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
    main: { flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' },
    topbar: { position: 'fixed', top: 0, left: '240px', right: 0, height: '64px', backgroundColor: 'var(--white)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', zIndex: 90 },
    topbarRight: { display: 'flex', alignItems: 'center', gap: '24px' },
    logoutBtn: { padding: '8px 16px', backgroundColor: 'var(--error-light, #FEE2E2)', color: 'var(--error, #C0392B)', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' },
    content: { marginTop: '64px', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }
};

const SIDEBAR_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Document Vault', active: true, path: '/document-vault' },
    { label: 'Financial Health Analyzer', path: '/health-analyzer' },
    { label: 'SmartFeed', path: '/smartfeed' },
    { label: 'Financial Journey', path: '/financial-journey' },
    { label: 'Loan Risk Assessment', path: '/loan-analyzer' },
    { label: 'Tax Estimator', path: '/tax-estimator' }
];

const DOCUMENT_TYPES = [
    { value: 'salary_slip', label: 'Salary Slip' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'itr', label: 'ITR' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'loan_statement', label: 'Loan Statement' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'investment', label: 'Investment' },
    { value: 'credit_card', label: 'Credit Card' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

function formatFileSize(bytes) {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date) {
    if (!date) return "Unknown date";
    return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function getDocumentTypeLabel(type) {
    return DOCUMENT_TYPES.find((item) => item.value === type)?.label || type?.replaceAll("_", " ") || "Document";
}

function getFileIcon(mimeType) {
    if (mimeType === "application/pdf") return "📕";
    if (mimeType?.startsWith("image/")) return "🖼️";
    return "📄";
}

function formatKeyName(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default function DocumentVault() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Document Data State
    const [documents, setDocuments] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Upload State
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedType, setSelectedType] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [analyzingId, setAnalyzingId] = useState(null);
    const [confirmingId, setConfirmingId] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({ documentType: '', processingStatus: '', expired: '' });

    // Extraction Modal State
    const [extractionModalOpen, setExtractionModalOpen] = useState(false);
    const [selectedDocForExtraction, setSelectedDocForExtraction] = useState(null);
    const [extractionData, setExtractionData] = useState(null);
    const [isExtractionLoading, setIsExtractionLoading] = useState(false);
    const [extractionError, setExtractionError] = useState("");

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [docsData, statsData] = await Promise.all([
                documentVaultService.listDocuments(1, 50),
                documentVaultService.getStats()
            ]);
            setDocuments(docsData.documents || []);
            setStats(statsData);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || "Failed to load document vault.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchAndFilter = async () => {
        setLoading(true);
        setError("");
        try {
            let results = [];
            if (searchQuery) {
                results = await documentVaultService.searchDocuments(searchQuery);
            } else if (filters.documentType || filters.processingStatus || filters.expired) {
                results = await documentVaultService.filterDocuments(filters);
            } else {
                const data = await documentVaultService.listDocuments(1, 50);
                results = data.documents || [];
            }
            setDocuments(results);
        } catch (err) {
            setError(err.response?.data?.detail || err.message || "Failed to fetch filtered documents.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => { handleSearchAndFilter(); }, 500);
        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, filters]);

    // File Selection Handlers
    function handleFileSelect(file) {
        setError(""); setSuccessMsg("");
        if (!file) { setSelectedFile(null); return; }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            setError("Only PDF, JPEG, and PNG files are allowed."); setSelectedFile(null); return;
        }
        if (file.size > MAX_FILE_SIZE) {
            setError("File size exceeds the 10 MB limit."); setSelectedFile(null); return;
        }
        setSelectedFile(file);
    }
    function handleFileInput(event) { handleFileSelect(event.target.files?.[0]); }
    function handleDragOver(e) { e.preventDefault(); e.currentTarget.classList.add("drag-active"); }
    function handleDragLeave(e) { e.preventDefault(); e.currentTarget.classList.remove("drag-active"); }
    function handleDrop(e) { e.preventDefault(); e.currentTarget.classList.remove("drag-active"); handleFileSelect(e.dataTransfer.files?.[0]); }

    // API Handlers
    async function handleUpload(event) {
        event.preventDefault();
        if (!selectedFile) { setError("Please select a document first."); return; }
        if (!selectedType) { setError("Please select a document category."); return; }
        try {
            setIsUploading(true); setError(""); setSuccessMsg("");
            await documentVaultService.uploadDocument(selectedFile, selectedType);
            setSelectedFile(null); setSelectedType("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            setSuccessMsg("Document uploaded successfully.");
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || err.message || "Document upload failed.");
        } finally {
            setIsUploading(false);
        }
    }

    async function handleDownload(documentId) {
        try {
            setError("");
            const result = await documentVaultService.getDownloadUrl(documentId);
            if (result?.download_url) window.open(result.download_url, "_blank", "noopener,noreferrer");
        } catch (err) {
            setError(err.response?.data?.detail || "Unable to generate secure download link.");
        }
    }

    async function handleDelete(documentId) {
        const confirmed = window.confirm("Are you sure you want to permanently delete this document?");
        if (!confirmed) return;
        try {
            setDeletingId(documentId); setError("");
            await documentVaultService.deleteDocument(documentId);
            setSuccessMsg("Document deleted successfully.");
            await fetchData();
        } catch (err) {
            setError(err.response?.data?.detail || "Unable to delete document.");
        } finally {
            setDeletingId(null);
        }
    }

    // --- AI Analyze Action ---
    async function handleAIAnalyze(doc) {
        try {
            setAnalyzingId(doc.id);
            setError("");
            await documentVaultService.aiAnalyzeDocument(doc.id);
            setSuccessMsg("AI Analysis complete!");
            await fetchData();
            handleViewExtraction(doc); // Automatically open the results modal
        } catch (err) {
            setError(err.response?.data?.detail || "AI Analysis failed.");
        } finally {
            setAnalyzingId(null);
        }
    }

    async function handleViewExtraction(doc) {
        setSelectedDocForExtraction(doc);
        setExtractionModalOpen(true);
        setIsExtractionLoading(true);
        setExtractionError("");
        setExtractionData(null);
        try {
            const data = await documentVaultService.getExtractedData(doc.id);
            setExtractionData(data);
        } catch (err) {
            setExtractionError(err.response?.data?.detail || "Extraction data is not available yet.");
        } finally {
            setIsExtractionLoading(false);
        }
    }

    // --- Confirm Data Action ---
    async function handleConfirmData(documentId) {
        try {
            setConfirmingId(true);
            await documentVaultService.confirmDocumentData(documentId);
            setExtractionModalOpen(false);
            setSuccessMsg("Financial data confirmed and saved to your profile!");
            await fetchData();
        } catch (err) {
            setExtractionError(err.response?.data?.detail || "Failed to confirm data.");
        } finally {
            setConfirmingId(false);
        }
    }

    function getConfidenceClass(confidence) {
        if (!confidence && confidence !== 0) return 'confidence-medium';
        if (confidence >= 0.90) return 'confidence-high';
        if (confidence >= 0.70) return 'confidence-medium';
        return 'confidence-low';
    }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div style={layoutStyles.layout}>
            {/* SIDEBAR */}
            <aside style={layoutStyles.sidebar}>
                <div style={layoutStyles.sidebarHeader}>FinStack</div>
                <nav style={layoutStyles.sidebarNav}>
                    {SIDEBAR_ITEMS.map((item, idx) => (
                        <div key={idx} style={{ ...layoutStyles.navItem, ...(item.active ? layoutStyles.navItemActive : {}) }} onClick={() => { if (item.path) navigate(item.path); }}>
                            <span>{item.label}</span>
                            {item.soon && <span style={layoutStyles.badge}>Soon</span>}
                        </div>
                    ))}
                </nav>
                <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={layoutStyles.navItem} onClick={logout}>Logout</div>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main style={layoutStyles.main}>
                <header style={layoutStyles.topbar}>
                    <div style={{ fontWeight: '600', color: 'var(--navy)', fontFamily: "'Noto Serif', Georgia, serif", fontSize: '18px' }}>
                        Document Vault
                    </div>
                    <div style={layoutStyles.topbarRight}>
                        <span style={{ color: 'var(--text2)', fontSize: '14px' }}>{today}</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg2)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}>🔔</div>
                        <button style={layoutStyles.logoutBtn} onClick={logout}>Logout</button>
                    </div>
                </header>

                <div style={layoutStyles.content}>
                    <div className="vault-page-header">
                        <div className="vault-header-text">
                            <h1 className="noto-serif">Intelligent Document Vault</h1>
                            <p className="text-secondary">Securely store your financial documents in one place. Analyze them with AI to power your financial profile.</p>
                        </div>
                        <div className="vault-security-badge">
                            <span className="badge-icon">🔒</span>
                            <div className="badge-text">
                                <strong>Private & Secure</strong>
                                <small>End-to-end encryption</small>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="vault-alert vault-alert-error">
                            <span className="alert-icon">⚠️</span>
                            <span className="alert-text">{error}</span>
                            <button onClick={() => setError("")}>✕</button>
                        </div>
                    )}
                    {successMsg && (
                        <div className="vault-alert vault-alert-success">
                            <span className="alert-icon">✓</span>
                            <span className="alert-text">{successMsg}</span>
                            <button onClick={() => setSuccessMsg("")}>✕</button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        <div className="finstack-card" style={{ flex: '1', minWidth: '250px', padding: '24px' }}>
                            <h2 className="noto-serif" style={{ fontSize: '18px', marginBottom: '16px' }}>Vault Statistics</h2>
                            {stats ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                        <span className="text-secondary">Total Documents</span>
                                        <strong className="text-primary" style={{ fontSize: '18px' }}>{stats.total_documents}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                                        <span className="text-secondary">Active</span>
                                        <strong style={{ color: 'var(--india-green)' }}>{stats.active_documents}</strong>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-tertiary">Loading statistics...</p>
                            )}
                        </div>

                        <section className="finstack-card upload-card" style={{ flex: '2', minWidth: '400px', margin: 0 }}>
                            <div className="card-header-finstack"><h2 className="noto-serif">Upload a Document</h2></div>
                            <div className="upload-card-body">
                                <form onSubmit={handleUpload}>
                                    <div className={`drop-zone ${selectedFile ? "has-file" : ""}`} onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                                        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileInput} hidden />
                                        {selectedFile ? (
                                            <div className="selected-file-container">
                                                <div className="selected-file-icon">{getFileIcon(selectedFile.type)}</div>
                                                <div className="selected-file-info">
                                                    <strong className="text-primary">{selectedFile.name}</strong>
                                                    <span className="text-tertiary">{formatFileSize(selectedFile.size)}</span>
                                                </div>
                                                <button type="button" className="btn-outline-danger" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>Remove</button>
                                            </div>
                                        ) : (
                                            <div className="empty-drop-zone">
                                                <div className="upload-icon">⬆️</div>
                                                <strong className="text-primary">Drag and drop your document here</strong>
                                                <span className="text-secondary">or <b style={{ color: 'var(--saffron)' }}>browse files</b></span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="upload-controls">
                                        <div className="document-type-field">
                                            <select className="finstack-input" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                                                <option value="">Select Document Category...</option>
                                                {DOCUMENT_TYPES.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
                                            </select>
                                        </div>
                                        <button className="btn-hero-primary" type="submit" disabled={isUploading || !selectedFile || !selectedType}>
                                            {isUploading ? "Encrypting & Uploading..." : "Upload Securely"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </section>
                    </div>

                    <section className="documents-section">
                        <div className="documents-toolbar">
                            <h2 className="noto-serif">Stored Documents <span className="doc-count">({documents.length})</span></h2>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <input type="text" placeholder="Search filename..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="finstack-input" style={{ width: '200px' }} />
                            </div>
                        </div>

                        {loading ? (
                            <div className="vault-empty-state finstack-card">
                                <div className="vault-spinner"></div>
                                <p className="text-secondary">Decrypting and loading your vault...</p>
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="vault-empty-state finstack-card">
                                <div className="empty-document-icon">📂</div>
                                <h3 className="noto-serif">Your vault is empty</h3>
                                <p className="text-secondary">Upload your first financial document to get started.</p>
                            </div>
                        ) : (
                            <div className="document-grid">
                                {documents.map((document) => (
                                    <article className="finstack-card document-card" key={document.id}>
                                        <div className="document-card-top">
                                            <div className="document-icon">{getFileIcon(document.mime_type)}</div>
                                            <span className={`status-chip status-${document.processing_status?.toLowerCase() || "pending"}`}>
                                                {document.processing_status || "Pending"}
                                            </span>
                                        </div>
                                        <div className="document-card-body">
                                            <h3 className="doc-title" title={document.original_filename}>{document.original_filename}</h3>
                                            <span className="document-type">{getDocumentTypeLabel(document.document_type)}</span>
                                        </div>

                                        <div className="document-card-actions" style={{ flexWrap: 'wrap', marginTop: '12px', gap: '8px' }}>
                                            <button
                                                className="btn-sm-solid"
                                                style={{ backgroundColor: 'var(--navy)' }}
                                                disabled={analyzingId === document.id}
                                                onClick={() => handleAIAnalyze(document)}
                                            >
                                                {analyzingId === document.id ? "Analyzing..." : "🤖 AI Analyze"}
                                            </button>

                                            {document.processing_status?.toLowerCase() === 'completed' && (
                                                <button className="btn-sm-solid" style={{ backgroundColor: 'var(--saffron)' }} onClick={() => handleViewExtraction(document)}>
                                                    View Data
                                                </button>
                                            )}

                                            <button className="btn-sm-outline-danger" disabled={deletingId === document.id} onClick={() => handleDelete(document.id)}>
                                                {deletingId === document.id ? "..." : "Delete"}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>

            {/* EXTRACTION DATA MODAL */}
            {extractionModalOpen && (
                <div className="extraction-modal-overlay" onClick={() => setExtractionModalOpen(false)}>
                    <div className="extraction-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="extraction-modal-header">
                            <h2 className="noto-serif">AI Extracted Financial Data</h2>
                            <button className="extraction-close-btn" onClick={() => setExtractionModalOpen(false)}>✕</button>
                        </div>

                        <div className="extraction-modal-body">
                            {isExtractionLoading ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div className="vault-spinner"></div>
                                    <p className="text-secondary">Retrieving AI structure...</p>
                                </div>
                            ) : extractionError ? (
                                <div className="vault-alert vault-alert-error" style={{ margin: 0 }}>
                                    <span className="alert-icon">⚠️</span>
                                    <span className="alert-text">{extractionError}</span>
                                </div>
                            ) : extractionData ? (
                                <div>
                                    <div className="extraction-meta">
                                        <div><span className="text-secondary">Source: </span><strong className="text-primary">{selectedDocForExtraction?.original_filename}</strong></div>
                                        <div className={`confidence-badge ${getConfidenceClass(extractionData.confidence_score)}`}>
                                            🎯 Confidence: {extractionData.confidence_score ? `${(extractionData.confidence_score * 100).toFixed(0)}%` : 'High (AI)'}
                                        </div>
                                    </div>

                                    {/* Top-level Key-Value Grid */}
                                    <div className="extraction-data-grid">
                                        {Object.entries(extractionData.extracted_data || {}).map(([key, value]) => {
                                            // Render only primitives in this grid
                                            if (Array.isArray(value) || typeof value === 'object' && value !== null) return null;

                                            // Format currency if it's a number and currency exists
                                            let displayValue = value;
                                            if (typeof value === 'number' && extractionData.extracted_data.currency) {
                                                try {
                                                    displayValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: extractionData.extracted_data.currency }).format(value);
                                                } catch (e) {
                                                    displayValue = String(value); // Fallback if currency code is invalid
                                                }
                                            } else if (value === null || value === '') {
                                                displayValue = '-';
                                            } else {
                                                displayValue = String(value);
                                            }

                                            return (
                                                <div className="data-field" key={key}>
                                                    <span className="data-label">{formatKeyName(key)}</span>
                                                    <span className="data-value">{displayValue}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Dynamically Render Nested Arrays as Tables */}
                                    {Object.entries(extractionData.extracted_data || {}).map(([key, value]) => {
                                        if (!Array.isArray(value) || value.length === 0) return null;

                                        const headers = Object.keys(value[0] || {});
                                        if (headers.length === 0) return null;

                                        return (
                                            <div key={key} style={{ marginTop: '32px' }}>
                                                <h3 className="noto-serif" style={{ fontSize: '16px', borderBottom: '2px solid var(--border)', paddingBottom: '8px', marginBottom: '16px' }}>
                                                    {formatKeyName(key)}
                                                </h3>
                                                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                                                        <thead style={{ backgroundColor: 'var(--bg2)' }}>
                                                            <tr>
                                                                {headers.map(header => (
                                                                    <th key={header} style={{ padding: '12px 16px', color: 'var(--text2)', textTransform: 'uppercase', fontSize: '12px', fontWeight: '700' }}>
                                                                        {formatKeyName(header)}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {value.map((row, idx) => (
                                                                <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                                                                    {headers.map(header => {
                                                                        let cellVal = row[header];
                                                                        if (typeof cellVal === 'number' && extractionData.extracted_data.currency) {
                                                                            try {
                                                                                cellVal = new Intl.NumberFormat('en-US', { style: 'currency', currency: extractionData.extracted_data.currency }).format(cellVal);
                                                                            } catch (e) {
                                                                                cellVal = String(cellVal);
                                                                            }
                                                                        }
                                                                        return (
                                                                            <td key={header} style={{ padding: '12px 16px', color: 'var(--navy)' }}>
                                                                                {cellVal !== null && cellVal !== undefined ? String(cellVal) : '-'}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Confirmation Action Area */}
                                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        {extractionData.normalization_status === 'confirmed' ? (
                                            <span style={{ color: 'var(--india-green)', fontWeight: 'bold' }}>✓ Data Confirmed</span>
                                        ) : (
                                            <span className="text-secondary">Please review the extracted data before saving.</span>
                                        )}
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <button
                                                className="btn-sm-outline-danger"
                                                onClick={() => setExtractionModalOpen(false)}
                                            >
                                                Close
                                            </button>
                                            <button
                                                className="btn-hero-primary"
                                                style={{ height: '40px', padding: '0 24px' }}
                                                disabled={confirmingId || extractionData.normalization_status === 'confirmed'}
                                                onClick={() => handleConfirmData(selectedDocForExtraction.id)}
                                            >
                                                {confirmingId ? "Saving..." : extractionData.normalization_status === 'confirmed' ? "Saved to Profile" : "Confirm & Save to Profile"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}