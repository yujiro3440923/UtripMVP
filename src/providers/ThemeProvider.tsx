'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'default' | 'ocean' | 'sunset' | 'amethyst' | 'monochrome'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    lightMode: boolean
    toggleLightMode: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('default')
    const [lightMode, setLightMode] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        // Load theme from localStorage on mount
        const savedTheme = localStorage.getItem('utrip-theme') as Theme
        if (savedTheme && ['default', 'ocean', 'sunset', 'amethyst', 'monochrome'].includes(savedTheme)) {
            setThemeState(savedTheme)
        }
        const savedLightMode = localStorage.getItem('utrip-light-mode')
        if (savedLightMode === 'true') {
            setLightMode(true)
        }
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return

        // Apply theme class to document element
        const root = document.documentElement

        // Remove all existing theme classes
        root.classList.remove('theme-ocean', 'theme-sunset', 'theme-amethyst', 'theme-monochrome')

        // Add new theme class if not default
        if (theme !== 'default') {
            root.classList.add(`theme-${theme}`)
        }

        // Handle light mode
        if (lightMode) {
            root.classList.add('light-mode')
        } else {
            root.classList.remove('light-mode')
        }

        // Save to localStorage
        localStorage.setItem('utrip-theme', theme)
        localStorage.setItem('utrip-light-mode', String(lightMode))
    }, [theme, lightMode, mounted])

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
    }

    const toggleLightMode = () => {
        setLightMode(prev => !prev)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, lightMode, toggleLightMode }}>
            <div style={{ visibility: mounted ? 'visible' : 'hidden' }} className="contents">
                {children}
            </div>
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
