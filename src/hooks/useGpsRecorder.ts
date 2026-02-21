import { useEffect, useState, useRef } from 'react'
import { db } from '@/lib/db/dexie'
import { supabase } from '@/lib/supabase/client'
import { v4 as uuidv4 } from 'uuid'

interface GpsPoint {
    lat: number
    lng: number
    timestamp: Date
}

export function useGpsRecorder(tripId: string, isActive: boolean) {
    const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null)
    const [path, setPath] = useState<[number, number][]>([])
    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const watchIdRef = useRef<number | null>(null)
    const lastRecordedTimeRef = useRef<number>(0)
    const RECORD_INTERVAL_MS = 30000 // 30 seconds

    // Load existing path from local DB
    useEffect(() => {
        const loadPath = async () => {
            if (!tripId) return
            try {
                const points = await db.gps_points
                    .where('tripId')
                    .equals(tripId)
                    .sortBy('timestamp')

                if (points.length > 0) {
                    const loadedPath: [number, number][] = points.map(p => [p.lat, p.lng])
                    setPath(loadedPath)
                    const lastPoint = points[points.length - 1]
                    setCurrentPosition([lastPoint.lat, lastPoint.lng])
                }
            } catch (err) {
                console.error('Failed to load local path:', err)
            }
        }
        loadPath()
    }, [tripId])

    // GPS Recording Logic
    useEffect(() => {
        if (!isActive) {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            setIsRecording(false)
            return
        }

        if (!navigator.geolocation) {
            setError('お使いのブラウザは位置情報をサポートしていません。')
            return
        }

        setIsRecording(true)
        setError(null)

        const handleSuccess = async (position: GeolocationPosition) => {
            const { latitude, longitude } = position.coords
            const now = Date.now()

            // Update current position immediately for responsive UI
            setCurrentPosition([latitude, longitude])

            // Only record to DB and Path array every RECORD_INTERVAL_MS
            if (now - lastRecordedTimeRef.current >= RECORD_INTERVAL_MS) {
                lastRecordedTimeRef.current = now
                const timestamp = new Date(now)

                // 1. Update Map Path
                setPath(prev => [...prev, [latitude, longitude]])

                try {
                    // 2. Save to Local IndexedDB (Dexie)
                    await db.gps_points.add({
                        tripId,
                        lat: latitude,
                        lng: longitude,
                        timestamp,
                        synced: false
                    })

                    // 3. Attempt to sync to Supabase (Best effort)
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session) {
                        const { error: syncError } = await supabase.from('data_points').insert([{
                            trip_id: tripId,
                            user_id: session.user.id,
                            lat: latitude,
                            lng: longitude,
                            timestamp: timestamp.toISOString(),
                            point_type: 'auto'
                        }])

                        if (!syncError) {
                            // Mark as synced locally
                            const latestPoint = await db.gps_points.where({ tripId, timestamp }).first()
                            if (latestPoint?.id) {
                                await db.gps_points.update(latestPoint.id, { synced: true })
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error saving GPS point:', err)
                    // It's ok if Supabase fails, it's saved locally
                }
            }
        }

        const handleError = (err: GeolocationPositionError) => {
            console.warn('GPS Error:', err.message)
            setIsRecording(false)
            if (err.code === err.PERMISSION_DENIED) {
                setError('位置情報の取得が許可されていません。設定を確認してください。')
            } else {
                setError('位置情報の取得に失敗しました。')
            }
        }

        // Start watching position
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy: true,
                maximumAge: 10000,
                timeout: 27000
            }
        )

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
        }
    }, [tripId, isActive])

    return { currentPosition, path, isRecording, error }
}
