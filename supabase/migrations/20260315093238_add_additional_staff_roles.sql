/*
  # Add Additional Staff Roles
  
  1. Changes
    - Expands the staff_accounts role constraint to include new roles:
      - ceo (Chief Executive Officer)
      - coo (Chief Operating Officer) 
      - cio (Chief Information Officer)
      - analyst (Data/Business Analyst)
      - general_staff (General Staff Member)
      - tech (Technology/IT Staff)
    - Note: 'bookkeeper' already exists in the constraint
  
  2. Security
    - No RLS changes required
    - Only updates the CHECK constraint for role validation
*/

DO $$
BEGIN
  -- Drop existing constraint
  ALTER TABLE staff_accounts DROP CONSTRAINT IF EXISTS staff_accounts_role_check;
  
  -- Add updated constraint with new roles
  ALTER TABLE staff_accounts ADD CONSTRAINT staff_accounts_role_check 
    CHECK (role IN (
      'general_manager',
      'compliance_manager',
      'accountant',
      'cfo',
      'ceo',
      'coo',
      'cio',
      'legal_counsel',
      'admin',
      'trader',
      'bookkeeper',
      'analyst',
      'general_staff',
      'tech',
      'tax_specialist',
      'operations'
    ));
END $$;
