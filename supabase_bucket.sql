-- ========================================
-- Vibe Bucket: バケット関連テーブル
-- Supabase SQL Editor で実行してください
-- ========================================

-- バケット（ウィッシュリスト）
CREATE TABLE public.vibe_buckets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '新しいバケット',
  description TEXT,
  is_shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- バケット内アイテム（URL/メモ）
CREATE TABLE public.bucket_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id UUID REFERENCES public.vibe_buckets(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  url TEXT,
  memo TEXT,
  ai_tags JSONB DEFAULT '{}',
  thumbnail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- バケットメンバー（共有相手）
CREATE TABLE public.bucket_members (
  bucket_id UUID REFERENCES public.vibe_buckets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (bucket_id, user_id)
);

-- RLS
ALTER TABLE public.vibe_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_members ENABLE ROW LEVEL SECURITY;

-- Policies: vibe_buckets
CREATE POLICY "Bucket owners can do everything" ON public.vibe_buckets
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Bucket members can view shared buckets" ON public.vibe_buckets
  FOR SELECT USING (
    is_shared = true AND EXISTS (
      SELECT 1 FROM public.bucket_members WHERE bucket_members.bucket_id = id AND bucket_members.user_id = auth.uid()
    )
  );

-- Policies: bucket_items
CREATE POLICY "Bucket item access for owners" ON public.bucket_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vibe_buckets WHERE vibe_buckets.id = bucket_items.bucket_id AND vibe_buckets.owner_id = auth.uid())
  );

CREATE POLICY "Bucket item access for members" ON public.bucket_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bucket_members WHERE bucket_members.bucket_id = bucket_items.bucket_id AND bucket_members.user_id = auth.uid())
  );

CREATE POLICY "Members can add items" ON public.bucket_items
  FOR INSERT WITH CHECK (
    auth.uid() = added_by AND
    EXISTS (SELECT 1 FROM public.bucket_members WHERE bucket_members.bucket_id = bucket_items.bucket_id AND bucket_members.user_id = auth.uid())
  );

-- Policies: bucket_members
CREATE POLICY "Bucket owners manage members" ON public.bucket_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.vibe_buckets WHERE vibe_buckets.id = bucket_members.bucket_id AND vibe_buckets.owner_id = auth.uid())
  );

CREATE POLICY "Members can view fellow members" ON public.bucket_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.bucket_members bm WHERE bm.bucket_id = bucket_members.bucket_id AND bm.user_id = auth.uid())
  );
