/**
 * rankingData.js
 * Reference data for calculating player percentiles based on typical game stats.
 */

const RANKING_DATA = {
    // 1. SKY DEFENDER (Score)
    // Adjusted: Top tier 1200 (was 2000)
    skyDefender: [
        { score: 0, percentile: 10, tier: "Cadet" },
        { score: 80, percentile: 30, tier: "Private" },
        { score: 200, percentile: 50, tier: "Sergeant" },
        { score: 400, percentile: 75, tier: "Lieutenant" },
        { score: 800, percentile: 90, tier: "Captain" },
        { score: 1200, percentile: 99, tier: "Sky Marshal" }
    ],

    // 2. AIM TRAINER (Score)
    // Adjusted: Top tier 85 (was 100)
    aimTrainer: [
        { score: 10, percentile: 10, tier: "Rusty" },
        { score: 25, percentile: 40, tier: "Average" },
        { score: 40, percentile: 60, tier: "Sharp" },
        { score: 55, percentile: 80, tier: "Sniper" },
        { score: 70, percentile: 95, tier: "Aimbot" },
        { score: 85, percentile: 99.9, tier: "Human Benzmark" }
    ],

    // 3. MOVEMENT TRAINER (Survival Time in Seconds)
    // Adjusted: Top tier 120s (2 mins) as requested
    movementTrainer: [
        { score: 10, percentile: 20, tier: "Walking Target" },
        { score: 30, percentile: 50, tier: "Survivor" },
        { score: 60, percentile: 75, tier: "Dodger" },
        { score: 90, percentile: 90, tier: "Ninja" },
        { score: 120, percentile: 99, tier: "Untouchable" }
    ]
};

function calculatePercentile(gameKey, score) {
    const data = RANKING_DATA[gameKey];
    if (!data) return { percentile: 0, tier: "Unknown" };

    // Check bounds
    if (score < data[0].score) return { percentile: 1.0, tier: data[0].tier };
    if (score >= data[data.length - 1].score) return { percentile: 99.9, tier: data[data.length - 1].tier };

    // Linear interpolation
    for (let i = 0; i < data.length - 1; i++) {
        const lower = data[i];
        const upper = data[i + 1];

        if (score >= lower.score && score < upper.score) {
            const ratio = (score - lower.score) / (upper.score - lower.score);
            const p = lower.percentile + ratio * (upper.percentile - lower.percentile);
            return { percentile: p.toFixed(1), tier: lower.tier };
        }
    }

    return { percentile: 50, tier: "Unknown" };
}

// Attach to window for global access
window.RANKING_DATA = RANKING_DATA;
window.calculatePercentile = calculatePercentile;
