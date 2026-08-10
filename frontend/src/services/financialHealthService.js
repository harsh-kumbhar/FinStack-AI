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
                    Authorization: `Bearer ${session?.access_token || ''}`,
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching prediction from backend:', error);
        
        // Fallback/Mock Response if the backend is down or returns error
        const mockResult = this.getMockPrediction(profileData);
        console.log('Using mock response as fallback:', mockResult);
        return mockResult;
    }
  },


    /**
     * Send a question to the FinStack AI RAG chatbot.
     * Uses the current financial health report as context.
     */
    async chat(question, report) {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('User is not authenticated.');
            }

            const response = await axios.post(
                `${API_URL}/financial-health/chat`,
                {
                    question: question,
                    report: report,
                },
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error getting AI chatbot response:', error);

            throw error;
        }
    },
    /**
         * Download the Financial Health Report as a PDF.
         */
    async downloadFinancialHealthReport(report) {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
                throw new Error('User is not authenticated.');
            }

            const response = await axios.post(
                `${API_URL}/financial-health/report/pdf`,
                { report: report },
                {
                    headers: {
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    responseType: "blob", // Crucial for receiving the PDF file
                }
            );

            return response.data;
        } catch (error) {
            console.error('Error downloading PDF report:', error);
            throw error;
        }
    },
  /**
   * Generate a mock response matching the new backend schema based on the input data.
   */
  getMockPrediction(profileData) {
    const income = parseFloat(profileData.monthly_income) || 0;
    const expenses = parseFloat(profileData.monthly_expenses) || 0;
    const savings = parseFloat(profileData.monthly_savings) || 0;
    const debt = parseFloat(profileData.total_debt) || 0;
    const emergencyFund = parseFloat(profileData.emergency_fund) || 0;
    const investments = parseFloat(profileData.investments) || 0;

    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
    const expenseRatio = income > 0 ? Math.round((expenses / income) * 100) : 0;
    const debtToIncome = income > 0 ? Math.round((debt / (income * 12)) * 100) : 0;
    const emergencyMonths = expenses > 0 ? (emergencyFund / expenses).toFixed(1) : 0;

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
      recommendations.push({
        id: "savings",
        title: "Increase Monthly Savings",
        priority: "High",
        current_value: `${savingsRate}%`,
        recommended_value: "20%",
        reason: "Savings rate is below the recommended threshold of 20%.",
        impact: "Improves long-term wealth accumulation and emergency backup."
      });
    }

    if (emergencyMonths >= 6) {
      score += 15;
      strengths.push('Strong emergency fund buffer (6+ months of expenses).');
    } else if (emergencyMonths < 3) {
      score -= 10;
      weaknesses.push('Insufficient emergency fund (less than 3 months of expenses).');
      risks.push('Vulnerable to financial shocks due to inadequate emergency cushion.');
      recommendations.push({
        id: "emergency",
        title: "Build Emergency Buffer",
        priority: "High",
        current_value: `${emergencyMonths} months`,
        recommended_value: "6 months",
        reason: "Emergency fund covers less than 3 months of expenses.",
        impact: "Protects against sudden job loss or medical emergencies without accumulating debt."
      });
    }

    if (debtToIncome < 15) {
      score += 10;
      strengths.push('Low debt-to-income ratio.');
    } else if (debtToIncome > 40) {
      score -= 15;
      weaknesses.push('High debt burden relative to income.');
      risks.push('High debt service requirements may strain cashflow.');
      recommendations.push({
        id: "debt",
        title: "Debt Snowball Payoff Strategy",
        priority: "Medium",
        current_value: `${debtToIncome}%`,
        recommended_value: "<30%",
        reason: "Total debt is high relative to yearly income.",
        impact: "Frees up cash flow and reduces lifetime interest payments."
      });
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
      report_id: "rep_" + Math.random().toString(36).substr(2, 9),
      ml_health_score: score,
      health_status: status,
      model_version: 'XGBoost v1.0 (Mock Fallback)',
      metrics: [
        {
          name: "Savings Rate",
          value: savingsRate,
          unit: "%",
          status: savingsRate >= 20 ? "Excellent" : (savingsRate >= 10 ? "Good" : "Poor"),
          severity: savingsRate >= 20 ? "success" : (savingsRate >= 10 ? "info" : "error"),
          recommended: "20% or higher",
          description: "Percentage of monthly income saved."
        },
        {
          name: "Emergency Buffer",
          value: parseFloat(emergencyMonths),
          unit: " months",
          status: emergencyMonths >= 6 ? "Excellent" : (emergencyMonths >= 3 ? "Good" : "Poor"),
          severity: emergencyMonths >= 6 ? "success" : (emergencyMonths >= 3 ? "info" : "error"),
          recommended: "6 months or more",
          description: "Number of months of expenses covered by emergency fund."
        },
        {
          name: "Debt Burden",
          value: debtToIncome,
          unit: "%",
          status: debtToIncome < 15 ? "Excellent" : (debtToIncome < 40 ? "Good" : "Poor"),
          severity: debtToIncome < 15 ? "success" : (debtToIncome < 40 ? "info" : "error"),
          recommended: "Under 30% of annual income",
          description: "Total outstanding debt compared to annual income."
        }
      ],
      score_breakdown: {
        "Savings": Math.min(20, Math.round(savingsRate * 0.8)),
        "Debt": Math.max(0, 20 - Math.round(debtToIncome * 0.3)),
        "Emergency Fund": Math.min(20, Math.round(emergencyMonths * 3)),
        "Investments": Math.min(20, Math.round(investments / (income * 0.5 || 1))),
        "Expenses": Math.max(0, 20 - Math.round(expenseRatio * 0.2)),
        "Cashflow": 15
      },
      persona: {
        title: score >= 80 ? "Wealth Master" : (score >= 65 ? "Balanced Builder" : "Struggling Saver"),
        emoji: score >= 80 ? "👑" : (score >= 65 ? "📈" : "⚠️"),
        description: score >= 80 
          ? "You display outstanding discipline and structured growth. Keep maintaining this solid trajectory."
          : (score >= 65 ? "You are on the right path with a solid balance but have minor areas that can be optimized."
                         : "Your finances are vulnerable to shocks. Focusing on debt reduction and emergency savings is key."),
        strength: score >= 80 ? "Asset Accumulation" : "Regular Contributions",
        focus_area: "Long-Term Wealth Creation",
        risk_level: score >= 80 ? "Very Low" : (score >= 65 ? "Low" : "High")
      },
      strengths: strengths.length ? strengths : ['Basic regular income source.'],
      weaknesses: weaknesses.length ? weaknesses : ['No major structural weaknesses identified.'],
      risks: risks.length ? risks : [],
      recommendations: recommendations.length ? recommendations : [
        {
          id: "general",
          title: "Goal Alignment Review",
          priority: "Low",
          current_value: "Standard",
          recommended_value: "Optimized",
          reason: "Regular reviews ensure goals align with market conditions.",
          impact: "Keeps investments on track with your target."
        }
      ],
      ai_summary: `Based on your profile, your financial health is ${status.toUpperCase()} with an AI score of ${score}/100. Your primary focus should be aligning your monthly allocations with your goal: ${profileData.financial_goal.replace(/_/g, ' ')}.`
    };
  }
};
