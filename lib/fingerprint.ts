async function canvasSignal(): Promise<string> {
  try {
    const c = document.createElement('canvas')
    c.width = 280
    c.height = 60
    const ctx = c.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, 280, 0)
    grad.addColorStop(0, '#f00')
    grad.addColorStop(0.5, '#0f0')
    grad.addColorStop(1, '#00f')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 280, 60)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.font = 'bold 18px Arial'
    ctx.fillText('FP_SIGNAL_\u2727\u03b1\u00e9', 8, 40)
    ctx.font = '20px serif'
    ctx.fillText('\ud83d\udc4b\ud83c\udf0d\u2603', 180, 40)
    return c.toDataURL()
  } catch {
    return 'canvas:unavailable'
  }
}

async function webglSignal(): Promise<string> {
  try {
    const c = document.createElement('canvas')
    const gl =
      (c.getContext('webgl') ||
        c.getContext('experimental-webgl')) as WebGLRenderingContext | null
    if (!gl) return 'webgl:unavailable'
    const dbg = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = dbg
      ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR)
    const renderer = dbg
      ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER)
    const exts = gl.getSupportedExtensions()?.sort().join(',') ?? ''
    return `${vendor}|${renderer}|${exts}`
  } catch {
    return 'webgl:error'
  }
}

async function audioSignal(): Promise<string> {
  try {
    // @ts-ignore
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return 'audio:unavailable'
    const ctx = new AC() as AudioContext
    const osc = ctx.createOscillator()
    const analyser = ctx.createAnalyser()
    const gain = ctx.createGain()
    // @ts-ignore
    const proc = ctx.createScriptProcessor(4096, 1, 1)

    gain.gain.value = 0
    osc.type = 'triangle'
    osc.frequency.value = 10000
    osc.connect(analyser)
    analyser.connect(proc)
    proc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(0)

    return await new Promise<string>(resolve => {
      let done = false
      // @ts-ignore
      proc.onaudioprocess = (e: AudioProcessingEvent) => {
        if (done) return
        done = true
        const buf = e.inputBuffer.getChannelData(0)
        const sum = Array.from(buf.slice(0, 100))
          .reduce((a, v) => a + Math.abs(v), 0)
        osc.stop()
        ctx.close()
        resolve(sum.toFixed(10))
      }
      setTimeout(() => { if (!done) { done = true; ctx.close(); resolve('audio:timeout') } }, 1500)
    })
  } catch {
    return 'audio:error'
  }
}

function fontSignal(): string {
  try {
    const baseFonts = ['monospace', 'sans-serif', 'serif']
    const probes = [
      'Arial', 'Verdana', 'Helvetica Neue', 'Times New Roman', 'Courier New',
      'Georgia', 'Comic Sans MS', 'Trebuchet MS', 'Impact', 'Palatino',
      'Lucida Console', 'Tahoma', 'Geneva', 'Optima', 'Futura',
      'Gill Sans', 'Segoe UI', 'Roboto', 'SF Pro',
    ]
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const testStr = 'mmmmwwwwiiiiMMMM'

    const baseWidths: Record<string, number> = {}
    for (const base of baseFonts) {
      ctx.font = `72px ${base}`
      baseWidths[base] = ctx.measureText(testStr).width
    }

    const detected: string[] = []
    for (const font of probes) {
      for (const base of baseFonts) {
        ctx.font = `72px '${font}', ${base}`
        if (ctx.measureText(testStr).width !== baseWidths[base]) {
          detected.push(font)
          break
        }
      }
    }
    return detected.sort().join(',')
  } catch {
    return 'fonts:error'
  }
}

function hardwareSignal(): string {
  const nav = navigator as Navigator & Record<string, unknown>
  return [
    nav.hardwareConcurrency ?? '?',
    (nav.deviceMemory as number | undefined) ?? '?',
    navigator.maxTouchPoints,
    screen.width,
    screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    window.devicePixelRatio,
  ].join('|')
}

function platformSignal(): string {
  return [
    navigator.userAgent,
    navigator.language,
    navigator.languages?.join(',') ?? '',
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    Intl.DateTimeFormat().resolvedOptions().locale,
    (navigator as Navigator & Record<string, unknown>).platform as string ?? '',
  ].join('|||')
}

function pluginSignal(): string {
  try {
    return Array.from(navigator.plugins)
      .map(p => p.name)
      .sort()
      .join(',')
  } catch {
    return ''
  }
}

// ─── Persistent ID in IndexedDB ───────────────────────────────────────────────

export async function getPersistentId(): Promise<string> {
  const DB = '_fpdb'
  const STORE = 's'
  const KEY = 'pid'

  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onerror = () => resolve(crypto.randomUUID())
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        const get = store.get(KEY)
        get.onsuccess = () => {
          if (get.result) {
            resolve(get.result)
          } else {
            const id = crypto.randomUUID()
            store.put(id, KEY)
            resolve(id)
          }
        }
        get.onerror = () => resolve(crypto.randomUUID())
      }
    } catch {
      try {
        const lsKey = '__fpid'
        const existing = localStorage.getItem(lsKey)
        if (existing) { resolve(existing); return }
        const id = crypto.randomUUID()
        localStorage.setItem(lsKey, id)
        resolve(id)
      } catch {
        resolve('no-storage')
      }
    }
  })
}

// ─── Hash helper ─────────────────────────────────────────────────────────────

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── Main export ─────────────────────────────────────────────────────────────

export interface DeviceToken {
  signalHash: string
  persistentId: string
  token: string
}

export async function getDeviceToken(): Promise<DeviceToken> {
  const [canvas, webgl, audio, persistent] = await Promise.all([
    canvasSignal(),
    webglSignal(),
    audioSignal(),
    getPersistentId(),
  ])

  const signals = [
    canvas,
    webgl,
    audio,
    fontSignal(),
    hardwareSignal(),
    platformSignal(),
    pluginSignal(),
  ].join('\n===\n')

  const signalHash = await sha256(signals)
  return {
    signalHash,
    persistentId: persistent,
    token: `${signalHash}:${persistent}`,
  }
}