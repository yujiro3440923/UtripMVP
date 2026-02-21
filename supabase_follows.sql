-- ========================================
-- Vibe Orbit: follows テーブル
-- Supabase SQL Editor で実行してください
-- ========================================

CREATE TABLE public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のフォロー関係のみ閲覧・操作可能
CREATE POLICY "Users can view follows involving them" ON public.follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "Users can follow others" ON public.follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE USING (auth.uid() = follower_id);

-- ユーザー検索用にusersテーブルの参照許可（他ユーザーの名前取得）
-- 既に存在する場合はスキップ
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view other users for search'
  ) THEN
    CREATE POLICY "Users can view other users for search" ON public.users
      FOR SELECT USING (true);
  END IF;
END $$;
