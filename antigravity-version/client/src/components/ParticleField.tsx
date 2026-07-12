import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

const colors = ['#3b82f6', '#06b6d4', '#22d3ee', '#60a5fa', '#0ea5e9']

export function ParticleField({ density = 0.5 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000, prevX: -1000, prevY: -1000 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    function handleMove(e: MouseEvent) {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.prevX = mouseRef.current.x
      mouseRef.current.prevY = mouseRef.current.y
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top

      // Spawn particles on mouse move
      const dx = mouseRef.current.x - mouseRef.current.prevX
      const dy = mouseRef.current.y - mouseRef.current.prevY
      const speed = Math.sqrt(dx * dx + dy * dy)
      const count = Math.min(Math.floor(speed * density), 5)
      for (let i = 0; i < count; i++) {
        spawnParticle(mouseRef.current.x, mouseRef.current.y, dx, dy)
      }
    }

    function spawnParticle(x: number, y: number, dx: number, dy: number) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 2 + 0.5
      const maxLife = Math.random() * 60 + 40
      particlesRef.current.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed + dx * 0.1,
        vy: Math.sin(angle) * speed + dy * 0.1,
        life: 0,
        maxLife,
        size: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
      // Cap particle count
      if (particlesRef.current.length > 300) {
        particlesRef.current.splice(0, particlesRef.current.length - 300)
      }
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const particles = particlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life++
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.02 // slight gravity
        p.vx *= 0.99
        p.vy *= 0.99

        const alpha = 1 - p.life / p.maxLife
        if (alpha <= 0) {
          particles.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.floor(alpha * 200).toString(16).padStart(2, '0')
        ctx.fill()

        // Glow effect
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha * 3, 0, Math.PI * 2)
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * alpha * 3)
        grad.addColorStop(0, p.color + '30')
        grad.addColorStop(1, p.color + '00')
        ctx.fillStyle = grad
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMove)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [density])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', zIndex: 1 }}
    />
  )
}
