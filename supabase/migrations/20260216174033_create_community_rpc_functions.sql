/*
  # Create Community RPC Functions to Eliminate N+1 Queries

  ## Overview
  Adds server-side Postgres functions that replace client-side N+1 query loops
  in the community and messaging components. These functions use JOINs to fetch
  all needed data in a single round-trip instead of hundreds of individual queries.

  ## New Functions

  ### 1. `get_feed_posts`
  Fetches community posts with the current user's reaction and saved status.
  Replaces the per-post loop in CommunityFeed.tsx that made 2 queries per post.
  - Parameters: `p_user_id` (uuid)
  - Returns: JSONB array of `{ post_id, user_reaction, is_saved }`

  ### 2. `get_comments_with_reactions`
  Fetches comments for a post with the current user's reaction on each comment.
  Replaces the per-comment loop in PostDetail.tsx.
  - Parameters: `p_post_id` (uuid), `p_user_id` (uuid)
  - Returns: Table of comments with `user_reaction_type` column

  ### 3. `get_user_connection_statuses`
  Fetches connection statuses for a batch of user IDs relative to the current user.
  Replaces the per-user loop in UserNetwork.tsx.
  - Parameters: `p_user_id` (uuid), `p_profile_ids` (uuid[])
  - Returns: Table of `{ profile_user_id, status, connection_user_id }`

  ### 4. `get_user_threads_with_details`
  Fetches message threads with participant profiles and unread counts.
  Replaces the per-thread loop in DirectMessaging.tsx that made 3 queries per thread.
  - Parameters: `p_user_id` (uuid)
  - Returns: Table of threads with participant names and unread counts

  ## Security
  All functions use the `p_user_id` parameter which should match `auth.uid()`.
  RLS on the underlying tables still applies for direct table access.
  Functions are created with `SECURITY INVOKER` so RLS policies are respected.
*/

CREATE OR REPLACE FUNCTION get_feed_posts(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'post_id', cp.id,
    'user_reaction', cr.reaction_type,
    'is_saved', sp.post_id IS NOT NULL
  )), '[]'::jsonb)
  FROM community_posts cp
  LEFT JOIN community_reactions cr
    ON cr.post_id = cp.id
    AND cr.user_id = p_user_id
    AND cr.comment_id IS NULL
  LEFT JOIN saved_posts sp
    ON sp.post_id = cp.id
    AND sp.user_id = p_user_id
  WHERE cp.status = 'active';
$$;

CREATE OR REPLACE FUNCTION get_comments_with_reactions(p_post_id uuid, p_user_id uuid)
RETURNS TABLE (
  id uuid,
  post_id uuid,
  author_user_id uuid,
  parent_comment_id uuid,
  content text,
  content_html text,
  reaction_count integer,
  is_reported boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_display_name text,
  user_reaction_type text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    cc.id,
    cc.post_id,
    cc.author_user_id,
    cc.parent_comment_id,
    cc.content,
    cc.content_html,
    cc.reaction_count,
    cc.is_reported,
    cc.created_at,
    cc.updated_at,
    upp.display_name,
    cr.reaction_type
  FROM community_comments cc
  LEFT JOIN user_profiles_public upp
    ON upp.user_id = cc.author_user_id
  LEFT JOIN community_reactions cr
    ON cr.comment_id = cc.id
    AND cr.user_id = p_user_id
    AND cr.post_id IS NULL
  WHERE cc.post_id = p_post_id
    AND cc.parent_comment_id IS NULL
  ORDER BY cc.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION get_user_connection_statuses(p_user_id uuid, p_profile_ids uuid[])
RETURNS TABLE (
  profile_user_id uuid,
  status text,
  connection_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    CASE
      WHEN uc.user_id = p_user_id THEN uc.connected_user_id
      ELSE uc.user_id
    END AS profile_user_id,
    uc.status,
    uc.user_id AS connection_user_id
  FROM user_connections uc
  WHERE uc.connection_type = 'connection'
    AND (
      (uc.user_id = p_user_id AND uc.connected_user_id = ANY(p_profile_ids))
      OR (uc.connected_user_id = p_user_id AND uc.user_id = ANY(p_profile_ids))
    );
$$;

CREATE OR REPLACE FUNCTION get_user_threads_with_details(p_user_id uuid)
RETURNS TABLE (
  thread_id uuid,
  participant_ids uuid[],
  thread_type text,
  thread_name text,
  last_message_at timestamptz,
  last_message_preview text,
  created_by uuid,
  created_at timestamptz,
  participant_names jsonb,
  unread_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    mt.id AS thread_id,
    mt.participant_ids,
    mt.thread_type,
    mt.thread_name,
    mt.last_message_at,
    mt.last_message_preview,
    mt.created_by,
    mt.created_at,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'user_id', upp.user_id,
        'display_name', upp.display_name,
        'avatar_url', upp.avatar_url
      )), '[]'::jsonb)
      FROM user_profiles_public upp
      WHERE upp.user_id = ANY(mt.participant_ids)
        AND upp.user_id != p_user_id
    ) AS participant_names,
    (
      SELECT COUNT(*)
      FROM direct_messages dm
      WHERE dm.thread_id = mt.id
        AND dm.sender_id != p_user_id
        AND NOT EXISTS (
          SELECT 1 FROM message_read_receipts mrr
          WHERE mrr.message_id = dm.id
            AND mrr.user_id = p_user_id
        )
    ) AS unread_count
  FROM message_threads mt
  WHERE p_user_id = ANY(mt.participant_ids)
  ORDER BY mt.last_message_at DESC;
$$;
