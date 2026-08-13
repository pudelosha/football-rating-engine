import { MenuIcon } from '../../../shared/components/Icons'
import { ModalShell } from '../../../shared/components/Modal/ModalShell'
import type { SocialBettingMatchSummary } from '../types'

function formatMaybeNumber(value?: number) {
  return value === null || value === undefined ? '-' : value.toFixed(value % 1 === 0 ? 0 : 2)
}

function MatchSummarySplitBar({ summary }: { summary: SocialBettingMatchSummary }) {
  const parts = [
    ['home', 'Home win', summary.homeWinPercentage],
    ['draw', 'Draw', summary.drawPercentage],
    ['away', 'Away win', summary.awayWinPercentage],
  ] as const

  return (
    <div className="social-betting-summary-split">
      {parts.map(([key, label, value]) => (
        value > 0 ? (
          <span className={key} key={key} style={{ width: `${value}%` }}>
            <b>{label}</b>
            <strong>{value}%</strong>
          </span>
        ) : null
      ))}
    </div>
  )
}

export function SocialBettingMatchSummaryModal({
  isLoading,
  onCancel,
  summary,
}: {
  isLoading: boolean
  onCancel: () => void
  summary?: SocialBettingMatchSummary
}) {
  return (
    <ModalShell className="delete-modal social-betting-summary-modal" onCancel={onCancel}>
      <button className="modal-close-button" type="button" aria-label="Close" onClick={onCancel}>x</button>
      <div className="delete-modal-icon">
        <MenuIcon name="matches" />
      </div>
      <div className="delete-modal-copy">
        <p className="eyebrow">Bet summary</p>
        <h2>{summary ? `${summary.homeTeam} vs ${summary.awayTeam}` : 'Loading match'}</h2>
      </div>

      {isLoading || !summary ? (
        <div className="social-betting-empty-list">Loading participant bets.</div>
      ) : (
        <div className="social-betting-summary-content">
          <div className="social-betting-summary-score">
            <span>
              <strong>{summary.homeTeam}</strong>
              <b>{formatMaybeNumber(summary.homeScore)}</b>
            </span>
            <small>{summary.kickoff}</small>
            <span>
              <strong>{summary.awayTeam}</strong>
              <b>{formatMaybeNumber(summary.awayScore)}</b>
            </span>
          </div>

          <div className="social-betting-summary-participants">
            {summary.placedBetCount} out of {summary.participantCount} participants placed bets
          </div>

          <MatchSummarySplitBar summary={summary} />

          <div className="social-betting-summary-average">
            <span>
              <small>{summary.homeTeam}</small>
              <strong>{summary.averageHomeGoals}</strong>
            </span>
            <b>Average predicted goals</b>
            <span>
              <small>{summary.awayTeam}</small>
              <strong>{summary.averageAwayGoals}</strong>
            </span>
          </div>

          {summary.hasStarted ? (
            <div className="social-betting-summary-table">
              <div className="social-betting-summary-row header">
                <span>Player</span>
                <span>Bet</span>
                <span>1</span>
                <span>X</span>
                <span>2</span>
                <span>P</span>
              </div>
              {summary.userBets.map((bet) => (
                <div className="social-betting-summary-row" key={`${bet.playerName}-${bet.bet}`}>
                  <strong>{bet.playerName}</strong>
                  <b>{bet.bet}</b>
                  <span className={bet.homeWin ? 'ok' : ''}>{bet.homeWin ? '✓' : ''}</span>
                  <span className={bet.draw ? 'ok' : ''}>{bet.draw ? '✓' : ''}</span>
                  <span className={bet.awayWin ? 'ok' : ''}>{bet.awayWin ? '✓' : ''}</span>
                  <span className={bet.outcomeMatched === true ? 'ok' : bet.outcomeMatched === false ? 'failed' : ''}>
                    {bet.outcomeMatched === true ? '✓' : bet.outcomeMatched === false ? '×' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="social-betting-empty-list">Full participant bets unlock after kickoff.</div>
          )}
        </div>
      )}
    </ModalShell>
  )
}
