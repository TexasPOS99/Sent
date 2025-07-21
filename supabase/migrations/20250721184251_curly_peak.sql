/*
  # Create messages table for Thai message sharing app

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `text` (text, required) - The message or link content
      - `created_at` (timestamptz, default: now()) - When the message was created

  2. Security
    - Enable RLS on `messages` table
    - Add policy for public read access (no authentication required)
    - Add policy for public insert access (no authentication required)

  3. Notes
    - This is a public table with no authentication required
    - Messages are sorted by created_at DESC to show latest first
    - Text field can store both messages and links
*/

-- Create the messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can read messages"
  ON messages
  FOR SELECT
  TO public
  USING (true);

-- Create policy for public insert access
CREATE POLICY "Anyone can insert messages"
  ON messages
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create index for better performance when ordering by created_at
CREATE INDEX IF NOT EXISTS messages_created_at_idx 
  ON messages (created_at DESC);