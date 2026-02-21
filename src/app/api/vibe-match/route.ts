import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0
    let dotProduct = 0, magA = 0, magB = 0
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i]
        magA += a[i] * a[i]
        magB += b[i] * b[i]
    }
    const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
    return magnitude === 0 ? 0 : dotProduct / magnitude
}

// Extract 6-axis vector from profile data
function extractVector(profile: Record<string, any>): number[] {
    return [
        profile?.exploration_score || 0,
        profile?.immersion_triggers?.confidence || 0,
        ((profile?.social_energy || 0) + 1) / 2, // normalize -1~1 to 0~1
        profile?.uncertainty_tolerance || 0,
        profile?.decision_style === 'spontaneous' ? 1 : profile?.decision_style === 'balanced' ? 0.5 : 0,
        0.5 // activity placeholder
    ]
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }

        // 1. Get user's own profile
        const { data: myProfile } = await supabase
            .from('personal_profiles')
            .select('profile_data')
            .eq('user_id', userId)
            .single()

        const myVector = myProfile?.profile_data ? extractVector(myProfile.profile_data) : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]

        // 2. Get following list
        const { data: following } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', userId)

        if (!following || following.length === 0) {
            return NextResponse.json({ matches: [], myVector })
        }

        const followingIds = following.map(f => f.following_id)

        // 3. Get profiles and user info of following
        const { data: users } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', followingIds)

        const { data: profiles } = await supabase
            .from('personal_profiles')
            .select('user_id, profile_data')
            .in('user_id', followingIds)

        const profileMap = new Map<string, Record<string, any>>()
        profiles?.forEach(p => profileMap.set(p.user_id, p.profile_data))

        // 4. Compute vibe similarity
        const matches = (users || []).map(user => {
            const theirProfile = profileMap.get(user.id)
            const theirVector = theirProfile ? extractVector(theirProfile) : [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
            const similarity = cosineSimilarity(myVector, theirVector)

            return {
                userId: user.id,
                name: user.name || user.email?.split('@')[0] || 'Unknown',
                email: user.email,
                similarity: Math.round(similarity * 100),
                vector: theirVector
            }
        })

        // Sort by similarity descending
        matches.sort((a, b) => b.similarity - a.similarity)

        return NextResponse.json({ matches, myVector })

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
