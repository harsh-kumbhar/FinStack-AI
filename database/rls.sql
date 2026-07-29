-- =====================================================
-- FINSTACK - ROW LEVEL SECURITY
-- =====================================================

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_health_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartfeed_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_document ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER PROFILE
-- =====================================================

CREATE POLICY "Users can view own profile"
ON user_profile
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON user_profile
FOR UPDATE
USING (auth.uid() = user_id);

-- =====================================================
-- FINANCIAL PROFILE
-- =====================================================

CREATE POLICY "Users can view own financial profile"
ON financial_profile
FOR SELECT
USING (
user_profile_id IN (
SELECT id
FROM user_profile
WHERE user_id = auth.uid()
)
);

CREATE POLICY "Users can update own financial profile"
ON financial_profile
FOR UPDATE
USING (
user_profile_id IN (
SELECT id
FROM user_profile
WHERE user_id = auth.uid()
)
);

-- =====================================================
-- FINANCIAL HEALTH REPORT
-- =====================================================

CREATE POLICY "Users can view own reports"
ON financial_health_report
FOR SELECT
USING (
financial_profile_id IN (
SELECT fp.id
FROM financial_profile fp
JOIN user_profile up
ON up.id = fp.user_profile_id
WHERE up.user_id = auth.uid()
)
);

-- =====================================================
-- SMARTFEED
-- =====================================================

CREATE POLICY "Users can manage own preferences"
ON smartfeed_preference
FOR ALL
USING (
user_profile_id IN (
SELECT id
FROM user_profile
WHERE user_id = auth.uid()
)
);

-- =====================================================
-- DOCUMENTS
-- =====================================================

CREATE POLICY "Users can manage own documents"
ON uploaded_document
FOR ALL
USING (
user_profile_id IN (
SELECT id
FROM user_profile
WHERE user_id = auth.uid()
)
);