/*
  # Create leads table for trading education landing page

  1. New Tables
    - `leads`
      - `id` (uuid, primary key) - Unique identifier for each lead
      - `name` (text) - Full name of the applicant
      - `email` (text) - Email address
      - `phone` (text) - Phone number
      - `experience` (text) - Trading experience level (beginner, intermediate, advanced)
      - `interests` (text[]) - Array of interests (forex, crypto, both)
      - `message` (text, optional) - Additional message from applicant
      - `created_at` (timestamptz) - Timestamp of submission
      - `status` (text) - Lead status (new, contacted, converted)
  
  2. Security
    - Enable RLS on `leads` table
    - Add policy for inserting leads (public access for form submissions)
    - Add policy for reading leads (authenticated users only - for admin panel)

  3. Indexes
    - Index on email for quick lookups
    - Index on created_at for sorting by date
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  experience text NOT NULL DEFAULT 'beginner',
  interests text[] NOT NULL DEFAULT ARRAY['forex'],
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert leads (for form submissions)
CREATE POLICY "Anyone can submit a lead"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Only authenticated users can read leads (for admin panel)
CREATE POLICY "Authenticated users can read all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (true);