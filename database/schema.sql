/*
==========================================================
FinStack Database Schema
Review 1
PostgreSQL / Supabase
==========================================================
*/

----------------------------------------------------------
-- EXTENSIONS
----------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

----------------------------------------------------------
-- ENUM TYPES
----------------------------------------------------------

CREATE TYPE gender_enum AS ENUM (
    'male',
    'female',
    'other',
    'prefer_not_to_say'
);

CREATE TYPE employment_status_enum AS ENUM (
    'student',
    'salaried',
    'business',
    'freelancer',
    'retired',
    'unemployed'
);

CREATE TYPE financial_goal_enum AS ENUM (
    'emergency_fund',
    'buy_house',
    'buy_vehicle',
    'education',
    'retirement',
    'investment',
    'travel',
    'other'
);

CREATE TYPE document_type_enum AS ENUM (
    'salary_slip',
    'bank_statement',
    'itr',
    'pan',
    'loan_statement',
    'insurance',
    'investment',
    'credit_card'
);

CREATE TYPE processing_status_enum AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed'
);

----------------------------------------------------------
-- COMMON TRIGGER FUNCTION
----------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS
$$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
LANGUAGE plpgsql;
/* ==========================================================
   FinStack Database Schema
   PART 1 - Core Tables
   ========================================================== */

-------------------------------------------------------------
-- USER PROFILE
-------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    full_name VARCHAR(150) NOT NULL,

    phone_number VARCHAR(20),

    date_of_birth DATE,

    gender gender_enum,

    city VARCHAR(100),

    state VARCHAR(100),

    country VARCHAR(100) DEFAULT 'India',

    profile_completed BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------
