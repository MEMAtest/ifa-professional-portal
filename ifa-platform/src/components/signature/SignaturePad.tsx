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
}

export function SignaturePad({
  onSignatureChange,
  width = 500,
  height = 200,
  penColor = '#000000',
  backgroundColor = '#ffffff',
  className = ''
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const signaturePadRef = useRef<SignaturePadLib | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    signaturePadRef.current = new SignaturePadLib(canvas, {
      penColor,
      backgroundColor
    })

    const resizeCanvas = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      canvas.width = canvas.offsetWidth * ratio
      canvas.height = canvas.offsetHeight * ratio
      canvas.getContext('2d')?.scale(ratio, ratio)
      signaturePadRef.current?.clear()
      setIsEmpty(true)
      onSignatureChange?.(null)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    signaturePadRef.current.addEventListener('endStroke', () => {
      const pad = signaturePadRef.current
      if (pad) {
        const empty = pad.isEmpty()
        setIsEmpty(empty)
        onSignatureChange?.(empty ? null : pad.toDataURL('image/png'))
      }
    })

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      signaturePadRef.current?.off()
    }
  }, [penColor, backgroundColor, onSignatureChange])

  const clear = useCallback(() => {
    signaturePadRef.current?.clear()
    setIsEmpty(true)
    onSignatureChange?.(null)
  }, [onSignatureChange])

  const undo = useCallback(() => {
    const pad = signaturePadRef.current
    if (!pad) return

    const data = pad.toData()
    if (data && data.length > 0) {
      data.pop()
      pad.fromData(data)
      const empty = pad.isEmpty()
      setIsEmpty(empty)
      onSignatureChange?.(empty ? null : pad.toDataURL('image/png'))
    }
  }, [onSignatureChange])

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative"
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
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={undo}
          disabled={isEmpty}
          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Undo
        </button>
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
