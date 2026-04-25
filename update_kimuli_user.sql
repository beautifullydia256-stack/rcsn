-- Update user kimulidaudi5@gmail.com to have name "Kimuli Daudi" and role "OWNER"

-- First, let's check if the user exists
SELECT user_id, email, name, role, school_id 
FROM users 
WHERE email = 'kimulidaudi5@gmail.com';

-- Update the user's name and role
UPDATE users 
SET 
    name = 'Kimuli Daudi',
    role = 'owner'
WHERE email = 'kimulidaudi5@gmail.com';

-- Verify the update was successful
SELECT user_id, email, name, role, school_id 
FROM users 
WHERE email = 'kimulidaudi5@gmail.com';

-- If the user doesn't exist, you can create them with this INSERT statement:
-- (Uncomment and modify as needed)
/*
INSERT INTO users (user_id, email, name, role, school_id)
VALUES (
    gen_random_uuid(),  -- or provide a specific UUID
    'kimulidaudi5@gmail.com',
    'Kimuli Daudi',
    'owner',
    NULL  -- Set to appropriate school_id if needed
);
*/