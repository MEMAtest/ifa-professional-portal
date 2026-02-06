'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import SignaturePadLib from 'signature_pad'

export interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void
  width?: number
  height?: number
  penColor?: string
  backgroundColor?: string
  className?: string
  signerName?: string
}

type Mode = 'draw' | 'type'

const SIGNATURE_FONTS = [
  { name: 'Cursive', value: 'cursive' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Script', value: '"Brush Script MT", "Segoe Script", cursive' },
]

// Limit typed names to safe characters
function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-'.\u00C0-\u024F]/g, '')
}

export function SignaturePad({
  onSignatureChange,
  width = 500,
  height = 150,
  penColor = '#000000',
  backgroundColor = '#ffffff',
  className = '',
  signerName = ''
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const typeCanvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePadLib | null>(null)
  const savedDataRef = useRef<string | null>(null)
  const onChangeRef = useRef(onSignatureChange)
  onChangeRef.current = onSignatureChange

  const [mode, setMode] = useState<Mode>('draw')
  const [isEmpty, setIsEmpty] = useState(true)
  const [typedName, setTypedName] = useState(signerName)
  const [selectedFont, setSelectedFont] = useState(0)

  // Draw mode: initialize signature_pad
  useEffect(() => {
    if (mode !== 'draw' || !canvasRef.current) return

    const canvas = canvasRef.current
    const pad = new SignaturePadLib(canvas, {
      penColor,
      backgroundColor,
    })
    signaturePadRef.current = pad

    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const savedData = savedDataRef.current
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio

      // Reset transform before scaling to prevent compounding
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(ratio, ratio)
      }

      // Restore saved signature data after resize instead of clearing
      if (savedData) {
        const img = new Image()
        img.onload = () => {
          const ctx2 = canvas.getContext('2d')
          if (ctx2) {
            ctx2.fillStyle = backgroundColor
            ctx2.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
            ctx2.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight)
          }
          img.onload = null
        }
        img.src = savedData
      } else {
        pad.clear()
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Restore previous drawing if switching back from type mode
    if (savedDataRef.current) {
      const img = new Image()
      img.onload = () => {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = backgroundColor
          ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)
          ctx.drawImage(img, 0, 0, canvas.offsetWidth, canvas.offsetHeight)
        }
        img.onload = null
      }
      img.src = savedDataRef.current
      setIsEmpty(false)
    }

    pad.addEventListener('endStroke', () => {
      if (pad) {
        const empty = pad.isEmpty()
        setIsEmpty(empty)
        const dataUrl = empty ? null : pad.toDataURL('image/png')
        savedDataRef.current = dataUrl
        onChangeRef.current?.(dataUrl)
      }
    })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      pad.off()
    }
    // onSignatureChange excluded - accessed via ref to avoid re-init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, penColor, backgroundColor])

  // Type mode: render typed name on canvas
  useEffect(() => {
    if (mode !== 'type' || !typeCanvasRef.current) return

    const canvas = typeCanvasRef.current
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    canvas.width = canvas.offsetWidth * ratio
    canvas.height = canvas.offsetHeight * ratio
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(ratio, ratio)
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

    const safeName = sanitizeName(typedName)

    if (!safeName.trim()) {
      setIsEmpty(true)
      onChangeRef.current?.(null)
      return
    }

    // Draw the typed name as a signature
    const font = SIGNATURE_FONTS[selectedFont].value
    const canvasWidth = canvas.offsetWidth
    const canvasHeight = canvas.offsetHeight

    // Start with a large font and scale down to fit
    let fontSize = 48
    ctx.font = `${fontSize}px ${font}`
    let textWidth = ctx.measureText(safeName).width
    while (textWidth > canvasWidth - 40 && fontSize > 16) {
      fontSize -= 2
      ctx.font = `${fontSize}px ${font}`
      textWidth = ctx.measureText(safeName).width
    }

    ctx.fillStyle = penColor
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.font = `${fontSize}px ${font}`
    ctx.fillText(safeName, canvasWidth / 2, canvasHeight / 2)

    // Draw a signature line
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(20, canvasHeight * 0.75)
    ctx.lineTo(canvasWidth - 20, canvasHeight * 0.75)
    ctx.stroke()

    const dataUrl = canvas.toDataURL('image/png')
    setIsEmpty(false)
    onChangeRef.current?.(dataUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, typedName, selectedFont, penColor, backgroundColor])

  // Handle type canvas resize
  useEffect(() => {
    if (mode !== 'type') return

    const handleResize = () => {
      if (!typeCanvasRef.current) return
      const canvas = typeCanvasRef.current
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(ratio, ratio)
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight)

      const safeName = sanitizeName(typedName)
      if (!safeName.trim()) return

      const font = SIGNATURE_FONTS[selectedFont].value
      const canvasWidth = canvas.offsetWidth
      const canvasHeight = canvas.offsetHeight
      let fontSize = 48
      ctx.font = `${fontSize}px ${font}`
      let textWidth = ctx.measureText(safeName).width
      while (textWidth > canvasWidth - 40 && fontSize > 16) {
        fontSize -= 2
        ctx.font = `${fontSize}px ${font}`
        textWidth = ctx.measureText(safeName).width
      }
      ctx.fillStyle = penColor
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.font = `${fontSize}px ${font}`
      ctx.fillText(safeName, canvasWidth / 2, canvasHeight / 2)

      ctx.strokeStyle = '#d1d5db'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(20, canvasHeight * 0.75)
      ctx.lineTo(canvasWidth - 20, canvasHeight * 0.75)
      ctx.stroke()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [mode, typedName, selectedFont, penColor, backgroundColor])

  const clear = useCallback(() => {
    if (mode === 'draw') {
      signaturePadRef.current?.clear()
      savedDataRef.current = null
    } else {
      setTypedName('')
    }
    setIsEmpty(true)
    onChangeRef.current?.(null)
  }, [mode])

  const undo = useCallback(() => {
    if (mode !== 'draw') return
    const pad = signaturePadRef.current
    if (!pad) return

    const data = pad.toData()
    if (data && data.length > 0) {
      data.pop()
      pad.fromData(data)
      const empty = pad.isEmpty()
      setIsEmpty(empty)
      const dataUrl = empty ? null : pad.toDataURL('image/png')
      savedDataRef.current = dataUrl
      onChangeRef.current?.(dataUrl)
    }
  }, [mode])

  const switchMode = (newMode: Mode) => {
    // Save current draw data before switching
    if (mode === 'draw' && signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      savedDataRef.current = signaturePadRef.current.toDataURL('image/png')
    }
    setMode(newMode)
    // Reset isEmpty based on new mode content
    if (newMode === 'type') {
      const hasTxt = !!sanitizeName(typedName).trim()
      setIsEmpty(!hasTxt)
      if (!hasTxt) onChangeRef.current?.(null)
    } else {
      setIsEmpty(!savedDataRef.current)
      onChangeRef.current?.(savedDataRef.current ?? null)
    }
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Mode tabs */}
      <div className="flex border border-gray-200 rounded-t-lg overflow-hidden">
        <button
          type="button"
          onClick={() => switchMode('draw')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'draw'
              ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Draw
        </button>
        <button
          type="button"
          onClick={() => switchMode('type')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            mode === 'type'
              ? 'bg-teal-50 text-teal-700 border-b-2 border-teal-600'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Type
        </button>
      </div>

      {/* Draw mode */}
      {mode === 'draw' && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-b-lg bg-white relative"
          style={{ width: '100%', maxWidth: width }}
        >
          <canvas
            ref={canvasRef}
            className="w-full touch-none"
            style={{ height, cursor: 'crosshair' }}
          />
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-gray-400 text-sm">Sign here</span>
            </div>
          )}
        </div>
      )}

      {/* Type mode */}
      {mode === 'type' && (
        <div
          className="border-2 border-gray-300 rounded-b-lg bg-white"
          style={{ width: '100%', maxWidth: width }}
        >
          <div className="p-3 space-y-3">
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(sanitizeName(e.target.value))}
              placeholder="Type your full name"
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              autoFocus
            />
            {/* Font selector */}
            <div className="flex gap-2">
              {SIGNATURE_FONTS.map((font, i) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => setSelectedFont(i)}
                  className={`flex-1 px-2 py-1.5 text-xs rounded border transition-colors ${
                    selectedFont === i
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                  style={{ fontFamily: font.value }}
                >
                  {typedName.trim() || 'Sample'}
                </button>
              ))}
            </div>
            {/* Preview canvas */}
            <canvas
              ref={typeCanvasRef}
              className="w-full rounded border border-gray-200"
              style={{ height }}
            />
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        {mode === 'draw' && (
          <button
            type="button"
            onClick={undo}
            disabled={isEmpty}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={clear}
          disabled={isEmpty}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
