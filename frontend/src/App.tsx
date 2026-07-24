import { useEffect, useRef } from 'react'

const modelModules = [
  {
    label: 'FTSR v1',
    title: 'Base Elo',
    value: '70%',
    description:
      'Long-term team strength from match results, opponent quality, venue context, goal difference, and competition weight.',
  },
  {
    label: 'FTSR v1.5',
    title: 'Form Rating',
    value: '5-10',
    description:
      'Recent momentum separated from base strength, weighted by how fresh each match is.',
  },
  {
    label: 'FTSR v2',
    title: 'Performance',
    value: 'xG+',
    description:
      'Underlying match quality using xG, shots, possession, fouls, saves, offsides, and pressure signals.',
  },
  {
    label: 'FTSR v3',
    title: 'Squad Quality',
    value: 'TM',
    description:
      'Transfermarkt squad snapshots, top XI value, top 15 depth, age, positions, and player valuation coverage.',
  },
]

const pipelineSteps = [
  'LiveScore sync',
  'Match database',
  'Statistics import',
  'Squad snapshots',
  'Rating rebuilds',
  'Combined score',
]

const workspaceViews = [
  'Tournament command center',
  'Team rating profiles',
  'Match timeline and incidents',
  'Fixture monitoring',
  'Performance diagnostics',
  'Prediction lab',
]

const adminJobs = [
  'Schedule, live, results, and finalize services',
  'Transfermarkt team mapping and squad imports',
  'Base Elo, form, performance, and combined rebuilds',
  'Data quality checks for missing stats and stale matches',
]

function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    let animationFrame = 0
    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawPitch = (time: number) => {
      context.clearRect(0, 0, width, height)

      const gradient = context.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#0b1713')
      gradient.addColorStop(0.48, '#16231d')
      gradient.addColorStop(1, '#311716')
      context.fillStyle = gradient
      context.fillRect(0, 0, width, height)

      context.save()
      context.translate(width * 0.5, height * 0.51)
      context.rotate(-0.11)

      const pitchWidth = Math.min(width * 0.92, 1120)
      const pitchHeight = Math.min(height * 0.64, 520)
      const left = -pitchWidth / 2
      const top = -pitchHeight / 2

      context.strokeStyle = 'rgba(231, 247, 226, 0.15)'
      context.lineWidth = 1
      for (let x = left; x <= pitchWidth / 2; x += pitchWidth / 12) {
        context.beginPath()
        context.moveTo(x, top)
        context.lineTo(x, top + pitchHeight)
        context.stroke()
      }
      for (let y = top; y <= pitchHeight / 2; y += pitchHeight / 8) {
        context.beginPath()
        context.moveTo(left, y)
        context.lineTo(left + pitchWidth, y)
        context.stroke()
      }

      context.strokeStyle = 'rgba(245, 242, 220, 0.34)'
      context.lineWidth = 2
      context.strokeRect(left, top, pitchWidth, pitchHeight)
      context.beginPath()
      context.moveTo(0, top)
      context.lineTo(0, top + pitchHeight)
      context.stroke()
      context.beginPath()
      context.arc(0, 0, 72, 0, Math.PI * 2)
      context.stroke()

      const nodes: Array<[number, number, string]> = [
        [-0.38, -0.21, '#d8ff76'],
        [-0.2, 0.12, '#f2b84b'],
        [0.03, -0.28, '#76e4bd'],
        [0.25, 0.03, '#ff6c5f'],
        [0.42, -0.13, '#f5e7b2'],
        [0.11, 0.27, '#76e4bd'],
      ]

      for (let index = 0; index < nodes.length - 1; index += 1) {
        const [x1, y1] = nodes[index]
        const [x2, y2] = nodes[index + 1]
        const pulse = (Math.sin(time / 520 + index) + 1) / 2
        context.strokeStyle = `rgba(216, 255, 118, ${0.16 + pulse * 0.24})`
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(x1 * pitchWidth, y1 * pitchHeight)
        context.quadraticCurveTo(
          (x1 + x2) * pitchWidth * 0.5,
          (y1 + y2) * pitchHeight * 0.5 - 42,
          x2 * pitchWidth,
          y2 * pitchHeight,
        )
        context.stroke()
      }

      nodes.forEach(([x, y, color], index) => {
        const radius = 9 + Math.sin(time / 420 + index) * 2
        context.fillStyle = color
        context.shadowColor = color
        context.shadowBlur = 18
        context.beginPath()
        context.arc(x * pitchWidth, y * pitchHeight, radius, 0, Math.PI * 2)
        context.fill()
      })

      context.restore()

    }

    const animate = (time: number) => {
      drawPitch(time)
      animationFrame = window.requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)
    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas className="hero-field" ref={canvasRef} aria-hidden="true" />
}

