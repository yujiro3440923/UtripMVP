'use client'

import { useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface UseSwipeNavOptions {
    leftPath?: string    // swipe right → navigate left
    rightPath?: string   // swipe left → navigate right
    threshold?: number   // minimum px to trigger (default: 80)
}

export function useSwipeNav({ leftPath, rightPath, threshold = 80 }: UseSwipeNavOptions) {
    const router = useRouter()
    const touchStartX = useRef<number>(0)
    const touchStartY = useRef<number>(0)
    const isSwiping = useRef(false)

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX
        touchStartY.current = e.touches[0].clientY
        isSwiping.current = true
    }, [])

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!isSwiping.current) return
        isSwiping.current = false

        const deltaX = e.changedTouches[0].clientX - touchStartX.current
        const deltaY = e.changedTouches[0].clientY - touchStartY.current

        // Only trigger if horizontal swipe is dominant (prevents conflict with scroll)
        if (Math.abs(deltaX) < threshold || Math.abs(deltaY) > Math.abs(deltaX) * 0.7) return

        if (deltaX > 0 && leftPath) {
            // Swiped right → go to left page
            router.push(leftPath)
        } else if (deltaX < 0 && rightPath) {
            // Swiped left → go to right page
            router.push(rightPath)
        }
    }, [router, leftPath, rightPath, threshold])

    return { onTouchStart, onTouchEnd }
}
