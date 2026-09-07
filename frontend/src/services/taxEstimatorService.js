import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Tax Estimator Service
 * Centralizes all communication with the backend Tax Estimator module.
 * Single source of truth is always the backend deterministic calculation engine.
 */
export const taxEstimatorService = {

    /**
     * Get authenticated authorization header from Supabase session.
     * @returns {Promise<Object>}
     */
    async getAuthHeaders() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            return { Authorization: `Bearer ${session.access_token}` };
        }
        return {};
    },

    /**
     * Fetch pre-filled tax input defaults derived from user's FinStack profile.
     * Gracefully falls back to clean default inputs if profile is empty or backend is offline.
     * @param {string} financialYear - e.g. "2024-25"
     * @returns {Promise<Object>}
     */
    async getProfileDefaults(financialYear = '2024-25') {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/tax-estimator/profile-defaults`, {
                headers,
                params: { financial_year: financialYear }
            });
            return response.data;
        } catch (error) {
            console.warn('Tax Estimator: Could not load profile defaults, using local fallback.', error.message);
            return {
                financial_year: financialYear,
                age: 30,
                gross_salary: 0.0,
                other_income: 0.0,
                deduction_80c: 0.0,
                deduction_80d: 0.0,
                deduction_80tta: 0.0,
                has_profile_data: false,
                field_sources: {
                    gross_salary: { source: 'DEFAULT', confidence: 1.0, notes: 'Default 0.0' },
                    age: { source: 'DEFAULT', confidence: 1.0, notes: 'Default age 30' },
                    deduction_80c: { source: 'DEFAULT', confidence: 1.0, notes: 'Default 0.0' },
                    deduction_80d: { source: 'DEFAULT', confidence: 1.0, notes: 'Default 0.0' },
                    deduction_80tta: { source: 'DEFAULT', confidence: 1.0, notes: 'Default 0.0' }
                },
                disclaimer: 'Pre-filled values are estimates. Review all values before calculating.'
            };
        }
    },

    /**
     * Calculate tax liability by submitting normalized inputs to the backend engine.
     * @param {Object} payload - { financial_year, gross_salary, other_income, deduction_80c, deduction_80d, deduction_80tta }
     * @returns {Promise<Object>}
     */
    async calculateTax(payload) {
        try {
            const headers = await this.getAuthHeaders();
            const body = {
                financial_year: payload.financial_year || '2024-25',
                gross_salary: parseFloat(payload.gross_salary || 0),
                other_income: parseFloat(payload.other_income || 0),
                deduction_80c: parseFloat(payload.deduction_80c || 0),
                deduction_80d: parseFloat(payload.deduction_80d || 0),
                deduction_80tta: parseFloat(payload.deduction_80tta || 0),
                home_loan_interest: parseFloat(payload.home_loan_interest || 0),
                is_user_confirmed: payload.is_user_confirmed !== undefined ? payload.is_user_confirmed : true,
            };
            if (payload.field_sources) body.field_sources = payload.field_sources;
            if (payload.user_overrides) body.user_overrides = payload.user_overrides;
            if (payload.missing_fields) body.missing_fields = payload.missing_fields;
            if (payload.document_id) body.document_id = payload.document_id;

            const response = await axios.post(`${API_URL}/tax-estimator/calculate`, body, { headers });
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: Calculation failed on backend.', error);
            throw error;
        }
    },

    /**
     * Simulate What-If tax scenarios using the authoritative backend engine.
     * Guaranteed zero persistence or mutation of saved assessments.
     * @param {Object} payload - { base_input, scenario_type, scenario_title, overrides }
     * @returns {Promise<Object>}
     */
    async simulateWhatIf(payload) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.post(`${API_URL}/tax-estimator/what-if`, payload, { headers });
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: What-If simulation failed on backend.', error);
            throw error;
        }
    },

    /**
     * Retrieve assessment history for the authenticated user.
     * @returns {Promise<Array>}
     */
    async getHistory() {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/tax-estimator/history`, { headers });
            return response.data?.assessments || [];
        } catch (error) {
            console.warn('Tax Estimator: History fetch failed.', error.message);
            return [];
        }
    },

    /**
     * Retrieve full details of a specific past assessment.
     * @param {string} assessmentId
     * @returns {Promise<Object>}
     */
    async getAssessmentDetail(assessmentId) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/tax-estimator/history/${assessmentId}`, { headers });
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: Assessment detail fetch failed.', error);
            throw error;
        }
    },

    /**
     * Fetch authoritative tax education data, slab structures, deduction limits,
     * calculation flow stages, and glossary terms for the given financial year.
     * Guaranteed zero hardcoding of tax numbers in frontend.
     * @param {string} financialYear - e.g. "2024-25"
     * @returns {Promise<Object>}
     */
    async getTaxEducation(financialYear = '2024-25') {
        try {
            const response = await axios.get(`${API_URL}/tax-estimator/tax-education`, {
                params: { financial_year: financialYear }
            });
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: Failed to fetch tax education rules.', error);
            throw error;
        }
    },

    /**
     * Recalculate a past assessment with the latest tax rules and save new record.
     * @param {string} assessmentId
     * @returns {Promise<Object>}
     */
    async recalculateAssessment(assessmentId) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.post(`${API_URL}/tax-estimator/history/${assessmentId}/recalculate`, {}, { headers });
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: Recalculation failed.', error);
            throw error;
        }
    },

    /**
     * Compare two historical tax assessments side-by-side with full delta breakdown.
     * @param {string} assessmentId1
     * @param {string} assessmentId2
     * @returns {Promise<Object>}
     */
    async compareAssessments(assessmentId1, assessmentId2) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.post(
                `${API_URL}/tax-estimator/history/compare`,
                { assessment_id_1: assessmentId1, assessment_id_2: assessmentId2 },
                { headers }
            );
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: Comparison failed.', error);
            throw error;
        }
    },

    /**
     * Retrieve user's current Tax Estimator milestone for Financial Journey integration.
     * @returns {Promise<Object>}
     */
    async getJourneyMilestone() {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.get(`${API_URL}/tax-estimator/journey/milestone`, { headers });
            return response.data;
        } catch (error) {
            console.warn('Tax Estimator: Journey milestone fetch failed.', error.message);
            return {
                has_assessment: false,
                milestone_status: 'PENDING_ASSESSMENT',
                notes: 'Tax Estimator milestone check failed or offline.'
            };
        }
    },

    /**
     * Stage extracted document data in provisional unconfirmed state.
     * @param {Object} payload
     * @returns {Promise<Object>}
     */
    async stageDocumentData(payload) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.post(`${API_URL}/tax-estimator/documents/stage`, payload, { headers });
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: Staging document data failed.', error);
            throw error;
        }
    },

    /**
     * User confirmation of candidate fields extracted by Document Vault.
     * Turns provisional document fields into trusted NormalizedTaxInput.
     * @param {Object} payload - { document_id, decisions, staged_payload }
     * @returns {Promise<Object>}
     */
    async confirmDocumentReview(payload) {
        try {
            const headers = await this.getAuthHeaders();
            const response = await axios.post(`${API_URL}/tax-estimator/documents/confirm`, payload, { headers });
            return response.data;
        } catch (error) {
            console.error('Tax Estimator: Document review confirmation failed.', error);
            throw error;
        }
    }
};


