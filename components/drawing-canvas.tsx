'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Eraser, Pencil, RotateCcw, Download } from 'lucide-react'

export function DrawingCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [color, setColor] = useState('#f97316')
    const [lineWidth, setLineWidth] = useState(3)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set initial canvas size
        const resize = () => {
            const parent = canvas.parentElement
            if (parent) {
                canvas.width = parent.clientWidth
                canvas.height = parent.clientHeight
            }
        }

        window.addEventListener('resize', resize)
        resize()

        return () => window.removeEventListener('resize', resize)
    }, [])

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true)
        draw(e)
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        ctx?.beginPath()
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return

        ctx.lineWidth = lineWidth
        ctx.lineCap = 'round'
        ctx.strokeStyle = color

        const rect = canvas.getBoundingClientRect()
        const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left
        const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top

        ctx.lineTo(x, y)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-zinc-950/20 rounded-2xl border border-white/5 overflow-hidden group">
            <div className="absolute top-4 left-4 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setColor('#f97316')}
                    className={`w-10 h-10 rounded-xl ${color === '#f97316' ? 'bg-orange-500/20 text-orange-500' : 'bg-white/5 text-zinc-500'}`}
                >
                    <Pencil size={18} />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setColor('#ffffff')}
                    className={`w-10 h-10 rounded-xl ${color === '#ffffff' ? 'bg-white/10 text-white' : 'bg-white/5 text-zinc-500'}`}
                >
                    <Pencil size={18} className="rotate-180" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={clearCanvas}
                    className="w-10 h-10 rounded-xl bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10"
                >
                    <RotateCcw size={18} />
                </Button>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className="flex-1 cursor-crosshair touch-none"
            />

            <div className="absolute bottom-4 right-4 text-[10px] text-zinc-600 font-bold uppercase tracking-tighter pointer-events-none">
                Çözüm Alanı
            </div>
        </div>
    )
}
