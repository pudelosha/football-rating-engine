import type { ReactNode } from 'react'
import { HeroField } from '../../../shared/components/HeroField/HeroField'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'

export function AuthLayout({
  isProcessing,
  loadingLabel,
  children,
}: {
  isProcessing?: boolean
  loadingLabel: string
  children: ReactNode
}) {
  return (
    <>
      {isProcessing && <FullPageProcessingOverlay label={loadingLabel} />}
      <section className="auth-section">
        <HeroField />
        <div className="hero-shade" />
        {children}
      </section>
    </>
  )
}