-- FINANCIAL PROFILE
-------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.financial_profile (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_profile_id UUID NOT NULL UNIQUE
        REFERENCES public.user_profile(id)
        ON DELETE CASCADE,

    employment_status employment_status_enum,

    monthly_income NUMERIC(12,2)
        DEFAULT 0
        CHECK (monthly_income >= 0),

    monthly_expenses NUMERIC(12,2)
        DEFAULT 0
        CHECK (monthly_expenses >= 0),

    monthly_savings NUMERIC(12,2)
        DEFAULT 0
        CHECK (monthly_savings >= 0),

    total_debt NUMERIC(12,2)
        DEFAULT 0
        CHECK (total_debt >= 0),

    emergency_fund NUMERIC(12,2)
        DEFAULT 0
        CHECK (emergency_fund >= 0),

    investments NUMERIC(12,2)
        DEFAULT 0
        CHECK (investments >= 0),

    insurance_cover NUMERIC(12,2)
        DEFAULT 0
        CHECK (insurance_cover >= 0),

    financial_goal financial_goal_enum,

    profile_completion SMALLINT
        DEFAULT 0
        CHECK (
            profile_completion >= 0
            AND
            profile_completion <= 100
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-------------------------------------------------------------
-- FINANCIAL HEALTH REPORT
-------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.financial_health_report (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    financial_profile_id UUID NOT NULL
        REFERENCES public.financial_profile(id)
        ON DELETE CASCADE,

    financial_score SMALLINT
        CHECK (
            financial_score >= 0
            AND
            financial_score <= 100
        ),

    savings_ratio NUMERIC(5,2)
        CHECK (
            savings_ratio >= 0
            AND
            savings_ratio <= 100
        ),

    debt_ratio NUMERIC(5,2)
        CHECK (
            debt_ratio >= 0
            AND
            debt_ratio <= 100
        ),

    emergency_score SMALLINT
        CHECK (
            emergency_score >= 0
            AND
            emergency_score <= 100
        ),

    recommendations TEXT,

    report_version VARCHAR(20)
        DEFAULT 'v1.0',

    generated_at TIMESTAMPTZ
        DEFAULT NOW(),

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        DEFAULT NOW()
);
/* ==========================================================
   PART 2 - Remaining Tables
   ========================================================== */

-------------------------------------------------------------
-- SMARTFEED PREFERENCES
-------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.smartfeed_preference (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_profile_id UUID NOT NULL UNIQUE
        REFERENCES public.user_profile(id)
        ON DELETE CASCADE,

    preferred_categories JSONB
        DEFAULT '[]'::jsonb,

    language VARCHAR(20)
        DEFAULT 'en',

    notification_enabled BOOLEAN
        DEFAULT TRUE,

    dark_mode BOOLEAN
        DEFAULT FALSE,

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        DEFAULT NOW()
);

-------------------------------------------------------------
-- UPLOADED DOCUMENTS
-------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.uploaded_document (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_profile_id UUID NOT NULL
        REFERENCES public.user_profile(id)
        ON DELETE CASCADE,

    document_type document_type_enum NOT NULL,

    original_filename TEXT NOT NULL,

    storage_path TEXT NOT NULL,

    file_size BIGINT
        CHECK (file_size >= 0),

    mime_type VARCHAR(100),

    sha256_hash TEXT UNIQUE,

    processing_status processing_status_enum
        DEFAULT 'pending',

    expires_at TIMESTAMPTZ,

    uploaded_at TIMESTAMPTZ
        DEFAULT NOW(),

    created_at TIMESTAMPTZ
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ
        DEFAULT NOW()
);

-------------------------------------------------------------
-- TABLE COMMENTS
-------------------------------------------------------------

COMMENT ON TABLE public.user_profile IS
'Stores user personal profile information.';

COMMENT ON TABLE public.financial_profile IS
'Stores user financial inputs used by AI modules.';

COMMENT ON TABLE public.financial_health_report IS
'Stores AI generated financial health reports and historical analysis.';

COMMENT ON TABLE public.smartfeed_preference IS
'Stores user preferences for personalized financial news.';

COMMENT ON TABLE public.uploaded_document IS
'Stores metadata of uploaded documents. Files are stored in Supabase Storage.';
/* ==========================================================
   PART 3 - Indexes, Triggers & Verification
   ========================================================== */

-------------------------------------------------------------
-- INDEXES
-------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_user_profile_user_id
ON public.user_profile(user_id);

CREATE INDEX IF NOT EXISTS idx_financial_profile_user
ON public.financial_profile(user_profile_id);

CREATE INDEX IF NOT EXISTS idx_health_report_profile
ON public.financial_health_report(financial_profile_id);

CREATE INDEX IF NOT EXISTS idx_health_report_generated_at
ON public.financial_health_report(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_uploaded_document_user
ON public.uploaded_document(user_profile_id);

CREATE INDEX IF NOT EXISTS idx_uploaded_document_type
ON public.uploaded_document(document_type);

CREATE INDEX IF NOT EXISTS idx_uploaded_document_status
ON public.uploaded_document(processing_status);

-------------------------------------------------------------
-- UPDATED_AT TRIGGERS
-------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_user_profile_updated_at
ON public.user_profile;

CREATE TRIGGER trg_user_profile_updated_at
BEFORE UPDATE
ON public.user_profile
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_financial_profile_updated_at
ON public.financial_profile;

CREATE TRIGGER trg_financial_profile_updated_at
BEFORE UPDATE
ON public.financial_profile
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_financial_health_report_updated_at
ON public.financial_health_report;

CREATE TRIGGER trg_financial_health_report_updated_at
BEFORE UPDATE
ON public.financial_health_report
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_uploaded_document_updated_at
ON public.uploaded_document;

CREATE TRIGGER trg_uploaded_document_updated_at
BEFORE UPDATE
ON public.uploaded_document
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_smartfeed_preference_updated_at
ON public.smartfeed_preference;

CREATE TRIGGER trg_smartfeed_preference_updated_at
BEFORE UPDATE
ON public.smartfeed_preference
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-------------------------------------------------------------
-- VERIFY TABLES
-------------------------------------------------------------

SELECT table_name
FROM information_schema.tables
WHERE table_schema='public'
ORDER BY table_name;

-------------------------------------------------------------
-- VERIFY INDEXES
-------------------------------------------------------------

SELECT indexname
FROM pg_indexes
WHERE schemaname='public'
ORDER BY indexname;

-------------------------------------------------------------
-- VERIFY TRIGGERS
-------------------------------------------------------------

SELECT trigger_name,
event_object_table
FROM information_schema.triggers
WHERE trigger_schema='public'
ORDER BY event_object_table;

-------------------------------------------------------------
-- SCHEMA COMPLETE
-------------------------------------------------------------