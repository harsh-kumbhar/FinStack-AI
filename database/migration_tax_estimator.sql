-- ==========================================================
-- TAX ESTIMATOR TABLE & RLS POLICIES
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.tax_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,
        
    financial_year VARCHAR(10) NOT NULL,
    
    -- Inputs
    gross_salary NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (gross_salary >= 0),
    other_income NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (other_income >= 0),
    deduction_80c NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (deduction_80c >= 0),
    deduction_80d NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (deduction_80d >= 0),
    deduction_80tta NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (deduction_80tta >= 0),
    
    -- Old Regime Outputs
    old_gross_income NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_gross_income >= 0),
    old_standard_deduction NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_standard_deduction >= 0),
    old_chapter_vi_deductions NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_chapter_vi_deductions >= 0),
    old_taxable_income NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_taxable_income >= 0),
    old_tax_on_income NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_tax_on_income >= 0),
    old_rebate_87a NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_rebate_87a >= 0),
    old_tax_after_rebate NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_tax_after_rebate >= 0),
    old_surcharge NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_surcharge >= 0),
    old_cess NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_cess >= 0),
    old_total_tax NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (old_total_tax >= 0),
    
    -- New Regime Outputs
    new_gross_income NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_gross_income >= 0),
    new_standard_deduction NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_standard_deduction >= 0),
    new_chapter_vi_deductions NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_chapter_vi_deductions >= 0),
    new_taxable_income NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_taxable_income >= 0),
    new_tax_on_income NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_tax_on_income >= 0),
    new_rebate_87a NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_rebate_87a >= 0),
    new_tax_after_rebate NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_tax_after_rebate >= 0),
    new_surcharge NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_surcharge >= 0),
    new_cess NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_cess >= 0),
    new_total_tax NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (new_total_tax >= 0),
    
    -- Recommended regime & savings
    recommended_regime VARCHAR(20) NOT NULL,
    estimated_tax_savings NUMERIC(15,2) NOT NULL DEFAULT 0.0 CHECK (estimated_tax_savings >= 0),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_tax_assessments_user_id ON public.tax_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_assessments_created_at ON public.tax_assessments(created_at DESC);

-- Trigger for updated_at column
DROP TRIGGER IF EXISTS trg_tax_assessments_updated_at ON public.tax_assessments;
CREATE TRIGGER trg_tax_assessments_updated_at
BEFORE UPDATE ON public.tax_assessments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE public.tax_assessments ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
DROP POLICY IF EXISTS "Users can view own tax assessments" ON public.tax_assessments;
CREATE POLICY "Users can view own tax assessments"
ON public.tax_assessments
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own tax assessments" ON public.tax_assessments;
CREATE POLICY "Users can insert own tax assessments"
ON public.tax_assessments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own tax assessments" ON public.tax_assessments;
CREATE POLICY "Users can update own tax assessments"
ON public.tax_assessments
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own tax assessments" ON public.tax_assessments;
CREATE POLICY "Users can delete own tax assessments"
ON public.tax_assessments
FOR DELETE
USING (auth.uid() = user_id);
