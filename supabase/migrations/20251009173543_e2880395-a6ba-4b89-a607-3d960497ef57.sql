-- Update profiles table role constraint to include new roles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check,
  ADD CONSTRAINT profiles_role_check
  CHECK (
    role = ANY (
      ARRAY[
        'admin',
        'system_admin',
        'pool_admin',
        'staff',
        'student',
        'member',
        'resident',
        'visitor',
        'faculty',
        'rcmrd_team',
        'rcmrd_official'
      ]
    )
  );

-- Update residents table role constraint to include new roles
ALTER TABLE public.residents
  DROP CONSTRAINT IF EXISTS residents_role_check,
  ADD CONSTRAINT residents_role_check
  CHECK (
    role = ANY (ARRAY[
      'Resident',
      'Staff',
      'Student',
      'RCMRD Team',
      'RCMRD Official'
    ])
  );