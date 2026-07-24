import axios from 'axios';
import { supabase } from "../services/supabase";
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const financialHealthService = {
  /**
   * Send financial profile data to the backend ML predictor.
   * @param {Object} profileData 
   * @returns {Promise<Object>} The prediction result
   */
  async predictFinancialHealth(profileData) {
    try {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        const response = await axios.post(
            `${API_URL}/financial-health/predict`,
            {
                age: parseInt(profileData.age, 10),
                employment_status: profileData.employment_status,
                monthly_income: parseFloat(profileData.monthly_income),
                monthly_expenses: parseFloat(profileData.monthly_expenses),
                monthly_savings: parseFloat(profileData.monthly_savings),
                emergency_fund: parseFloat(profileData.emergency_fund),
                total_debt: parseFloat(profileData.total_debt),
                investments: parseFloat(profileData.investments),
                insurance_cover: parseFloat(profileData.insurance_cover),
                financial_goal: profileData.financial_goal,
            },
            {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            }
        );
      return response.data;
    } catch (error) {
      console.error('Error fetching prediction from backend:', error);
      
      // Fallback/Mock Response if the backend is down or returns error
      const mockResult = this.getMockPrediction(profileData);
      console.log('Using mock response as fallback:', mockResult);
  
    }
  },

  /**
   * Generate a mock response matching the backend schema based on the input data.
   */
  getMockPrediction(profileData) {
    const income = parseFloat(profileData.monthly_income) || 0;
    const expenses = parseFloat(profileData.monthly_expenses) || 0;
    const savings = parseFloat(profileData.monthly_savings) || 0;
    const debt = parseFloat(profileData.total_debt) || 0;
    const emergencyFund = parseFloat(profileData.emergency_fund) || 0;
    const investments = parseFloat(profileData.investments) || 0;

    const savingsRate = income > 0 ? (savings / income) * 100 : 0;
    const expenseRatio = income > 0 ? (expenses / income) * 100 : 0;
    const debtToIncome = income > 0 ? (debt / (income * 12)) * 100 : 0;
    const emergencyMonths = expenses > 0 ? emergencyFund / expenses : 0;

    let score = 50;
    let status = 'Fair';
    let strengths = [];
    let weaknesses = [];
    let risks = [];
    let recommendations = [];

    // Calculate score & feedback rules (mock logic matching typical ml behaviors)
    if (savingsRate > 20) {
      score += 15;
      strengths.push('Healthy monthly savings rate (>20%).');
    } else if (savingsRate < 5) {
      score -= 10;
      weaknesses.push('Critically low savings rate (<5%).');
      recommendations.push('Try to reduce non-essential expenses to hit at least a 10% savings rate.');
    }

    if (emergencyMonths >= 6) {
      score += 15;
      strengths.push('Strong emergency fund buffer (6+ months of expenses).');
    } else if (emergencyMonths < 3) {
      score -= 10;
      weaknesses.push('Insufficient emergency fund (less than 3 months of expenses).');
      risks.push('Vulnerable to financial shocks due to inadequate emergency cushion.');
      recommendations.push('Prioritize building a 3-to-6 month emergency fund buffer.');
    }

    if (debtToIncome < 15) {
      score += 10;
      strengths.push('Low debt-to-income ratio.');
    } else if (debtToIncome > 40) {
      score -= 15;
      weaknesses.push('High debt burden relative to income.');
      risks.push('High debt service requirements may strain cashflow.');
      recommendations.push('Develop a debt payoff strategy using methods like Snowball or Avalanche.');
    }

    if (investments > (income * 3)) {
      score += 10;
      strengths.push('Good progress on investment portfolio accumulation.');
    }

    if (score >= 80) {
      status = 'Excellent';
    } else if (score >= 65) {
      status = 'Good';
    } else if (score >= 45) {
      status = 'Fair';
    } else {
      status = 'Poor';
    }

    // Cap score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      ml_health_score: score,
      health_status: status,
      model_version: 'XGBoost v1.0 (Mock Fallback)',
      strengths: strengths.length ? strengths : ['Basic regular income source.'],
      weaknesses: weaknesses.length ? weaknesses : ['No significant weaknesses identified.'],
      risks: risks.length ? risks : ['Market/Inflation risk matches standard profiles.'],
      recommendations: recommendations.length ? recommendations : ['Review your goals semi-annually and diversify investments.'],
      ai_summary: `Based on your profile, your financial health is ${status.toUpperCase()} with an AI score of ${score}/100. Your primary focus should be aligning your monthly allocations with your goal: ${profileData.financial_goal.replace('_', ' ')}.`
    };
  }
};
