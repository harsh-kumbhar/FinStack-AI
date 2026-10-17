import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class LoanRiskService {
    async predictRisk(data) {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await axios.post(`${API_URL}/api/v1/loan-risk/predict`, data, { headers });
            return response.data;
        } catch (error) {
            console.error('Error predicting loan risk:', error);
            throw error;
        }
    }
    async getProfileDefaults() {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get(`${API_URL}/api/v1/loan-risk/profile-defaults`, { headers });
            return response.data;
        } catch (error) {
            console.warn('Loan Risk: Could not load profile defaults, using local fallback.', error.message);
            return {
                EmploymentStatus: 'Employed',
                EducationLevel: 'Bachelor',
                AnnualIncome: 0,
                SavingsAccountBalance: 0,
                CreditScore: 720,
                MonthlyDebtPayments: 0,
                has_profile_data: false,
                field_sources: {
                    EmploymentStatus: { source: 'DEFAULT', notes: 'Default' },
                    EducationLevel: { source: 'DEFAULT', notes: 'Default' },
                    AnnualIncome: { source: 'DEFAULT', notes: 'Default' },
                    SavingsAccountBalance: { source: 'DEFAULT', notes: 'Default' },
                    CreditScore: { source: 'DEFAULT', notes: 'Default' },
                    MonthlyDebtPayments: { source: 'DEFAULT', notes: 'Default' }
                }
            };
        }
    }
    async getMarketOffers() {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const response = await axios.get(`${API_URL}/api/v1/loan-risk/market-offers`, { headers });
            return response.data;
        } catch (error) {
            console.error('Loan Risk: Failed to fetch market offers.', error);
            // Fallback so the UI doesn't crash during network errors
            return { offers: [] };
        }
    }
}

export const loanRiskService = new LoanRiskService();
