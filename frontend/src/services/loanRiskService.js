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

    async parseDocument(file) {
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            
            const formData = new FormData();
            formData.append('file', file);
            
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await axios.post(`${API_URL}/api/v1/loan-risk/parse-document`, formData, { headers });
            return response.data;
        } catch (error) {
            console.error('Error parsing document:', error);
            throw error;
        }
    }
}

export const loanRiskService = new LoanRiskService();
