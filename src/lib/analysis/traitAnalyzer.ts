export interface TraitAnalysisResult {
    immersion_triggers: any
    exploration_score: number
    rhythm_pattern: any
    uncertainty_tolerance: number
    social_energy: number
    decision_style: string
    raw_stats: any
}

/**
 * 6軸特性分析のメインロジック
 * @param spots 検知された滞在スポット（キャリブレーション結果含む）
 * @param allDataPoints すべての記録データ（GPSおよび気分）
 * @param plannedSpots 事前に計画されたスポット（JSON等）
 */
export function analyzeTripData(
    spots: any[],
    allDataPoints: any[],
    plannedSpots: any[] = []
): TraitAnalysisResult {

    // 安全のためのフォールバック
    if (!spots || spots.length === 0) {
        return createEmptyResult()
    }

    // 1. 没入トリガー分析 (immersion_triggers)
    //   滞在時間30分以上、キャリブレーションで 'immersion' のものを抽出
    const immersionSpots = spots.filter(s => s.calibration_label === 'immersion')
    const tagsCount: Record<string, number> = {}

    immersionSpots.forEach(spot => {
        // スポット時間帯に記録されたタグを集計 (簡易実装)
        const relatedPoints = allDataPoints.filter(p =>
            new Date(p.timestamp) >= new Date(spot.arrival_time) &&
            new Date(p.timestamp) <= new Date(spot.departure_time) &&
            p.experience_tags && p.experience_tags.length > 0
        )

        relatedPoints.forEach(p => {
            p.experience_tags.forEach((tag: string) => {
                tagsCount[tag] = (tagsCount[tag] || 0) + 1
            })
        })
    })

    const sortedTags = Object.entries(tagsCount).sort((a, b) => b[1] - a[1])
    const primaryTag = sortedTags.length > 0 ? sortedTags[0][0] : 'unknown'

    const immersion_triggers = {
        primary: primaryTag,
        secondary: sortedTags.length > 1 ? sortedTags[1][0] : null,
        confidence: immersionSpots.length / spots.length || 0
    }

    // 2. 探索性vs専門性分析 (exploration_score)
    //   0: 深掘り型(少数箇所に長く滞在) 〜 1: 探索型(複数箇所を短く回る)
    const maxSpotDuration = Math.max(...spots.map(s => s.duration_minutes), 1)
    const avgSpotDuration = spots.reduce((s, c) => s + c.duration_minutes, 0) / spots.length

    // 訪問地点数を最大10として正規化（仮）
    const pointScore = Math.min(spots.length / 10, 1)
    const durationScore = 1 - (avgSpotDuration / maxSpotDuration)
    const exploration_score = (pointScore + durationScore) / 2

    // 3. パフォーマンスリズム分析 (rhythm_pattern)
    const rhythm_pattern = {
        peak_focus: "午後", // MVPモックデータ
        creative_window: "午前",
        recovery_time: "夕方",
        confidence: 0.7
    }

    // 4. 不確実性耐性 (uncertainty_tolerance) 0-1
    const uncertainty_tolerance = 0.6 // MVP固定値（要件F-035 Shouldなので適宜モック化）

    // 5. 社会的エネルギー (social_energy) -1(内向) ~ +1(外向)
    const pointsWithCompanion = allDataPoints.filter(p => p.companion && p.energy_score)
    let soloEnergy = 0, soloCount = 0
    let groupEnergy = 0, groupCount = 0

    pointsWithCompanion.forEach(p => {
        if (p.companion === 'solo') {
            soloEnergy += p.energy_score
            soloCount++
        } else {
            groupEnergy += p.energy_score
            groupCount++
        }
    })

    // 両方のデータがなければ0(中間)とする
    let social_energy = 0
    if (soloCount > 0 && groupCount > 0) {
        const avgSolo = soloEnergy / soloCount
        const avgGroup = groupEnergy / groupCount
        // -1 〜 1の範囲に丸める。グループ時の方が元気ならプラス
        social_energy = Math.max(-1, Math.min(1, (avgGroup - avgSolo) / 4))
    } else if (soloCount > 0) {
        social_energy = -0.5 // ソロデータのみ
    } else if (groupCount > 0) {
        social_energy = 0.5  // グループデータのみ
    }

    // 6. 意思決定スタイル (decision_style)
    // planned or spontaneous
    const decision_style = "spontaneous" // MVP固定値（事前の予定登録がShouldなため）

    return {
        immersion_triggers,
        exploration_score: parseFloat(exploration_score.toFixed(2)),
        rhythm_pattern,
        uncertainty_tolerance,
        social_energy: parseFloat(social_energy.toFixed(2)),
        decision_style,
        raw_stats: {
            total_spots: spots.length,
            total_duration_minutes: spots.reduce((sum, s) => sum + s.duration_minutes, 0)
        }
    }
}

function createEmptyResult(): TraitAnalysisResult {
    return {
        immersion_triggers: { primary: "unknown", confidence: 0 },
        exploration_score: 0.5,
        rhythm_pattern: { peak_focus: "不明" },
        uncertainty_tolerance: 0.5,
        social_energy: 0,
        decision_style: "balanced",
        raw_stats: { total_spots: 0, total_duration_minutes: 0 }
    }
}
