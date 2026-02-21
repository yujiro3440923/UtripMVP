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
        <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
            {/* Animated Background Gradients */}
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-900/30 via-[#050505] to-blue-900/40 animate-gradient-xy z-0"></div>

            {/* Floating Orbs */}
            <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none animate-float" style={{ animationDelay: '0s' }}></div>
            <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none animate-float" style={{ animationDelay: '2s' }}></div>

            <div className="glass-effect-dark max-w-md w-full p-10 rounded-[2.5rem] z-10 animate-fade-in-up">
                <div className="flex flex-col items-center justify-center mb-10 relative">
                    <div className="absolute inset-0 bg-teal-400/20 blur-[30px] rounded-full animate-pulse-glow"></div>
                    <div className="relative z-10 animate-float flex flex-col items-center" style={{ animationDuration: '4s' }}>
                        <Image
                            src="/images/Utriprogo.png"
                            alt="Utrip Logo"
                            width={240}
                            height={80}
                            className="object-contain drop-shadow-[0_10px_20px_rgba(20,184,166,0.3)] mb-1"
                            priority
                        />
                        <span className="text-sm font-black tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-white to-blue-200 uppercase drop-shadow-[0_2px_10px_rgba(20,184,166,0.8)]">
                            Utrip (MVP)
                        </span>
                    </div>
                </div>

                <p className="text-neutral-400 text-center mb-12 font-medium leading-relaxed">
                    旅行体験から、あなたの<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400 font-bold">「キャリアの原石」</span>を見つける
                </p>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="group w-full relative overflow-hidden bg-white text-neutral-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 disabled:opacity-50 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(45,212,191,0.3)] active:scale-95"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white via-neutral-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={24} height={24} className="relative z-10" />
                    <span className="relative z-10 text-lg tracking-wide">{loading ? '認証中...' : 'Googleでログイン'}</span>
                </button>

                <div className="mt-10 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neutral-700 to-transparent h-[1px] top-0"></div>
                    <p className="text-[11px] text-center text-neutral-500 pt-6 leading-relaxed">
                        ログインすることで、利用規約および<br />プライバシーポリシーに同意したものとみなされます。
                    </p>
                </div>
            </div>
        </div>
    )
}
