/*
# Multi-asset + character messaging support

## Changes

1. `assets.type` constraint expanded to include: image, document, spreadsheet, text, video, gif.
   Users can now upload ANY file type — images, Excel, docs, text, video clips — and AI animates them.
2. New `character_messages` table: stores in-world character interactions.
   A user picks a character (boy, girl, robot, etc.) and types a message; the character
   "speaks" it in the animated video — trending-style interactive messaging.

## Tables

- `character_messages`:
  - `id` (uuid PK)
  - `project_id` (uuid, references projects, cascade delete)
  - `user_id` (uuid, default auth.uid())
  - `character_type` (text: boy, girl, robot, man, woman, elder, anime_boy, anime_girl, mascot)
  - `message` (text)
  - `emotion` (text: happy, sad, excited, angry, surprised, neutral)
  - `position` (text: left, center, right)
  - `start_time` (numeric, seconds)
  - `duration` (numeric, seconds)
  - `created_at`

## Security
- RLS enabled on character_messages with owner-scoped CRUD.
- assets.type constraint replaced (DROP + ADD) to allow new file categories.
*/

-- Expand asset type constraint
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_type_check;
ALTER TABLE assets ADD CONSTRAINT assets_type_check CHECK (
  type IN ('background','logo','overlay','font','lyrics','character','subtitle',
           'image','document','spreadsheet','text','video','gif')
);

-- character_messages
CREATE TABLE IF NOT EXISTS character_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  character_type text NOT NULL DEFAULT 'boy' CHECK (character_type IN ('boy','girl','robot','man','woman','elder','anime_boy','anime_girl','mascot')),
  message text NOT NULL DEFAULT '',
  emotion text NOT NULL DEFAULT 'happy' CHECK (emotion IN ('happy','sad','excited','angry','surprised','neutral')),
  position text NOT NULL DEFAULT 'center' CHECK (position IN ('left','center','right')),
  start_time numeric DEFAULT 0,
  duration numeric DEFAULT 5,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE character_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_char_messages_project ON character_messages(project_id);

DROP POLICY IF EXISTS "select_own_char_messages" ON character_messages;
CREATE POLICY "select_own_char_messages" ON character_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_char_messages" ON character_messages;
CREATE POLICY "insert_own_char_messages" ON character_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_char_messages" ON character_messages;
CREATE POLICY "update_own_char_messages" ON character_messages FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_char_messages" ON character_messages;
CREATE POLICY "delete_own_char_messages" ON character_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);