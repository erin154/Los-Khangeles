'use client'
import { useEffect, useRef } from 'react'

const AUDIO_URL = 'https://litter.catbox.moe/3vecywu7cqufx3bz.mp3'
const GAIN_VALUE = 4.0

export default function BanScreen() {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  useEffect(() => {
    let cancelled = false

    async function startAudio() {
      try {
        // @ts-ignore
        const AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return

        const ctx = new AC() as AudioContext
        audioCtxRef.current = ctx

        const res = await fetch(AUDIO_URL)
        const arrayBuf = await res.arrayBuffer()
        const audioBuf = await ctx.decodeAudioData(arrayBuf)

        if (cancelled) return

        const gain = ctx.createGain()
        gain.gain.value = GAIN_VALUE
        gain.connect(ctx.destination)

        const source = ctx.createBufferSource()
        source.buffer = audioBuf
        source.loop = true
        source.connect(gain)
        source.start(0)
        sourceRef.current = source
      } catch {
      }
    }

    startAudio()

    return () => {
      cancelled = true
      try { sourceRef.current?.stop() } catch {}
      audioCtxRef.current?.close()
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        userSelect: 'none',
      }}
    >
      <p
        style={{
          color: '#ff2222',
          fontSize: 'clamp(2rem, 8vw, 5rem)',
          fontWeight: 900,
          fontFamily: "Comic Sans MS",
          letterSpacing: '0.05em',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        YOU ABSOLUTE FOOL
      </p>
    </div>
  )
}