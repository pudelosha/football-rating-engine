import type { Translation } from '../../i18n'
import type { CombinedTeamRating, MatchPrediction, PredictionShape } from '../types'

export const DEFAULT_HOME_ADVANTAGE = 50
export const CALIBRATED_HOME_ADVANTAGE = 40

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function calculatePrediction(
  homeTeam: CombinedTeamRating,
  awayTeam: CombinedTeamRating,
  applyHomeAdvantage: boolean,
  labels: { home: string; draw: string; away: string },
  options?: { homeRating?: number; awayRating?: number; homeAdvantage?: number },
): MatchPrediction {
  const homeAdvantage = options?.homeAdvantage ?? (applyHomeAdvantage ? DEFAULT_HOME_ADVANTAGE : 0)
  const homeRating = options?.homeRating ?? homeTeam.finalRating
  const awayRating = options?.awayRating ?? awayTeam.finalRating
  const ratingGap = homeRating + homeAdvantage - awayRating
  const absoluteGap = Math.abs(ratingGap)
  let draw = clamp(0.255 * Math.exp(-absoluteGap / 560) + 0.085, 0.13, 0.34)
  const homeNoDraw = 1 / (1 + 10 ** (-ratingGap / 480))
  let homeWin = (1 - draw) * homeNoDraw
  let awayWin = 1 - draw - homeWin
  const homeUpsetFloor = applyHomeAdvantage ? 0.075 : 0.065
  const awayUpsetFloor = applyHomeAdvantage ? 0.055 : 0.065

  if (ratingGap > 0 && awayWin < awayUpsetFloor) {
    homeWin = Math.max(0.01, homeWin - (awayUpsetFloor - awayWin))
    awayWin = awayUpsetFloor
  } else if (ratingGap < 0 && homeWin < homeUpsetFloor) {
    awayWin = Math.max(0.01, awayWin - (homeUpsetFloor - homeWin))
    homeWin = homeUpsetFloor
  }

  if (ratingGap < -40) {
    const awayFavoriteDrawBoost = clamp((absoluteGap - 40) / 260 * 0.045, 0, 0.045)
    const transferredFromAway = Math.min(awayFavoriteDrawBoost, Math.max(0, awayWin - awayUpsetFloor))
    awayWin -= transferredFromAway
    draw += transferredFromAway
  }

  const total = homeWin + draw + awayWin
  homeWin /= total
  awayWin /= total
  const normalizedDraw = draw / total
  const outcomes = [
    { label: labels.home, chance: homeWin },
    { label: labels.draw, chance: normalizedDraw },
    { label: labels.away, chance: awayWin },
  ].sort((left, right) => right.chance - left.chance)

  return {
    homeWin,
    draw: normalizedDraw,
    awayWin,
    homeFairOdds: 1 / homeWin,
    drawFairOdds: 1 / normalizedDraw,
    awayFairOdds: 1 / awayWin,
    ratingGap,
    confidence: clamp((homeTeam.ratingConfidence + awayTeam.ratingConfidence) / 2, 0, 1),
    favoriteLabel: outcomes[0].label,
    favoriteChance: outcomes[0].chance,
  }
}

export function calculateCalibratedPrediction(
  homeTeam: CombinedTeamRating,
  awayTeam: CombinedTeamRating,
  applyHomeAdvantage: boolean,
  labels: { home: string; draw: string; away: string },
): MatchPrediction {
  const neutralGap = homeTeam.finalRating - awayTeam.finalRating
  const calibratedNeutralGap = neutralGap * 0.82
  const calibratedHomeAdvantage = applyHomeAdvantage ? CALIBRATED_HOME_ADVANTAGE : 0

  return calculatePrediction(homeTeam, awayTeam, applyHomeAdvantage, labels, {
    homeRating: calibratedNeutralGap / 2,
    awayRating: -calibratedNeutralGap / 2,
    homeAdvantage: calibratedHomeAdvantage,
  })
}

export function getPredictionShape(prediction: MatchPrediction, t: Translation): PredictionShape {
  const favoriteGapToDraw = prediction.favoriteChance - prediction.draw
  const spread = Math.max(prediction.homeWin, prediction.draw, prediction.awayWin) - Math.min(prediction.homeWin, prediction.draw, prediction.awayWin)
  const isHomeFavorite = prediction.homeWin >= prediction.awayWin
  const favoriteChance = prediction.favoriteChance
  let shape: string = t.balancedMatch
  let shapeSide = 'balanced'
  let shapeTone = 'balanced'

  if (spread > 0.10) {
    shapeSide = isHomeFavorite ? 'home' : 'away'

    if (favoriteChance < 0.42) {
      shape = isHomeFavorite ? t.slightHomeLean : t.slightAwayLean
      shapeTone = 'slight'
    } else if (favoriteChance < 0.48) {
      shape = isHomeFavorite ? t.moderateHomeLean : t.moderateAwayLean
      shapeTone = 'moderate'
    } else if (favoriteChance < 0.55) {
      shape = isHomeFavorite ? t.clearHomeLean : t.clearAwayLean
      shapeTone = 'clear'
    } else if (favoriteChance < 0.65) {
      shape = isHomeFavorite ? t.strongHomeLean : t.strongAwayLean
      shapeTone = 'strong'
    } else {
      shape = isHomeFavorite ? t.heavyHomeFavorite : t.heavyAwayFavorite
      shapeTone = 'heavy'
    }
  }

  let risk: string = t.veryLowDrawRisk
  let riskTone = 'very-low'

  if (prediction.draw >= 0.31) {
    risk = t.veryHighDrawRisk
    riskTone = 'very-high'
  } else if (prediction.draw >= 0.27) {
    risk = t.highDrawRisk
    riskTone = 'high'
  } else if (prediction.draw >= 0.23 || favoriteGapToDraw <= 0.12) {
    risk = t.moderateDrawRisk
    riskTone = 'moderate'
  } else if (prediction.draw >= 0.18) {
    risk = t.lowDrawRisk
    riskTone = 'low'
  }

  const copy = prediction.draw >= 0.31
    ? t.drawRiskVeryHighCopy
    : prediction.draw >= 0.27
      ? t.drawRiskHighCopy
      : prediction.draw >= 0.23 || favoriteGapToDraw <= 0.12
        ? t.drawRiskModerateCopy
        : prediction.draw >= 0.18
          ? t.drawRiskLowCopy
          : t.drawRiskVeryLowCopy

  return {
    shape,
    shapeSide,
    shapeTone,
    risk,
    riskTone,
    copy,
  }
}