function App() {
  return (
    <main className="app">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Football Rating Engine home">
          <span className="brand-mark">FR</span>
          <span>Football Rating Engine</span>
        </a>
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#model">Model</a>
          <a href="#workspace">Workspace</a>
          <a href="#admin">Admin</a>
        </nav>
        <a className="header-action" href="#preview">
          View Preview
        </a>
      </header>

      <section className="hero" id="top">
        <HeroField />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="eyebrow">Football intelligence platform</p>
          <h1>Team ratings that explain themselves before kickoff.</h1>
          <p className="hero-copy">
            A modern football analytics app built around FTSR: Elo foundation,
            live result sync, form, performance signals, squad value, and
            operator-grade data controls.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#workspace">
              Explore Platform
            </a>
            <a className="secondary-action" href="#model">
              See Rating Model
            </a>
          </div>
        </div>
        <div className="hero-metrics" id="preview" aria-label="Platform highlights">
          <div>
            <span>Combined Rating</span>
            <strong>FTSR v3.5</strong>
          </div>
          <div>
            <span>Data feeds</span>
            <strong>LiveScore + TM</strong>
          </div>
          <div>
            <span>Admin jobs</span>
            <strong>4 sync modes</strong>
          </div>
        </div>
      </section>

      <section className="section" id="model">
        <div className="section-heading">
          <p className="eyebrow">Model stack</p>
          <h2>From raw matches to a readable team strength score.</h2>
          <p>
            Each module stays independent, so the final rating can be explained,
            tuned, rebuilt, and tested without turning into a black box.
          </p>
        </div>
        <div className="module-grid">
          {modelModules.map((module) => (
            <article className="module-card" key={module.title}>
              <div className="module-topline">
                <span>{module.label}</span>
                <strong>{module.value}</strong>
              </div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="workspace-section" id="workspace">
        <div className="workspace-copy">
          <p className="eyebrow">Logged-in experience</p>
          <h2>A working desk for ratings, matches, squads, and predictions.</h2>
          <p>
            Regular users get clear rating tables, trend movement, team pages,
            match context, and confidence signals. The app should feel quick,
            factual, and useful during the football week.
          </p>
        </div>
        <div className="product-frame" aria-label="Application preview">
          <div className="frame-toolbar">
            <span />
            <span />
            <span />
          </div>
          <div className="rating-board">
            <div className="rating-row leader">
              <span>Arsenal</span>
              <strong>1798</strong>
              <small>+54 form</small>
            </div>
            <div className="rating-row">
              <span>Manchester City</span>
              <strong>1764</strong>
              <small>+31 squad</small>
            </div>
            <div className="rating-row">
              <span>Liverpool</span>
              <strong>1689</strong>
              <small>+22 performance</small>
            </div>
            <div className="rating-row">
              <span>Chelsea</span>
              <strong>1612</strong>
              <small>-8 confidence</small>
            </div>
          </div>
          <div className="signal-panel">
            <span>Data coverage</span>
            <div className="signal-bars">
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </section>

      <section className="section compact">
        <div className="view-grid">
          {workspaceViews.map((view) => (
            <div className="view-pill" key={view}>
              <span />
              {view}
            </div>
          ))}
        </div>
      </section>

      <section className="pipeline-section">
        <div className="section-heading narrow">
          <p className="eyebrow">Data pipeline</p>
          <h2>Designed for overnight syncs and matchday refreshes.</h2>
        </div>
        <div className="pipeline">
          {pipelineSteps.map((step, index) => (
            <div className="pipeline-step" key={step}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section" id="admin">
        <div className="admin-panel">
          <p className="eyebrow">Admin panel</p>
          <h2>Control room for the data that powers the ratings.</h2>
          <div className="admin-list">
            {adminJobs.map((job) => (
              <div className="admin-item" key={job}>
                <span />
                <p>{job}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="status-wall">
          <div>
            <span>Live sync</span>
            <strong>Healthy</strong>
          </div>
          <div>
            <span>Latest Elo run</span>
            <strong>Complete</strong>
          </div>
          <div>
            <span>Squad imports</span>
            <strong>Queued</strong>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <p className="eyebrow">Next phase</p>
        <h2>Ready for authentication, routing, and real backend integration.</h2>
        <p>
          The public story is now in place. The logged-in application can grow
          from this visual language into dashboards, admin workflows, and rating
          explainers.
        </p>
      </section>
    </main>
  )
}

export default App
