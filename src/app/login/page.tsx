'use client'

import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useTheme } from '@/providers/ThemeProvider'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const { lightMode } = useTheme()

    const handleGoogleLogin = async () => {
        try {
            setLoading(true)
            const redirectUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/`
                : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000/';

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl },
            })
            if (error) throw error
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message)
            } else {
                toast.error('ログイン中にエラーが発生しました。')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`min-h-screen ${lightMode ? 'bg-[#f5f5f9]' : 'bg-[#020208]'} text-[var(--foreground)] flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans`}>

            {/* === Background: Neon light flows === */}
            <div className="absolute inset-0 z-0">
                {/* Large flowing aurora gradients */}
                <div className="absolute top-[-30%] left-[-20%] w-[800px] h-[800px] bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-transparent rounded-full blur-[160px] animate-breathe" style={{ animationDelay: '0s', animationDuration: '6s' }}></div>
                <div className="absolute bottom-[-20%] right-[-15%] w-[700px] h-[700px] bg-gradient-to-tl from-teal-500/25 via-cyan-500/15 to-transparent rounded-full blur-[140px] animate-breathe" style={{ animationDelay: '2s', animationDuration: '7s' }}></div>
                <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-gradient-to-b from-purple-500/20 to-pink-500/10 rounded-full blur-[120px] animate-breathe" style={{ animationDelay: '4s', animationDuration: '8s' }}></div>

                {/* Floating light particles */}
                <div className="absolute top-[15%] left-[25%] w-2 h-2 bg-blue-400/60 rounded-full animate-antigrav" style={{ animationDuration: '10s' }}></div>
                <div className="absolute top-[60%] left-[15%] w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-antigrav" style={{ animationDuration: '12s', animationDelay: '2s' }}></div>
                <div className="absolute top-[30%] right-[20%] w-1 h-1 bg-teal-300/70 rounded-full animate-antigrav" style={{ animationDuration: '9s', animationDelay: '1s' }}></div>
                <div className="absolute bottom-[25%] right-[30%] w-2.5 h-2.5 bg-cyan-400/40 rounded-full animate-antigrav" style={{ animationDuration: '11s', animationDelay: '3s' }}></div>
                <div className="absolute top-[45%] left-[60%] w-1 h-1 bg-white/30 rounded-full animate-antigrav" style={{ animationDuration: '14s', animationDelay: '5s' }}></div>
            </div>

            {/* === Main floating glass card === */}
            <div className="glass-ultra relative max-w-md w-full p-10 rounded-[2.5rem] z-10 animate-slide-up-spring glass-shimmer overflow-hidden">

                {/* Inner light refraction */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                {/* Logo area with glow */}
                <div className="flex flex-col items-center justify-center mb-10 relative">
                    <div className="absolute inset-0 bg-teal-400/15 blur-[40px] rounded-full animate-breathe" style={{ animationDuration: '5s' }}></div>
                    <div className="relative z-10 animate-antigrav flex flex-col items-center" style={{ animationDuration: '6s' }}>
                        <Image
                            src="/images/Utriprogo.png"
                            alt="Utrip Logo"
                            width={240}
                            height={80}
                            className="object-contain drop-shadow-[0_10px_30px_rgba(20,184,166,0.4)] mb-2"
                            priority
                        />
                        <span className="text-sm font-black tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-white/90 to-blue-200 uppercase drop-shadow-[0_2px_10px_rgba(20,184,166,0.8)]">
                            Utrip (MVP)
                        </span>
                    </div>
                </div>

                {/* Tagline */}
                <p className="text-neutral-400 text-center mb-12 font-medium leading-relaxed">
                    旅行体験から、あなたの<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-400 font-bold">「キャリアの原石」</span>を見つける
                </p>

                {/* Login button — floating glass style */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="group w-full relative overflow-hidden glass-ultra text-white font-bold py-4.5 px-6 rounded-2xl flex items-center justify-center gap-4 transition-all duration-500 disabled:opacity-50 hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(45,212,191,0.2)] active:scale-95"
                >
                    {/* Hover shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%]" style={{ transition: 'transform 0.8s ease' }}></div>
                    <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={24} height={24} className="relative z-10" />
                    <span className="relative z-10 text-lg tracking-wide">{loading ? '認証中...' : 'Googleでログイン'}</span>
                </button>

                {/* Floating data spheres — decorative */}
                <div className="flex justify-center gap-8 mt-10">
                    <div className="flex flex-col items-center gap-2 animate-antigrav" style={{ animationDuration: '7s', animationDelay: '0.5s' }}>
                        <div className="w-10 h-10 glow-sphere opacity-60"></div>
                        <span className="text-[10px] text-neutral-500 font-bold tracking-widest">記録</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 animate-antigrav" style={{ animationDuration: '8s', animationDelay: '1s' }}>
                        <div className="w-12 h-12 glow-sphere opacity-70" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(99,102,241,0.4) 40%, transparent 70%)', boxShadow: '0 0 30px rgba(99,102,241,0.4), 0 0 60px rgba(99,102,241,0.1)' }}></div>
                        <span className="text-[10px] text-neutral-500 font-bold tracking-widest">分析</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 animate-antigrav" style={{ animationDuration: '9s', animationDelay: '1.5s' }}>
                        <div className="w-10 h-10 glow-sphere opacity-60" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), rgba(168,85,247,0.4) 40%, transparent 70%)', boxShadow: '0 0 30px rgba(168,85,247,0.4), 0 0 60px rgba(168,85,247,0.1)' }}></div>
                        <span className="text-[10px] text-neutral-500 font-bold tracking-widest">発見</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="mt-8 overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent h-[1px] top-0"></div>
                    <p className="text-[11px] text-center text-neutral-600 pt-5 leading-relaxed">
                        ログインすることで、利用規約および<br />プライバシーポリシーに同意したものとみなされます。
                    </p>
                </div>
            </div>

            {/* Orbiting sphere around login card */}
            <div className="absolute z-5 w-3 h-3 rounded-full bg-teal-400/50 blur-[2px] animate-orbit" style={{ animationDuration: '25s', top: '50%', left: '50%' }}></div>
        </div>
    )
}
