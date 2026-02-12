/*
  # Grey Alpha Investment Fund Database Schema

  1. New Tables
    - `client_profiles`
      - `id` (uuid, primary key) - References auth.users
      - `full_name` (text) - Client's full name
      - `email` (text) - Client's email
      - `account_number` (text, unique) - Unique account identifier
      - `total_invested` (numeric) - Total amount invested
      - `current_value` (numeric) - Current portfolio value
      - `inception_date` (date) - Date client started investing
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

    - `investments`
      - `id` (uuid, primary key)
      - `client_id` (uuid) - References client_profiles
      - `investment_name` (text) - Name/type of investment
      - `amount_invested` (numeric) - Initial investment amount
      - `current_value` (numeric) - Current value
      - `shares` (numeric) - Number of shares/units
      - `investment_date` (date) - Date of investment
      - `created_at` (timestamptz)

    - `performance_returns`
      - `id` (uuid, primary key)
      - `client_id` (uuid) - References client_profiles
      - `period` (date) - Period (month/quarter/year)
      - `return_percentage` (numeric) - Return percentage for period
      - `portfolio_value` (numeric) - Portfolio value at period end
      - `benchmark_return` (numeric) - Benchmark comparison
      - `created_at` (timestamptz)

    - `documents`
      - `id` (uuid, primary key)
      - `title` (text) - Document title
      - `description` (text) - Document description
      - `document_type` (text) - Type: quarterly_letter, annual_report, etc.
      - `period` (text) - Period covered (e.g., Q1 2024)
      - `file_url` (text) - URL to document
      - `public` (boolean) - Whether document is public or client-only
      - `created_at` (timestamptz)

    - `redemption_requests`
      - `id` (uuid, primary key)
      - `client_id` (uuid) - References client_profiles
      - `amount` (numeric) - Redemption amount requested
      - `redemption_type` (text) - partial or full
      - `reason` (text) - Optional reason for redemption
      - `status` (text) - pending, approved, completed, rejected
      - `requested_date` (timestamptz) - When request was made
      - `processed_date` (timestamptz) - When request was processed
      - `notes` (text) - Admin notes
      - `created_at` (timestamptz)

    - `tax_document_requests`
      - `id` (uuid, primary key)
      - `client_id` (uuid) - References client_profiles
      - `document_type` (text) - Type of tax document requested
      - `tax_year` (integer) - Tax year
      - `status` (text) - pending, completed
      - `requested_date` (timestamptz)
      - `completed_date` (timestamptz)
      - `notes` (text)
      - `created_at` (timestamptz)

    - `inquiries`
      - `id` (uuid, primary key)
      - `name` (text) - Inquirer's name
      - `email` (text) - Inquirer's email
      - `company` (text) - Optional company name
      - `message` (text) - Inquiry message
      - `status` (text) - new, read, responded
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Clients can only view their own data
    - Inquiries table allows anonymous inserts
    - Documents table allows authenticated users to view based on public flag
*/

-- Client Profiles Table
CREATE TABLE IF NOT EXISTS client_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  account_number text UNIQUE NOT NULL,
  total_invested numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  inception_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own profile"
  ON client_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Clients can update own profile"
  ON client_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Investments Table
CREATE TABLE IF NOT EXISTS investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  investment_name text NOT NULL,
  amount_invested numeric NOT NULL,
  current_value numeric NOT NULL,
  shares numeric NOT NULL,
  investment_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own investments"
  ON investments FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Performance Returns Table
CREATE TABLE IF NOT EXISTS performance_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  period date NOT NULL,
  return_percentage numeric NOT NULL,
  portfolio_value numeric NOT NULL,
  benchmark_return numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE performance_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own returns"
  ON performance_returns FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  document_type text NOT NULL,
  period text NOT NULL,
  file_url text NOT NULL,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (public = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Anonymous users can view public documents"
  ON documents FOR SELECT
  TO anon
  USING (public = true);

-- Redemption Requests Table
CREATE TABLE IF NOT EXISTS redemption_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  redemption_type text NOT NULL CHECK (redemption_type IN ('partial', 'full')),
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'rejected')),
  requested_date timestamptz DEFAULT now(),
  processed_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE redemption_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own redemption requests"
  ON redemption_requests FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can create redemption requests"
  ON redemption_requests FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Tax Document Requests Table
CREATE TABLE IF NOT EXISTS tax_document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  tax_year integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  requested_date timestamptz DEFAULT now(),
  completed_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tax_document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own tax document requests"
  ON tax_document_requests FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can create tax document requests"
  ON tax_document_requests FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

-- Inquiries Table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create inquiries"
  ON inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_investments_client_id ON investments(client_id);
CREATE INDEX IF NOT EXISTS idx_performance_returns_client_id ON performance_returns(client_id);
CREATE INDEX IF NOT EXISTS idx_redemption_requests_client_id ON redemption_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_tax_document_requests_client_id ON tax_document_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_performance_returns_period ON performance_returns(period);
