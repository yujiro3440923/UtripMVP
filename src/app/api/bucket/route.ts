import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: バケット一覧 or バケット詳細
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const bucketId = searchParams.get('bucketId')

        // 特定バケットの詳細（アイテム付き）
        if (bucketId) {
            const { data: bucket, error: bErr } = await supabase
                .from('vibe_buckets')
                .select('*')
                .eq('id', bucketId)
                .single()

            if (bErr) throw bErr

            const { data: items } = await supabase
                .from('bucket_items')
                .select('*, users!bucket_items_added_by_fkey(name, email)')
                .eq('bucket_id', bucketId)
                .order('created_at', { ascending: false })

            const { data: members } = await supabase
                .from('bucket_members')
                .select('user_id, joined_at, users!bucket_members_user_id_fkey(name, email)')
                .eq('bucket_id', bucketId)

            return NextResponse.json({ bucket, items: items || [], members: members || [] })
        }

        // ユーザーの全バケット
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const { data: owned, error } = await supabase
            .from('vibe_buckets')
            .select('*, bucket_items(count)')
            .eq('owner_id', userId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return NextResponse.json({ buckets: owned || [] })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// POST: バケット作成 or アイテム追加
export async function POST(req: Request) {
    try {
        const body = await req.json()

        // アイテム追加
        if (body.action === 'add_item') {
            const { bucketId, userId, url, memo } = body

            // AIタグ自動付与を試行
            let ai_tags = {}
            try {
                const tagRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/bucket-tag`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, memo })
                })
                const tagData = await tagRes.json()
                if (tagData.tags) ai_tags = tagData.tags
            } catch { /* タグ付け失敗は無視 */ }

            const { data, error } = await supabase
                .from('bucket_items')
                .insert({
                    bucket_id: bucketId,
                    added_by: userId,
                    url: url || null,
                    memo: memo || null,
                    ai_tags
                })
                .select()
                .single()

            if (error) throw error
            return NextResponse.json({ success: true, item: data })
        }

        // メンバー追加
        if (body.action === 'add_member') {
            const { bucketId, userId } = body
            const { error } = await supabase
                .from('bucket_members')
                .insert({ bucket_id: bucketId, user_id: userId })

            if (error) {
                if (error.code === '23505') return NextResponse.json({ error: 'Already a member' }, { status: 409 })
                throw error
            }
            return NextResponse.json({ success: true })
        }

        // バケット作成
        const { userId, name, description } = body
        if (!userId || !name) return NextResponse.json({ error: 'userId and name required' }, { status: 400 })

        const { data, error } = await supabase
            .from('vibe_buckets')
            .insert({ owner_id: userId, name, description })
            .select()
            .single()

        if (error) throw error

        // オーナーも自動的にメンバーに
        await supabase.from('bucket_members').insert({ bucket_id: data.id, user_id: userId })

        return NextResponse.json({ success: true, bucket: data })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// DELETE: バケット or アイテム削除
export async function DELETE(req: Request) {
    try {
        const body = await req.json()

        if (body.itemId) {
            const { error } = await supabase.from('bucket_items').delete().eq('id', body.itemId)
            if (error) throw error
        } else if (body.bucketId) {
            const { error } = await supabase.from('vibe_buckets').delete().eq('id', body.bucketId)
            if (error) throw error
        }

        return NextResponse.json({ success: true })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
