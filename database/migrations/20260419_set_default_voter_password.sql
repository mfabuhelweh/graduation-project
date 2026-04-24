UPDATE voters
SET password_hash = crypt('12345', gen_salt('bf')),
    updated_at = now();
