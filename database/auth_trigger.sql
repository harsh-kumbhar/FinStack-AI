-- =====================================================
-- AUTO CREATE USER RECORDS AFTER SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_uuid UUID;
BEGIN

    --------------------------------------------------
    -- Create user_profile
    --------------------------------------------------

    INSERT INTO public.user_profile
    (
        user_id,
        full_name
    )
    VALUES
    (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email,'@',1)
        )
    )
    RETURNING id
    INTO profile_uuid;

    --------------------------------------------------
    -- Create financial_profile
    --------------------------------------------------

    INSERT INTO public.financial_profile
    (
        user_profile_id
    )
    VALUES
    (
        profile_uuid
    );

    --------------------------------------------------
    -- Create SmartFeed Preferences
    --------------------------------------------------

    INSERT INTO public.smartfeed_preference
    (
        user_profile_id
    )
    VALUES
    (
        profile_uuid
    );

    RETURN NEW;

END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT
ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();