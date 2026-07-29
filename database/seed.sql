-- =====================================================
-- FINSTACK SAMPLE DATA
-- =====================================================

-- This file assumes at least one authenticated user exists.

DO $$
DECLARE
    profile_id UUID;
    fin_profile_id UUID;
BEGIN

    ----------------------------------------------------
    -- Get first user profile
    ----------------------------------------------------

    SELECT id
    INTO profile_id
    FROM user_profile
    LIMIT 1;

    ----------------------------------------------------
    -- Update Financial Profile
    ----------------------------------------------------

    UPDATE financial_profile
    SET

        employment_status='salaried',

        monthly_income=75000,

        monthly_expenses=42000,

        monthly_savings=18000,

        total_debt=250000,

        emergency_fund=120000,

        investments=350000,

        insurance_cover=1000000,

        financial_goal='investment',

        profile_completion=100

    WHERE user_profile_id=profile_id;

    ----------------------------------------------------
    -- Get Financial Profile ID
    ----------------------------------------------------

    SELECT id
    INTO fin_profile_id
    FROM financial_profile
    WHERE user_profile_id=profile_id;

    ----------------------------------------------------
    -- Insert AI Report
    ----------------------------------------------------

    INSERT INTO financial_health_report
    (

        financial_profile_id,

        financial_score,

        savings_ratio,

        debt_ratio,

        emergency_score,

        recommendations,

        report_version

    )

    VALUES
    (

        fin_profile_id,

        82,

        24.0,

        31.0,

        78,

        'Increase SIP investment by 10%, reduce discretionary spending, maintain emergency fund.',

        'v1'

    );

    ----------------------------------------------------
    -- SmartFeed Preferences
    ----------------------------------------------------

    UPDATE smartfeed_preference

    SET

        preferred_categories='["Investing","Tax","Mutual Funds","Budgeting"]',

        language='en',

        notification_enabled=TRUE,

        dark_mode=FALSE

    WHERE user_profile_id=profile_id;

    ----------------------------------------------------
    -- Uploaded Document Metadata
    ----------------------------------------------------

    INSERT INTO uploaded_document
    (

        user_profile_id,

        document_type,

        original_filename,

        storage_path,

        file_size,

        mime_type,

        sha256_hash,

        processing_status

    )

    VALUES
    (

        profile_id,

        'bank_statement',

        'bank_statement_june_2026.pdf',

        'documents/demo/bank_statement_june_2026.pdf',

        245632,

        'application/pdf',

        encode(gen_random_bytes(32),'hex'),

        'completed'

    );

END $$;