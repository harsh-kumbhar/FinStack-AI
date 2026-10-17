import axios from 'axios';
import { supabase } from '../services/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DOCS_API_URL = `${API_BASE_URL}/documents`;

// Helper to get the auth header
const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session found.");
    return { Authorization: `Bearer ${session.access_token}` };
};

export const documentVaultService = {
    // Upload a document
    uploadDocument: async (file, documentType) => {
        const headers = await getAuthHeaders();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);

        const response = await axios.post(DOCS_API_URL, formData, {
            headers: {
                ...headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // List paginated documents
    listDocuments: async (page = 1, pageSize = 20) => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${DOCS_API_URL}?page=${page}&page_size=${pageSize}`, { headers });
        return response.data;
    },

    // Get document statistics
    getStats: async () => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${DOCS_API_URL}/stats`, { headers });
        return response.data;
    },

    // Search documents
    searchDocuments: async (query) => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${DOCS_API_URL}/search?q=${encodeURIComponent(query)}`, { headers });
        return response.data;
    },

    // Filter documents
    filterDocuments: async (filters) => {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        if (filters.documentType) params.append('document_type', filters.documentType);
        if (filters.processingStatus) params.append('processing_status', filters.processingStatus);
        if (filters.expired !== undefined && filters.expired !== '') params.append('expired', filters.expired);

        const response = await axios.get(`${DOCS_API_URL}/filter?${params.toString()}`, { headers });
        return response.data;
    },

    // Get download URL
    getDownloadUrl: async (id) => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${DOCS_API_URL}/${id}/download`, { headers });
        return response.data;
    },

    // Delete document
    deleteDocument: async (id) => {
        const headers = await getAuthHeaders();
        const response = await axios.delete(`${DOCS_API_URL}/${id}`, { headers });
        return response.data;
    },

    // Fetch Extracted Data
    getExtractedData: async (id) => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${DOCS_API_URL}/${id}/extraction`, { headers });
        return response.data;
    },

    // --- NEW: Trigger AI Analysis ---
    aiAnalyzeDocument: async (id) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(`${DOCS_API_URL}/${id}/ai-analyze`, {}, { headers });
        return response.data;
    },

    // --- NEW: Confirm Data ---
    confirmDocumentData: async (id) => {
        const headers = await getAuthHeaders();
        const response = await axios.post(`${DOCS_API_URL}/${id}/confirm`, {}, { headers });
        return response.data;
    }
};