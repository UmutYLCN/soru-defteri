'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'

interface CSVImportProps {
    onSuccess: () => void
}

export function CSVImport({ onSuccess }: CSVImportProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file')
    const [pasteContent, setPasteContent] = useState('')
    const [result, setResult] = useState<{
        imported: number
        failed: number
        errors: string[]
    } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileUpload = async (file: File) => {
        if (!file) return

        setLoading(true)
        setResult(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (res.ok) {
                setResult(data)
                onSuccess()
            } else {
                setResult({ imported: 0, failed: 1, errors: [data.error] })
            }
        } catch (error) {
            console.error('Error importing CSV:', error)
            setResult({ imported: 0, failed: 1, errors: ['Dosya yüklenirken hata oluştu'] })
        } finally {
            setLoading(false)
        }
    }

    const handlePasteImport = async () => {
        if (!pasteContent.trim()) return

        setLoading(true)
        setResult(null)

        // Create a blob from the pasted content
        const blob = new Blob([pasteContent], { type: 'text/csv' })
        const file = new File([blob], 'pasted.csv', { type: 'text/csv' })

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                body: formData
            })

            const data = await res.json()

            if (res.ok) {
                setResult(data)
                setPasteContent('')
                onSuccess()
            } else {
                setResult({ imported: 0, failed: 1, errors: [data.error] })
            }
        } catch (error) {
            console.error('Error importing CSV:', error)
            setResult({ imported: 0, failed: 1, errors: ['İçe aktarma sırasında hata oluştu'] })
        } finally {
            setLoading(false)
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFileUpload(file)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file && file.name.endsWith('.csv')) {
            handleFileUpload(file)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white px-6 py-3 rounded-xl">
                    📥 CSV İçe Aktar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                        📥 CSV İçe Aktar
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 mt-4">
                    {/* Tabs */}
                    <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-xl">
                        <button
                            onClick={() => setActiveTab('file')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'file'
                                ? 'bg-zinc-700 text-white'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            📄 Dosya Yükle
                        </button>
                        <button
                            onClick={() => setActiveTab('paste')}
                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'paste'
                                ? 'bg-zinc-700 text-white'
                                : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            📋 Yapıştır
                        </button>
                    </div>

                    {/* File Upload Tab */}
                    {activeTab === 'file' && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            className={`
                                relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200
                                ${isDragging
                                    ? 'border-emerald-500 bg-emerald-500/10'
                                    : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-600 hover:bg-zinc-800/50'
                                }
                                ${loading ? 'pointer-events-none opacity-50' : ''}
                            `}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleInputChange}
                                className="hidden"
                                disabled={loading}
                            />

                            {loading ? (
                                <div className="py-4">
                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto"></div>
                                    <p className="text-zinc-400 mt-3">İçe aktarılıyor...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-4xl mb-3">📄</div>
                                    <p className="text-white font-medium mb-1">
                                        CSV dosyasını sürükleyip bırakın
                                    </p>
                                    <p className="text-zinc-500 text-sm">
                                        veya <span className="text-emerald-400 underline">dosya seçmek için tıklayın</span>
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Paste Tab */}
                    {activeTab === 'paste' && (
                        <div className="space-y-3">
                            <Textarea
                                value={pasteContent}
                                onChange={(e) => setPasteContent(e.target.value)}
                                placeholder={`category,question_text,option_a,option_b,option_c,option_d,correct_answer,solution
Matematik,"2 + 2 kaçtır?",3,4,5,6,B,"2 ile 2 toplandığında 4 eder."
Fizik,"Işık hızı kaç km/s?","300.000","150.000","450.000","600.000",A,"Işığın boşluktaki hızı yaklaşık 300.000 km/s'dir."`}
                                className="bg-zinc-800 border-zinc-700 text-white min-h-[180px] font-mono text-sm"
                                disabled={loading}
                            />
                            <Button
                                onClick={handlePasteImport}
                                disabled={loading || !pasteContent.trim()}
                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 rounded-xl"
                            >
                                {loading ? '⏳ İçe Aktarılıyor...' : '📥 İçe Aktar'}
                            </Button>
                        </div>
                    )}

                    {/* CSV Format Info */}
                    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-lg">📋</span>
                            <h4 className="font-semibold text-white">CSV Formatı</h4>
                        </div>
                        <div className="bg-zinc-900 rounded-lg p-3 overflow-x-auto">
                            <code className="text-xs text-emerald-400 whitespace-nowrap">
                                category,question_text,option_a,option_b,option_c,option_d,correct_answer,solution
                            </code>
                        </div>
                        <p className="text-zinc-500 text-xs mt-2">
                            İlk satır başlık olmalı, UTF-8 encoding kullanın
                        </p>
                    </div>

                    {/* Result */}
                    {result && (
                        <div className={`p-4 rounded-xl ${result.imported > 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                            {result.imported > 0 && (
                                <p className="text-emerald-400 font-semibold flex items-center gap-2">
                                    <span className="text-lg">✅</span>
                                    {result.imported} soru başarıyla eklendi
                                </p>
                            )}
                            {result.failed > 0 && (
                                <p className="text-red-400 mt-1 flex items-center gap-2">
                                    <span className="text-lg">❌</span>
                                    {result.failed} soru eklenemedi
                                </p>
                            )}
                            {result.errors.length > 0 && (
                                <ul className="text-red-400/80 text-sm mt-2 space-y-1">
                                    {result.errors.map((err, i) => (
                                        <li key={i} className="pl-6">• {err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
