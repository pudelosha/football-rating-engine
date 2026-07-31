import { useMemo, useState } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import type { BettingCoupon } from '../../../shared/types'
import { formatDate, formatOdds } from '../../../shared/utils'
import { formatCouponStatus, normalizeCouponStatus } from '../model/bettingModel'
import type { BettingTranslation } from '../types'

export function BettingCouponTable({
  t,
  title,
  coupons,
  emptyText,
  filterable = false,
  onDelete,
}: {
  t: BettingTranslation
  title: string
  coupons: BettingCoupon[]
  emptyText: string
  filterable?: boolean
  onDelete?: (couponId: number) => void
}) {
  const [search, setSearch] = useState('')
  const filteredCoupons = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) {
      return coupons
    }

    return coupons.filter((coupon) => [
      `#${coupon.id}`,
      coupon.id.toString(),
      formatDate(coupon.createdAtUtc, ''),
      formatCouponStatus(coupon.status, t),
      ...coupon.bets.flatMap((bet) => [
        bet.tournamentName,
        bet.tournamentSeason,
        bet.homeTeamName,
        bet.awayTeamName,
        bet.roundInfo,
      ]),
    ].some((value) => (value ?? '').toLowerCase().includes(normalizedSearch)))
  }, [coupons, search, t])

  return (
    <section className="details-panel">
      <div className="details-panel-heading spread">
        <div>
          <MenuIcon name="betting" />
          <h2>{title}</h2>
        </div>
        {filterable && (
          <label className="tournament-search compact betting-coupon-search">
            <span>{t.bettingSearchCoupons}</span>
            <input
              placeholder={t.bettingSearchCouponsPlaceholder}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        )}
      </div>
      {filteredCoupons.length > 0 ? (
        <div className="tournament-table-shell compact-table-shell">
          <table className="tournament-table betting-coupon-table">
            <thead>
              <tr>
                <th>{t.bettingCouponId}</th>
                <th>{t.bettingBetCount}</th>
                <th>{t.bettingBets}</th>
                <th>{t.bettingTotalOdds}</th>
                <th>{t.bettingStake}</th>
                <th>{t.bettingPotentialPayout}</th>
                <th>{t.bettingCreated}</th>
                <th>{t.bettingResult}</th>
                {onDelete && <th aria-label={t.delete}></th>}
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td><strong>#{coupon.id}</strong></td>
                  <td><strong>{coupon.bets.length}</strong></td>
                  <td>
                    <span className="coupon-bet-list">
                      {coupon.bets.map((bet) => (
                        <b key={bet.id}>{bet.homeTeamName} - {bet.awayTeamName}</b>
                      ))}
                    </span>
                  </td>
                  <td>{formatOdds(coupon.totalOdds)}</td>
                  <td>{coupon.stake.toFixed(2)}</td>
                  <td>{coupon.potentialPayout.toFixed(2)}</td>
                  <td>{formatDate(coupon.createdAtUtc, '-')}</td>
                  <td><span className={`coupon-status ${normalizeCouponStatus(coupon.status)}`}>{formatCouponStatus(coupon.status, t)}</span></td>
                  {onDelete && (
                    <td>
                      <button
                        type="button"
                        className="coupon-delete-button"
                        aria-label={`${t.delete} #${coupon.id}`}
                        title={`${t.delete} #${coupon.id}`}
                        onClick={() => onDelete(coupon.id)}
                      >
                        <MenuIcon name="trash" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="delete-modal-target betting-empty-state">
          <strong>{coupons.length === 0 ? emptyText : t.bettingNoCoupon}</strong>
        </div>
      )}
    </section>
  )
}
