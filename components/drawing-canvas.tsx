'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from './ui/button'
import { Eraser, Pencil, RotateCcw, Download, Maximize2, Palette, Type, MousePointer2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function DrawingCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [activeTool, setActiveTool] = useState<'pencil' | 'eraser'>('pencil')
    const [color, setColor] = useState('#f97316')
    const [lineWidth, setLineWidth] = useState(3)
    const [history, setHistory] = useState<ImageData[]>([])
    const [showWidthPicker, setShowWidthPicker] = useState(false)
    const widthPickerRef = useRef<HTMLDivElement>(null)

    const getContext = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return null
        return canvas.getContext('2d', { willReadFrequently: true })
    }, [])

    const setupCanvas = useCallback(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Get the actual size of the container
        const { width, height } = container.getBoundingClientRect()

        // Handle High DPI displays
        const dpr = window.devicePixelRatio || 1

        // Save existing content before resize
        let existingData: ImageData | null = null
        try {
            if (canvas.width > 0 && canvas.height > 0) {
                existingData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            }
        } catch (e) {
            console.error('Failed to save canvas data', e)
        }

        canvas.width = width * dpr
        canvas.height = height * dpr
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        ctx.scale(dpr, dpr)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        // Restore content if it exists
        if (existingData) {
            // Need to handle scaling if width/height changed significantly
            // For now, just redraw
            ctx.putImageData(existingData, 0, 0)
        }
    }, [])

    useEffect(() => {
        setupCanvas()

        const container = containerRef.current
        if (!container) return

        const observer = new ResizeObserver(() => {
            setupCanvas()
        })

        observer.observe(container)
        return () => observer.disconnect()
    }, [setupCanvas])

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return { x: 0, y: 0 }

        const x = ('touches' in e)
            ? e.touches[0].clientX - rect.left
            : (e as React.MouseEvent).clientX - rect.left
        const y = ('touches' in e)
            ? e.touches[0].clientY - rect.top
            : (e as React.MouseEvent).clientY - rect.top

        return { x, y }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const ctx = getContext()
        if (!ctx) return

        setIsDrawing(true)
        const { x, y } = getCoordinates(e)

        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        const ctx = getContext()
        ctx?.closePath()
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return
        const ctx = getContext()
        if (!ctx) return

        const { x, y } = getCoordinates(e)

        ctx.lineWidth = activeTool === 'eraser' ? lineWidth * 12 : lineWidth
        ctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over'
        ctx.strokeStyle = color

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!ctx || !canvas) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // Close picker on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (widthPickerRef.current && !widthPickerRef.current.contains(event.target as Node)) {
                setShowWidthPicker(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={containerRef} className="relative w-full h-full bg-[#0c0c0e]/50 rounded-[32px] border border-white/5 overflow-hidden shadow-2xl group">
            {/* Grid Background Overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '30px 30px'
                }}
            />

            {/* Premium Floating Toolbar */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-1.5 p-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                    <div className="relative" ref={widthPickerRef}>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                                if (activeTool === 'pencil') {
                                    setShowWidthPicker(!showWidthPicker)
                                } else {
                                    setActiveTool('pencil')
                                }
                            }}
                            className={`w-10 h-10 rounded-xl transition-all ${activeTool === 'pencil' ? 'bg-white/10 text-orange-500 shadow-inner' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                        >
                            <Pencil size={18} />
                        </Button>

                        <AnimatePresence>
                            {showWidthPicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute top-full mt-3 left-1/2 -translate-x-1/2 flex flex-col gap-2 p-2 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl min-w-[50px] z-50"
                                >
                                    {[2, 4, 8, 12].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                setLineWidth(size)
                                                setShowWidthPicker(false)
                                            }}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${lineWidth === size ? 'bg-orange-500/10 text-orange-400' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <div
                                                className="bg-current rounded-full"
                                                style={{ width: `${Math.min(size + 2, 20)}px`, height: `${Math.min(size + 2, 20)}px` }}
                                            />
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setActiveTool('eraser')}
                        className={`w-10 h-10 rounded-xl transition-all ${activeTool === 'eraser' ? 'bg-white/10 text-white shadow-inner' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <Eraser size={18} />
                    </Button>

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    {['#f97316', '#ffffff', '#3b82f6', '#22c55e'].map((c) => (
                        <button
                            key={c}
                            onClick={() => {
                                setColor(c)
                                setActiveTool('pencil')
                            }}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${color === c && activeTool === 'pencil' ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'border-transparent scale-90 hover:scale-100'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}

                    <div className="w-px h-6 bg-white/10 mx-1" />

                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={clearCanvas}
                        className="w-10 h-10 rounded-xl text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    >
                        <RotateCcw size={18} />
                    </Button>
                </div>
            </div>



            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseOut={stopDrawing}
                onMouseMove={draw}
                onTouchStart={(e) => { e.preventDefault(); startDrawing(e); }}
                onTouchEnd={(e) => { e.preventDefault(); stopDrawing(); }}
                onTouchMove={(e) => { e.preventDefault(); draw(e); }}
                className="flex-1 cursor-crosshair touch-none relative z-10"
            />

            <div className="absolute bottom-6 left-6 text-[10px] text-zinc-700 font-black uppercase tracking-[0.3em] pointer-events-none">
                Not Defteri / Karalama
            </div>

            {/* Status Indicator */}
            <div className="absolute bottom-6 right-6 flex items-center gap-2 pointer-events-none">
                <div className={`w-1.5 h-1.5 rounded-full ${isDrawing ? 'bg-orange-500 animate-ping' : 'bg-emerald-500'}`} />
                <span className="text-[10px] text-zinc-700 font-black uppercase tracking-widest">{isDrawing ? 'Yazılıyor' : 'Hazır'}</span>
            </div>
        </div>
    )
}

