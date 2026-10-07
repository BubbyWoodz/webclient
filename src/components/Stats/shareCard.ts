/**
 * Canvas-based share card generator for Replay highlight reel.
 * Renders 1080x1920 story-format PNG cards with Reverb branding.
 */

export interface ShareCardData {
    kind: 'minutes' | 'artist' | 'song' | 'album' | 'genre' | 'milestone' | 'streak' | 'yoy' | 'intro' | 'outro'
    year: number
    headline: string       // big number or name
    subline: string        // label e.g. "minutes listened" / "Top Artist"
    detail?: string        // extra line e.g. "42 plays"
    artworkUrl?: string    // optional artwork to feature
}

const W = 1080
const H = 1920
const BG = '#141414'
const BG2 = '#1e1e1e'
const RED = '#f7635c'
const WHITE = '#ffffff'
const MUTED = 'rgba(255,255,255,0.6)'

function loadImage(url: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = url
    })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number, weight: number): number {
    let size = baseSize
    ctx.font = `${weight} ${size}px "SF Compact Display", -apple-system, sans-serif`
    while (ctx.measureText(text).width > maxWidth && size > 24) {
        size -= 4
        ctx.font = `${weight} ${size}px "SF Compact Display", -apple-system, sans-serif`
    }
    return size
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
    bgGrad.addColorStop(0, BG2)
    bgGrad.addColorStop(1, BG)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // Red accent glow at top
    const glow = ctx.createRadialGradient(W / 2, 120, 0, W / 2, 120, 500)
    glow.addColorStop(0, 'rgba(247,99,92,0.25)')
    glow.addColorStop(1, 'rgba(247,99,92,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, 700)

    let cursorY = 220

    // Eyebrow: REVERB • REPLAY YEAR
    ctx.fillStyle = RED
    ctx.font = '700 36px "SF Compact Display", -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`REVERB  •  REPLAY ${data.year}`, W / 2, cursorY)
    cursorY += 100

    // Artwork (if provided)
    if (data.artworkUrl) {
        const img = await loadImage(data.artworkUrl)
        if (img) {
            const size = 560
            const x = (W - size) / 2
            // shadow
            ctx.save()
            ctx.shadowColor = 'rgba(0,0,0,0.5)'
            ctx.shadowBlur = 60
            ctx.shadowOffsetY = 20
            roundRect(ctx, x, cursorY, size, size, 48)
            ctx.fillStyle = '#000'
            ctx.fill()
            ctx.restore()
            // image
            ctx.save()
            roundRect(ctx, x, cursorY, size, size, 48)
            ctx.clip()
            // cover-fit
            const scale = Math.max(size / img.width, size / img.height)
            const dw = img.width * scale
            const dh = img.height * scale
            ctx.drawImage(img, x + (size - dw) / 2, cursorY + (size - dh) / 2, dw, dh)
            ctx.restore()
            cursorY += size + 90
        }
    } else {
        cursorY += 60
    }

    // Headline (big)
    const headlineSize = fitText(ctx, data.headline, W - 160, 120, 800)
    ctx.fillStyle = WHITE
    ctx.font = `800 ${headlineSize}px "SF Compact Display", -apple-system, sans-serif`
    ctx.textAlign = 'center'

    // Handle multi-line headlines (split on natural breaks if too long)
    const maxW = W - 160
    if (ctx.measureText(data.headline).width > maxW && data.headline.includes(' ')) {
        const words = data.headline.split(' ')
        const mid = Math.ceil(words.length / 2)
        const lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
        lines.forEach((line, i) => {
            const s = fitText(ctx, line, maxW, 96, 800)
            ctx.font = `800 ${s}px "SF Compact Display", -apple-system, sans-serif`
            ctx.fillText(line, W / 2, cursorY + i * (s + 20))
        })
        cursorY += 96 * lines.length + 40
    } else {
        ctx.fillText(data.headline, W / 2, cursorY)
        cursorY += headlineSize + 40
    }

    // Subline (accent)
    ctx.fillStyle = RED
    const subSize = fitText(ctx, data.subline.toUpperCase(), maxW, 44, 700)
    ctx.font = `700 ${subSize}px "SF Compact Display", -apple-system, sans-serif`
    // letter-spacing simulation via manual spacing is overkill; keep simple
    ctx.fillText(data.subline.toUpperCase(), W / 2, cursorY)
    cursorY += 90

    // Detail line
    if (data.detail) {
        ctx.fillStyle = MUTED
        const dSize = fitText(ctx, data.detail, maxW, 40, 400)
        ctx.font = `400 ${dSize}px "SF Compact Display", -apple-system, sans-serif`
        ctx.fillText(data.detail, W / 2, cursorY)
    }

    // Bottom branding bar
    ctx.fillStyle = MUTED
    ctx.font = '400 30px "SF Compact Display", -apple-system, sans-serif'
    ctx.fillText('Made with Reverb', W / 2, H - 100)

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to render share card'))
        }, 'image/png')
    })
}

export function downloadShareCard(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)
}
