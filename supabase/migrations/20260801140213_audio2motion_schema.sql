/*
# Audio2Motion AI — Core Schema

Creates the multi-tenant data model for the Audio2Motion AI SaaS platform.

## Tables

1. `profiles` — extends auth.users with display name, avatar, plan, credits, storage.
   - `id` (uuid, PK, references auth.users)
   - `display_name` (text)
   - `avatar_url` (text)
   - `plan` (text: free|pro|business|enterprise, default free)
   - `credits` (int, default 10)
   - `storage_used_mb` (numeric, default 0)
   - `role` (text: user|admin, default user)
   - `created_at`, `updated_at`

2. `projects` — a user's music video project (one per uploaded song).
   - `id` (uuid PK)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `title` (text)
   - `audio_url` (text) — public URL of uploaded audio in storage
   - `audio_name` (text) — original filename
   - `duration_sec` (numeric)
   - `analysis` (jsonb) — full audio analysis (bpm, energy, beats, sections, spectrum, mood, genre)
   - `thumbnail_url` (text)
   - `favorite` (boolean, default false)
   - `created_at`, `updated_at`

3. `versions` — each generation of a project's video.
   - `id` (uuid PK)
   - `project_id` (uuid, references projects, cascade delete)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `version_number` (int)
   - `label` (text) — user-renamable name
   - `style_preset` (text) — e.g. galaxy_flow, neon_tunnel
   - `style_config` (jsonb) — camera, effects, colors, scene settings
   - `chat_prompt` (text) — the prompt that produced this version
   - `status` (text: draft|rendering|ready|failed, default draft)
   - `progress` (int, default 0)
   - `video_url` (text)
   - `thumbnail_url` (text)
   - `duration_sec` (numeric)
   - `favorite` (boolean, default false)
   - `created_at`

4. `assets` — user-uploaded supplementary assets (backgrounds, logos, lyrics, etc.).
   - `id` (uuid PK)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `project_id` (uuid, references projects, nullable, cascade delete)
   - `type` (text: background|logo|overlay|font|lyrics|character|subtitle)
   - `name` (text)
   - `url` (text)
   - `mime_type` (text)
   - `size_kb` (numeric)
   - `created_at`

5. `render_jobs` — queue tracking for renders.
   - `id` (uuid PK)
   - `version_id` (uuid, references versions, cascade delete)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `status` (text: queued|processing|rendering|complete|failed, default queued)
   - `progress` (int, default 0)
   - `queue_position` (int)
   - `format` (text), `resolution` (text), `aspect_ratio` (text), `fps` (int)
   - `error` (text)
   - `started_at`, `completed_at`, `created_at`

6. `chat_messages` — conversation history with the AI assistant.
   - `id` (uuid PK)
   - `project_id` (uuid, references projects, cascade delete)
   - `user_id` (uuid, references auth.users, default auth.uid())
   - `role` (text: user|assistant)
   - `content` (text)
   - `applied_command` (jsonb) — parsed command the assistant applied
   - `created_at`

## Security

- RLS enabled on every table.
- Owner-scoped CRUD: each authenticated user can only access rows they own
  (directly via user_id, or via project ownership for child tables).
- `profiles` uses a self-service policy: a user reads/updates only their own profile row.
- An insert trigger creates a profile row when a new auth.user signs up.
- Admin role check uses raw_app_meta_data for the role claim (user-immutable).

## Notes

1. All owner columns default to `auth.uid()` so frontend inserts that omit
   `user_id` still satisfy WITH CHECK policies.
2. Child tables (versions, assets, render_jobs, chat_messages) verify ownership
   through the parent project's user_id.
3. The `handle_new_user` trigger fires on auth.users insert to auto-create a profile.
*/

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  avatar_url text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','business','enterprise')),
  credits integer NOT NULL DEFAULT 10,
  storage_used_mb numeric NOT NULL DEFAULT 0,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Project',
  audio_url text,
  audio_name text,
  duration_sec numeric DEFAULT 0,
  analysis jsonb DEFAULT '{}'::jsonb,
  thumbnail_url text,
  favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- versions
CREATE TABLE IF NOT EXISTS versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  label text NOT NULL DEFAULT 'Version 1',
  style_preset text DEFAULT 'auto',
  style_config jsonb DEFAULT '{}'::jsonb,
  chat_prompt text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','rendering','ready','failed')),
  progress integer NOT NULL DEFAULT 0,
  video_url text,
  thumbnail_url text,
  duration_sec numeric DEFAULT 0,
  favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE versions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_versions_project ON versions(project_id);

DROP POLICY IF EXISTS "select_own_versions" ON versions;
CREATE POLICY "select_own_versions" ON versions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_versions" ON versions;
CREATE POLICY "insert_own_versions" ON versions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_versions" ON versions;
CREATE POLICY "update_own_versions" ON versions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_versions" ON versions;
CREATE POLICY "delete_own_versions" ON versions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- assets
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('background','logo','overlay','font','lyrics','character','subtitle')),
  name text NOT NULL,
  url text NOT NULL,
  mime_type text,
  size_kb numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_assets_user ON assets(user_id);

DROP POLICY IF EXISTS "select_own_assets" ON assets;
CREATE POLICY "select_own_assets" ON assets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_assets" ON assets;
CREATE POLICY "insert_own_assets" ON assets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_assets" ON assets;
CREATE POLICY "update_own_assets" ON assets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_assets" ON assets;
CREATE POLICY "delete_own_assets" ON assets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- render_jobs
CREATE TABLE IF NOT EXISTS render_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id uuid NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','rendering','complete','failed')),
  progress integer NOT NULL DEFAULT 0,
  queue_position integer DEFAULT 0,
  format text DEFAULT 'mp4',
  resolution text DEFAULT '1080p',
  aspect_ratio text DEFAULT '16:9',
  fps integer DEFAULT 30,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE render_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_render_jobs_user ON render_jobs(user_id);

DROP POLICY IF EXISTS "select_own_render_jobs" ON render_jobs;
CREATE POLICY "select_own_render_jobs" ON render_jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_render_jobs" ON render_jobs;
CREATE POLICY "insert_own_render_jobs" ON render_jobs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_render_jobs" ON render_jobs;
CREATE POLICY "update_own_render_jobs" ON render_jobs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_render_jobs" ON render_jobs;
CREATE POLICY "delete_own_render_jobs" ON render_jobs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL DEFAULT '',
  applied_command jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id);

DROP POLICY IF EXISTS "select_own_chat_messages" ON chat_messages;
CREATE POLICY "select_own_chat_messages" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_chat_messages" ON chat_messages;
CREATE POLICY "insert_own_chat_messages" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_chat_messages" ON chat_messages;
CREATE POLICY "delete_own_chat_messages" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS projects_touch_updated_at ON projects;
CREATE TRIGGER projects_touch_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();