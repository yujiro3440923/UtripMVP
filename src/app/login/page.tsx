'use client'

import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { useState } from 'react'
import { Activity } from 'lucide-react'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : '/',
                },
            })
            if (error) throw error
        } catch (error: unknown) {
            if (error instanceof Error) {
                alert(error.message)
            } else {
                alert('ログイン中にエラーが発生しました。')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col justify-center items-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="max-w-md w-full bg-neutral-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-neutral-700/50 z-10">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
                        <Activity className="text-neutral-900 w-8 h-8" />
                    </div>
                </div>
                <h1 className="text-4xl font-black mb-3 text-center bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-400">Utrip</h1>
                <p className="text-neutral-400 text-center mb-10 font-medium">旅行体験から、あなたの「キャリアの原石」を見つける</p>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white text-neutral-900 font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-neutral-100 transition-all duration-300 disabled:opacity-70 hover:scale-[1.02] shadow-lg"
                >
                    <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={20} height={20} />
                    {loading ? '読み込み中...' : 'Googleでログイン'}
                </button>

                <p className="text-xs text-center text-neutral-500 mt-8">
                    ログインすることで、利用規約およびプライバシーポリシーに同意したものとみなされます。
                </p>
            </div>
        </div>
    )
}
