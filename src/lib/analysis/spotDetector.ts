import { getDistance } from 'geolib'
import { v4 as uuidv4 } from 'uuid'

export interface GpsDataPoint {
    id: string
    lat: number
    lng: number
    timestamp: string // ISO string
    mood_score?: number | null
    energy_score?: number | null
    experience_tags?: string[] | null
    companion?: string | null
    point_type: string
}

export interface DetectedSpot {
    id: string
    trip_id: string
    lat: number
    lng: number
    arrival_time: string
    departure_time: string
    duration_minutes: number
    mood_before: number | null
    mood_after: number | null
}

const SPOT_RADIUS_METERS = 100
const MIN_DURATION_MINUTES = 30

/**
 * GPS履歴データから「同一地域（半径100m）に30分以上滞在した場所」をスポットとして切り出します。
 */
export function detectStaySpots(tripId: string, points: GpsDataPoint[]): DetectedSpot[] {
    if (points.length === 0) return []

    // タイムスタンプ順にソート
    const sortedPoints = [...points].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    const spots: DetectedSpot[] = []

    let clusterStartIdx = 0

    for (let i = 1; i < sortedPoints.length; i++) {
        const startPoint = sortedPoints[clusterStartIdx]
        const currentPoint = sortedPoints[i]

        // startPointとcurrentPointの距離を計算
        const distance = getDistance(
            { latitude: startPoint.lat, longitude: startPoint.lng },
            { latitude: currentPoint.lat, longitude: currentPoint.lng }
        )

        // 半径100mを越えた場合、そこまでのクラスタを評価する
        if (distance > SPOT_RADIUS_METERS) {
            const endPoint = sortedPoints[i - 1]

            const startTime = new Date(startPoint.timestamp).getTime()
            const endTime = new Date(endPoint.timestamp).getTime()
            const durationMinutes = (endTime - startTime) / (1000 * 60)

            // 滞在時間が30分以上であればスポットとして確定
            if (durationMinutes >= MIN_DURATION_MINUTES) {

                // クラスタ内の気分データを検索（直前・直後として最も近いものを採用する簡易ロジック）
                const clusterPoints = sortedPoints.slice(clusterStartIdx, i)
                const moodPoints = clusterPoints.filter(p => p.mood_score != null)

                let moodBefore = null
                let moodAfter = null

                if (moodPoints.length > 0) {
                    moodBefore = moodPoints[0].mood_score || null
                    moodAfter = moodPoints[moodPoints.length - 1].mood_score || null
                }

                // 中心座標はクラスタの平均をとる
                const avgLat = clusterPoints.reduce((sum, p) => sum + p.lat, 0) / clusterPoints.length
                const avgLng = clusterPoints.reduce((sum, p) => sum + p.lng, 0) / clusterPoints.length

                spots.push({
                    id: uuidv4(),
                    trip_id: tripId,
                    lat: avgLat,
                    lng: avgLng,
                    arrival_time: startPoint.timestamp,
                    departure_time: endPoint.timestamp,
                    duration_minutes: Math.round(durationMinutes),
                    mood_before: moodBefore,
                    mood_after: moodAfter
                })
            }

            // 新しいクラスタの開始地点を現在のインデックスに更新
            clusterStartIdx = i
        }
    }

    // 最後のクラスタの評価（現在進行形で滞在中の場合）
    const finalStartPoint = sortedPoints[clusterStartIdx]
    const finalEndPoint = sortedPoints[sortedPoints.length - 1]
    const finalStartTime = new Date(finalStartPoint.timestamp).getTime()
    const finalEndTime = new Date(finalEndPoint.timestamp).getTime()
    const finalDurationMinutes = (finalEndTime - finalStartTime) / (1000 * 60)

    if (finalDurationMinutes >= MIN_DURATION_MINUTES) {
        const clusterPoints = sortedPoints.slice(clusterStartIdx)
        const avgLat = clusterPoints.reduce((sum, p) => sum + p.lat, 0) / clusterPoints.length
        const avgLng = clusterPoints.reduce((sum, p) => sum + p.lng, 0) / clusterPoints.length

        spots.push({
            id: uuidv4(),
            trip_id: tripId,
            lat: avgLat,
            lng: avgLng,
            arrival_time: finalStartPoint.timestamp,
            departure_time: finalEndPoint.timestamp,
            duration_minutes: Math.round(finalDurationMinutes),
            mood_before: null, // 簡易化のため判定省略
            mood_after: null
        })
    }

    return spots
}
