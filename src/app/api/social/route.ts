import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: フォロワー/フォロイング一覧取得
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const action = searchParams.get('action') // 'followers' | 'following' | 'search'
        const query = searchParams.get('q') // search query

        if (action === 'search' && query) {
            // ユーザー検索（名前またはメール）
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email')
                .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(10)

            if (error) throw error
            return NextResponse.json({ users: data })
        }

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }

        if (action === 'followers') {
            const { data, error } = await supabase
                .from('follows')
                .select('follower_id, created_at, users!follows_follower_id_fkey(id, name, email)')
                .eq('following_id', userId)

            if (error) throw error
            return NextResponse.json({ followers: data })
        }

        // Default: following list
        const { data, error } = await supabase
            .from('follows')
            .select('following_id, created_at, users!follows_following_id_fkey(id, name, email)')
            .eq('follower_id', userId)

        if (error) throw error
        return NextResponse.json({ following: data })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// POST: フォロー実行
export async function POST(req: Request) {
    try {
        const { followerId, followingId } = await req.json()

        if (!followerId || !followingId) {
            return NextResponse.json({ error: 'Both followerId and followingId are required' }, { status: 400 })
        }

        if (followerId === followingId) {
            return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('follows')
            .insert({ follower_id: followerId, following_id: followingId })
            .select()
            .single()

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ error: 'Already following' }, { status: 409 })
            }
            throw error
        }

        return NextResponse.json({ success: true, follow: data })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

// DELETE: フォロー解除
export async function DELETE(req: Request) {
    try {
        const { followerId, followingId } = await req.json()

        const { error } = await supabase
            .from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId)

        if (error) throw error

        return NextResponse.json({ success: true })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
