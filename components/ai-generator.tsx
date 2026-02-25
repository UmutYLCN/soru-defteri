'use client'

import { useState, Fragment, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Wand2, Loader2, BookOpen, AlertCircle, Calculator, Brain, BarChart3, Shuffle, Layers, Image as ImageIcon, X, Check, Scissors, RefreshCw, Sparkles, ArrowRight, FileText, ChevronRight, Search, CheckSquare } from 'lucide-react'
import ReactCrop, { type Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { getCroppedImg } from '@/lib/crop-image'

interface Category {
    id: number
    name: string
    parentId?: number | null
}

interface AIGeneratorProps {
    categories: Category[]
    onSuccess: (lang?: 'tr' | 'en') => void
}

const questionTypes = [
    { value: 'Hesaplama', label: 'Hesaplama', icon: Calculator, desc: 'Sayısal problem çözme' },
    { value: 'Kavramsal', label: 'Kavramsal', icon: Brain, desc: 'Teori ve anlama soruları' },
    { value: 'Doğru/Yanlış', label: 'Doğru / Yanlış', icon: CheckSquare, desc: 'D/Y formatlı temel sorular' },
    { value: 'Karışık', label: 'Karışık', icon: Shuffle, desc: 'Hepsinden karışık' },
]

export function AIGenerator({ categories, onSuccess }: AIGeneratorProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'normal' | 'integrated'>('normal')
    const [prompt, setPrompt] = useState('')
    const [image, setImage] = useState<string | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [questionType, setQuestionType] = useState('Karışık')
    const [count, setCount] = useState('5')
    const [integratedCount, setIntegratedCount] = useState('3')
    const [categoryId, setCategoryId] = useState<string>('')
    const [error, setError] = useState<string | null>(null)
    const [selectedParentCategory, setSelectedParentCategory] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [manualTopic, setManualTopic] = useState('')
    const [subtopics, setSubtopics] = useState<string[]>([])
    const [selectedSubtopics, setSelectedSubtopics] = useState<string[]>([])
    const [subtopicsLoading, setSubtopicsLoading] = useState(false)

    // Interactive Crop States
    const [step, setStep] = useState<'choice' | 'input' | 'no-question' | 'subtopics' | 'generate-options' | 'confirm' | 'crop'>('choice')
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        x: 25,
        y: 25,
        width: 50,
        height: 50
    })
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
    const imgRef = useRef<HTMLImageElement>(null)

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [error])

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                setError('Resim boyutu 5MB\'dan küçük olmalıdır.')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                const base64String = reader.result as string
                setImage(base64String)
                setImagePreview(base64String)
            }
            reader.readAsDataURL(file)
        }
    }

    const clearImage = () => {
        setImage(null)
        setImagePreview(null)
    }

    const handleGenerate = async (useCroppedImage?: string) => {
        if (!prompt && !image) {
            setError('Lütfen bir konu, örnek soru veya bir resim girin.')
            return
        }

        const currentCategory = categoryId || null

        setLoading(true)
        setError(null)

        try {
            // First time click with an image - check for diagram
            if (image && step === 'input' && !useCroppedImage) {
                const analyzeRes = await fetch('/api/analyze-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image }),
                })
                const { hasDiagram } = await analyzeRes.json()

                if (hasDiagram) {
                    setStep('confirm')
                    setLoading(false)
                    return
                }
            }

            const activeImage = useCroppedImage || image
            const originalContextImage = useCroppedImage ? image : null
            const endpoint = mode === 'normal' ? '/api/generate' : '/api/generate-grouped'
            const body = mode === 'normal'
                ? {
                    prompt,
                    image: activeImage,
                    originalImage: originalContextImage,
                    questionType,
                    count: parseInt(count),
                    categoryId: currentCategory,
                }
                : {
                    prompt,
                    image: activeImage,
                    originalImage: originalContextImage,
                    subQuestionCount: parseInt(integratedCount),
                    categoryId: currentCategory,
                }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Bir hata oluştu')
            }

            onSuccess()
            handleClose()
        } catch (err: any) {
            setOpen(false)
            setError(err.message)
            setLoading(false)
        }
    }

    const handleConfirmDiagram = (wantsToCrop: boolean) => {
        if (wantsToCrop) {
            setStep('crop')
        } else {
            handleGenerate() // Proceed with original image
        }
    }

    const handleCropSave = async () => {
        if (!image || !completedCrop || !imgRef.current) return
        setLoading(true)
        try {
            const displaySize = {
                width: imgRef.current.width,
                height: imgRef.current.height
            }
            const croppedImg = await getCroppedImg(image, completedCrop, displaySize)
            handleGenerate(croppedImg)
        } catch (e) {
            console.error(e)
            setOpen(false)
            setError('Resim kırpılamadı')
            setLoading(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setStep('choice')
        setPrompt('')
        setImage(null)
        setImagePreview(null)
        setError(null)
        setLoading(false)
        setCategoryId('')
        setSelectedParentCategory(null)
        setSearchQuery('')
        setManualTopic('')
        setSubtopics([])
        setSelectedSubtopics([])
        setSubtopicsLoading(false)
        setCrop({
            unit: '%',
            x: 25,
            y: 25,
            width: 50,
            height: 50
        })
    }

    return (
        <Fragment>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1] backdrop-blur-xl font-black px-7 h-12 rounded-xl shadow-2xl transition-all duration-500 flex items-center gap-2.5 active:scale-95 group">
                        <div className="relative">
                            <Wand2 className="w-5 h-5 text-orange-500 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-orange-500 blur-sm opacity-0 group-hover:opacity-40 transition-opacity" />
                        </div>
                        <span>AI Soru Üret</span>
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto bg-zinc-950/95 border-white/[0.08] backdrop-blur-2xl text-white p-0 shadow-[0_0_100px_rgba(0,0,0,0.9)] rounded-[32px] custom-scrollbar">
                    {/* Radiant Header */}
                    <div className="relative overflow-hidden px-8 py-8 border-b border-white/[0.05]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
                        <div className="relative z-10 flex flex-col gap-1">
                            <DialogTitle className="text-3xl font-black tracking-tight flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5">
                                    <Wand2 className="w-6 h-6 text-orange-500" />
                                </div>
                                AI Soru Üretici
                            </DialogTitle>
                            <DialogDescription className="text-zinc-500 text-sm font-medium mt-1 ml-12">
                                Yapay zeka motoru ile saniyeler içinde akademik kalitede sorular tasarlayın.
                            </DialogDescription>
                        </div>
                    </div>

                    <div className="p-8 space-y-8 relative z-10">
                        {step === 'choice' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-4">
                                <button
                                    onClick={() => setStep('input')}
                                    className="group relative p-8 rounded-[32px] border border-white/[0.08] bg-white/[0.02] hover:bg-orange-500/[0.03] hover:border-orange-500/30 transition-all duration-500 text-left overflow-hidden h-[280px] flex flex-col justify-between"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-orange-500/10 transition-colors" />
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 group-hover:text-orange-500 group-hover:scale-110 group-hover:bg-orange-500/10 group-hover:border-orange-500/20 transition-all duration-500 shadow-xl">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-xl font-black text-white group-hover:translate-x-1 transition-transform">Hazır Sorum Var</h4>
                                        <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                                            Elinizdeki bir soruyu veya konuyu kullanarak yeni sorular türetin.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-black text-orange-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                                        Devam Et <ChevronRight className="w-4 h-4" />
                                    </div>
                                </button>

                                <button
                                    disabled
                                    className="group relative p-8 rounded-[32px] border border-white/[0.04] bg-white/[0.01] transition-all duration-500 text-left overflow-hidden h-[280px] flex flex-col justify-between cursor-not-allowed opacity-60"
                                >
                                    <div className="absolute top-6 right-6 bg-zinc-800/80 border border-white/10 text-[10px] font-black tracking-widest uppercase text-zinc-400 px-3 py-1.5 rounded-full backdrop-blur-md z-10">
                                        Yakında
                                    </div>
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] rounded-full pointer-events-none" />
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-white/[0.04] flex items-center justify-center text-zinc-600 shadow-xl relative z-10">
                                        <Sparkles className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-3 relative z-10">
                                        <h4 className="text-xl font-black text-zinc-400">Hazır Sorum Yok</h4>
                                        <p className="text-sm text-zinc-600 font-medium leading-relaxed">
                                            Müfredata uygun ders ve konu seçerek yapay zekaya baştan soru tasarlatın.
                                        </p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {step === 'no-question' && (
                            <div className="space-y-8 py-4 animate-in fade-in zoom-in-95 duration-700">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Çalışılacak Konu / Ders Detayı *</Label>
                                    <div className="relative group">
                                        <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Çalışmak istediğiniz konuyu veya detayı yazın (Örn: Newton Yasaları)..."
                                            className="w-full bg-white/[0.02] border border-white/[0.08] rounded-2xl h-14 pl-14 pr-6 text-zinc-200 placeholder:text-zinc-700 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                            value={manualTopic}
                                            onChange={(e) => setManualTopic(e.target.value)}
                                        />
                                    </div>
                                    {!manualTopic.trim() && (
                                        <p className="text-[10px] text-amber-500/80 ml-2 mt-1">Devam etmek için lütfen çözmek istediğiniz konuyu yazın.</p>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep('choice')}
                                        className="flex-1 h-14 rounded-2xl text-zinc-500 font-black hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        GERİ DÖN
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (manualTopic.trim()) {
                                                setSubtopicsLoading(true);
                                                try {
                                                    const res = await fetch('/api/generate-subtopics', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            category: manualTopic.trim()
                                                        })
                                                    });
                                                    const data = await res.json();

                                                    if (data.subtopics && data.subtopics.length > 0) {
                                                        setSubtopics(data.subtopics);
                                                        setSelectedSubtopics([]);
                                                        setStep('subtopics');
                                                    } else {
                                                        // Fallback in case of failure
                                                        setPrompt(`"${manualTopic.trim()}" konusu hakkında akademik seviyede sorular üret.`);
                                                        setStep('generate-options');
                                                    }
                                                } catch (error) {
                                                    console.error("Subtopics Generation Error:", error);
                                                    // Fallback in case of error
                                                    setPrompt(`"${manualTopic.trim()}" konusu hakkında akademik seviyede sorular üret.`);
                                                    setStep('generate-options');
                                                } finally {
                                                    setSubtopicsLoading(false);
                                                }
                                            }
                                        }}
                                        disabled={!manualTopic.trim() || subtopicsLoading}

                                        className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-0 group disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {subtopicsLoading ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <span>SIRADAKİ ADIM</span>
                                                <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                                                    <ArrowRight size={18} />
                                                </div>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'subtopics' && (
                            <div className="space-y-8 py-4 animate-in fade-in zoom-in-95 duration-700">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        Alt Başlık Seçimi
                                    </Label>
                                    <p className="text-xs text-zinc-400 ml-1">İlgilendiğiniz alt başlıkları seçerek daha nokta atışı sorular oluşturabilirsiniz. (Birden fazla seçebilirsiniz)</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                        {subtopics.map((topic, idx) => {
                                            const isSelected = selectedSubtopics.includes(topic);
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setSelectedSubtopics(prev => prev.filter(t => t !== topic));
                                                        } else {
                                                            setSelectedSubtopics(prev => [...prev, topic]);
                                                        }
                                                    }}
                                                    className={`p-4 rounded-2xl border transition-all duration-300 text-left font-bold text-xs relative overflow-hidden ${isSelected
                                                        ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                                        : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white'
                                                        }`}
                                                >
                                                    <span className="relative z-10">{topic}</span>
                                                    {isSelected && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
                                                            <Check size={14} className="text-blue-500" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep('no-question')}
                                        className="flex-1 h-14 rounded-2xl text-zinc-500 font-black hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        GERİ DÖN
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const selectedCat = categories.find(c => c.id.toString() === categoryId);
                                            let finalPrompt = '';
                                            if (selectedCat) {
                                                const base = manualTopic.trim()
                                                    ? `"${manualTopic.trim()}" konusu`
                                                    : `${selectedCat.name} alanı`;

                                                if (selectedSubtopics.length > 0) {
                                                    finalPrompt = `Sen kıdemli bir ${selectedCat.name} profesörüsün. ${base} ile ilgili şu alt başlıklarda sorular üret:\n- ${selectedSubtopics.join('\n- ')}\nSınav haftası için analitik düşünmeyi zorlayan ve ezberden uzak akademik sorular hazırla.`;
                                                } else {
                                                    finalPrompt = `Sen kıdemli bir ${selectedCat.name} profesörüsün. ${base} hakkında detaylı akademik seviyede, analitik düşünmeyi zorlayan ve ezberden uzak sorular hazırla.`;
                                                }
                                            }
                                            setPrompt(finalPrompt);
                                            setStep('generate-options');
                                        }}
                                        className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-0 group"
                                    >
                                        <span>{selectedSubtopics.length > 0 ? `${selectedSubtopics.length} Başlıkla İlerle` : 'Tümüyle İlerle'}</span>
                                        <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                                            <ArrowRight size={18} />
                                        </div>
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'input' && (
                            <>
                                {/* Premium Mode Selection */}
                                <div className="flex p-1.5 bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-sm">
                                    <button
                                        onClick={() => setMode('normal')}
                                        className={`flex-1 py-3 px-5 rounded-xl text-sm font-black tracking-wide transition-all duration-500 flex items-center justify-center gap-3 ${mode === 'normal'
                                            ? 'bg-zinc-800 text-white shadow-2xl shadow-black/50 border border-white/5 scale-[1.02]'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        <Shuffle className={`w-4 h-4 ${mode === 'normal' ? 'text-orange-500' : ''}`} />
                                        Bağımsız Sorular
                                    </button>
                                    <button
                                        onClick={() => setMode('integrated')}
                                        className={`flex-1 py-3 px-5 rounded-xl text-sm font-black tracking-wide transition-all duration-500 flex items-center justify-center gap-3 ${mode === 'integrated'
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-[1.02]'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        <Layers className="w-4 h-4" />
                                        Bütünleşik Soru (X-Y)
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="prompt" className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2.5 ml-1">
                                            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                                            {mode === 'normal' ? 'Kapsam / Konu / Örnek' : 'Senaryo / Problem Tanımı'}
                                        </Label>
                                        <Textarea
                                            id="prompt"
                                            placeholder={mode === 'normal'
                                                ? "Örn: Newton'un hareket yasaları hakkında soru üret..."
                                                : "Örn: Bir RLC devresi ve bu devredeki elemanların değerlerini içeren bir senaryo yazın..."
                                            }
                                            className="bg-white/[0.02] border-white/[0.08] focus:border-orange-500/50 focus:ring-orange-500/20 min-h-[140px] resize-none text-zinc-200 placeholder:text-zinc-700 rounded-2xl text-base p-5 transition-all duration-300"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                    </div>

                                    {/* Premium Image Upload Area */}
                                    <div className="space-y-3">
                                        <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2.5 ml-1">
                                            <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                                            Görsel Analiz (Opsiyonel)
                                        </Label>
                                        {!imagePreview ? (
                                            <div className="relative group overflow-hidden rounded-[24px]">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="border-2 border-dashed border-white/[0.05] bg-white/[0.01] rounded-[24px] p-10 text-center group-hover:border-orange-500/40 group-hover:bg-orange-500/[0.03] transition-all duration-500 shadow-inner">
                                                    <div className="w-16 h-16 bg-zinc-900/50 border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-4 text-zinc-600 transition-all duration-500 group-hover:scale-110 group-hover:border-orange-500/40 group-hover:text-orange-500 group-hover:rotate-6">
                                                        <ImageIcon size={28} />
                                                    </div>
                                                    <p className="text-base font-black text-zinc-400 group-hover:text-zinc-100 transition-colors">Fotoğraf Yükle veya Sürükle</p>
                                                    <p className="text-[10px] text-zinc-600 mt-2 font-black uppercase tracking-[0.2em]">MAX 5MB • JPG, PNG</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative rounded-[24px] overflow-hidden border border-orange-500/30 group bg-black/40">
                                                <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain backdrop-blur-sm p-4" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-sm">
                                                    <button
                                                        onClick={clearImage}
                                                        className="bg-white text-black p-3 rounded-2xl font-black text-xs hover:bg-red-500 hover:text-white transition-all scale-75 group-hover:scale-100 flex items-center gap-2"
                                                    >
                                                        <X size={16} />
                                                        GÖRSELİ KALDIR
                                                    </button>
                                                </div>
                                                <div className="absolute top-4 left-4 bg-orange-500 px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20">Aktif Görsel</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {mode === 'normal' ? (
                                    <div className="space-y-4">
                                        <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Soru Türü</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {questionTypes.map(type => {
                                                const Icon = type.icon
                                                const isActive = questionType === type.value
                                                return (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => setQuestionType(type.value)}
                                                        className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 text-left overflow-hidden ${isActive
                                                            ? 'border-orange-500/50 bg-orange-500/[0.08] shadow-[0_10px_30px_rgba(249,115,22,0.1)] scale-[1.02]'
                                                            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                                            }`}
                                                    >
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${isActive
                                                            ? 'bg-orange-500 text-white shadow-lg'
                                                            : 'bg-zinc-900 border border-white/[0.08] text-zinc-600 group-hover:text-zinc-400 group-hover:border-white/20'
                                                            }`}>
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <div className={`text-sm font-black transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                                                {type.label}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{type.desc}</div>
                                                        </div>
                                                        {isActive && (
                                                            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-orange-500/10 blur-xl rounded-full" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-[24px] bg-orange-500/[0.03] border border-orange-500/10 space-y-4 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full pointer-events-none" />
                                        <div className="flex items-center gap-3 text-orange-500 font-black text-sm tracking-tight">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                                <Layers className="w-4 h-4" />
                                            </div>
                                            Bütünleşik Soru Mimarisi
                                        </div>
                                        <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                                            Görseldeki veya metindeki verileri kullanarak ortak bir senaryoya bağlı, birbirini takip eden akademik sorular üretilir.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-6 pt-2">
                                    {/* Categories and Count Row */}
                                    <div className="flex flex-wrap items-end gap-6">
                                        {/* Parent Category Select */}
                                        <div className="space-y-3 w-full sm:w-[240px]">
                                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Hedef Kategori *</Label>
                                            <Select
                                                value={categories.find(c => c.id.toString() === categoryId)?.parentId?.toString() || (categories.find(c => c.id.toString() === categoryId && !c.parentId) ? categoryId : categoryId === "null" ? "null" : "")}
                                                onValueChange={(value) => setCategoryId(value === "null" ? "" : value)}
                                            >
                                                <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-13 rounded-2xl px-5 shadow-inner transition-all hover:bg-white/[0.04] focus:ring-orange-500/20 w-full">
                                                    <SelectValue placeholder="Kategori Seçin (Opsiyonel)" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[20px] max-h-[300px] custom-scrollbar">
                                                    <SelectItem value="null" className="text-zinc-500 font-bold focus:bg-white/5 py-3">
                                                        Tüm Kategoriler (Genel)
                                                    </SelectItem>
                                                    <div className="h-px bg-white/5 my-1" />
                                                    {Array.isArray(categories) && categories.filter(c => !c.parentId).map((parent) => (
                                                        <SelectItem key={parent.id} value={parent.id.toString()} className="text-orange-500 font-extrabold focus:bg-orange-500/10 focus:text-orange-500 mt-1 py-3">
                                                            {parent.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Child Category Select (Animated with Framer Motion) */}
                                        <AnimatePresence>
                                            {(() => {
                                                const selectedParentId = categories.find(c => c.id.toString() === categoryId)?.parentId?.toString() || (categories.find(c => c.id.toString() === categoryId && !c.parentId) ? categoryId : null);
                                                const children = categories.filter(c => c.parentId?.toString() === selectedParentId);

                                                if (selectedParentId && children.length > 0) {
                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                                            exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                                            className="space-y-3 w-full sm:w-[240px]"
                                                        >
                                                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Alt Kategori</Label>
                                                            <Select
                                                                value={categories.find(c => c.id.toString() === categoryId && c.parentId)?.id.toString() || ""}
                                                                onValueChange={setCategoryId}
                                                            >
                                                                <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-13 rounded-2xl px-5 transition-all hover:bg-white/[0.04] focus:ring-orange-500/20 border-orange-500/20 shadow-[0_0_20px_rgba(249,115,22,0.05)] w-full">
                                                                    <SelectValue placeholder="Alt Kategori Seçin" />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[20px] max-h-[300px] custom-scrollbar">
                                                                    {children.map(child => (
                                                                        <SelectItem key={child.id} value={child.id.toString()} className="text-zinc-400 focus:bg-white/5 focus:text-white transition-colors py-3">
                                                                            {child.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </motion.div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </AnimatePresence>

                                        {/* Question Count Select */}
                                        <div className="space-y-3 w-full sm:w-[160px]">
                                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                                                {mode === 'normal' ? 'Soru Miktarı' : 'Alt Soru Miktarı'}
                                            </Label>
                                            <Select value={mode === 'normal' ? count : integratedCount} onValueChange={(v) => mode === 'normal' ? setCount(v) : setIntegratedCount(v)}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-13 rounded-2xl px-5 transition-all hover:bg-white/[0.04] focus:ring-orange-500/20 w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[20px]">
                                                    {mode === 'normal' ? (
                                                        <>
                                                            <SelectItem value="3" className="py-3 rounded-lg font-bold">3 Soru</SelectItem>
                                                            <SelectItem value="5" className="py-3 rounded-lg font-bold">5 Soru</SelectItem>
                                                            <SelectItem value="10" className="py-3 rounded-lg font-bold">10 Soru</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="2" className="py-3 rounded-lg font-bold">2 Alt Soru</SelectItem>
                                                            <SelectItem value="3" className="py-3 rounded-lg font-bold">3 Alt Soru</SelectItem>
                                                            <SelectItem value="4" className="py-3 rounded-lg font-bold">4 Alt Soru</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 'generate-options' && (
                            <>
                                {/* Premium Mode Selection */}
                                <div className="flex p-1.5 bg-white/[0.03] rounded-2xl border border-white/[0.06] backdrop-blur-sm">
                                    <button
                                        onClick={() => setMode('normal')}
                                        className={`flex-1 py-3 px-5 rounded-xl text-sm font-black tracking-wide transition-all duration-500 flex items-center justify-center gap-3 ${mode === 'normal'
                                            ? 'bg-zinc-800 text-white shadow-2xl shadow-black/50 border border-white/5 scale-[1.02]'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        <Shuffle className={`w-4 h-4 ${mode === 'normal' ? 'text-blue-500' : ''}`} />
                                        Bağımsız Sorular
                                    </button>
                                    <button
                                        onClick={() => setMode('integrated')}
                                        className={`flex-1 py-3 px-5 rounded-xl text-sm font-black tracking-wide transition-all duration-500 flex items-center justify-center gap-3 ${mode === 'integrated'
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        <Layers className="w-4 h-4" />
                                        Bütünleşik Soru (X-Y)
                                    </button>
                                </div>

                                {mode === 'normal' ? (
                                    <div className="space-y-4 pt-4">
                                        <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Soru Türü</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {questionTypes.map(type => {
                                                const Icon = type.icon
                                                const isActive = questionType === type.value
                                                return (
                                                    <button
                                                        key={type.value}
                                                        onClick={() => setQuestionType(type.value)}
                                                        className={`group relative flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 text-left overflow-hidden ${isActive
                                                            ? 'border-blue-500/50 bg-blue-500/[0.08] shadow-[0_10px_30px_rgba(59,130,246,0.1)] scale-[1.02]'
                                                            : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                                            }`}
                                                    >
                                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 ${isActive
                                                            ? 'bg-blue-500 text-white shadow-lg'
                                                            : 'bg-zinc-900 border border-white/[0.08] text-zinc-600 group-hover:text-zinc-400 group-hover:border-white/20'
                                                            }`}>
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        <div className="relative z-10">
                                                            <div className={`text-sm font-black transition-colors ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                                                {type.label}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">{type.desc}</div>
                                                        </div>
                                                        {isActive && (
                                                            <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-blue-500/10 blur-xl rounded-full" />
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-[24px] bg-blue-500/[0.03] border border-blue-500/10 space-y-4 relative overflow-hidden group mt-4">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
                                        <div className="flex items-center gap-3 text-blue-500 font-black text-sm tracking-tight">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <Layers className="w-4 h-4" />
                                            </div>
                                            Bütünleşik Soru Mimarisi
                                        </div>
                                        <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                                            Seçilen konulara bağlı, birbirini takip eden akademik sorular üretilir. Sınav yapısındaki gibi birbirine bağlı çoklu soru çözümleri içerir.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-6 pt-2">
                                    <div className="flex flex-wrap items-end gap-6">
                                        <div className="space-y-3 w-full sm:w-[240px]">
                                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Hedef Kategori *</Label>
                                            <Select
                                                value={categories.find(c => c.id.toString() === categoryId)?.parentId?.toString() || (categories.find(c => c.id.toString() === categoryId && !c.parentId) ? categoryId : categoryId === "null" ? "null" : "")}
                                                onValueChange={(value) => setCategoryId(value === "null" ? "" : value)}
                                            >
                                                <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-13 rounded-2xl px-5 shadow-inner transition-all hover:bg-white/[0.04] focus:ring-blue-500/20 w-full">
                                                    <SelectValue placeholder="Kategori Seçin (Opsiyonel)" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[20px] max-h-[300px] custom-scrollbar">
                                                    <SelectItem value="null" className="text-zinc-500 font-bold focus:bg-white/5 py-3">
                                                        Tüm Kategoriler (Genel)
                                                    </SelectItem>
                                                    <div className="h-px bg-white/5 my-1" />
                                                    {Array.isArray(categories) && categories.filter(c => !c.parentId).map((parent) => (
                                                        <SelectItem key={parent.id} value={parent.id.toString()} className="text-blue-500 font-extrabold focus:bg-blue-500/10 focus:text-blue-500 mt-1 py-3">
                                                            {parent.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Child Category Select (Animated with Framer Motion) */}
                                        <AnimatePresence>
                                            {(() => {
                                                const selectedParentId = categories.find(c => c.id.toString() === categoryId)?.parentId?.toString() || (categories.find(c => c.id.toString() === categoryId && !c.parentId) ? categoryId : null);
                                                const children = categories.filter(c => c.parentId?.toString() === selectedParentId);

                                                if (selectedParentId && children.length > 0) {
                                                    return (
                                                        <motion.div
                                                            initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                                            animate={{ opacity: 1, x: 0, scale: 1 }}
                                                            exit={{ opacity: 0, x: -10, scale: 0.95 }}
                                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                                            className="space-y-3 w-full sm:w-[240px]"
                                                        >
                                                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Alt Kategori</Label>
                                                            <Select
                                                                value={categories.find(c => c.id.toString() === categoryId && c.parentId)?.id.toString() || ""}
                                                                onValueChange={setCategoryId}
                                                            >
                                                                <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-13 rounded-2xl px-5 transition-all hover:bg-white/[0.04] focus:ring-blue-500/20 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.05)] w-full">
                                                                    <SelectValue placeholder="Alt Kategori Seçin" />
                                                                </SelectTrigger>
                                                                <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[20px] max-h-[300px] custom-scrollbar">
                                                                    {children.map(child => (
                                                                        <SelectItem key={child.id} value={child.id.toString()} className="text-zinc-400 focus:bg-white/5 focus:text-white transition-colors py-3">
                                                                            {child.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </motion.div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </AnimatePresence>

                                        {/* Question Count Select */}
                                        <div className="space-y-3 w-full sm:w-[160px]">
                                            <Label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">
                                                {mode === 'normal' ? 'Soru Miktarı' : 'Alt Soru Miktarı'}
                                            </Label>
                                            <Select value={mode === 'normal' ? count : integratedCount} onValueChange={(v) => mode === 'normal' ? setCount(v) : setIntegratedCount(v)}>
                                                <SelectTrigger className="bg-white/[0.02] border-white/[0.08] text-zinc-200 h-13 rounded-2xl px-5 transition-all hover:bg-white/[0.04] focus:ring-blue-500/20 w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-white/10 text-white rounded-[20px]">
                                                    {mode === 'normal' ? (
                                                        <>
                                                            <SelectItem value="3" className="py-3 rounded-lg font-bold">3 Soru</SelectItem>
                                                            <SelectItem value="5" className="py-3 rounded-lg font-bold">5 Soru</SelectItem>
                                                            <SelectItem value="10" className="py-3 rounded-lg font-bold">10 Soru</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="2" className="py-3 rounded-lg font-bold">2 Alt Soru</SelectItem>
                                                            <SelectItem value="3" className="py-3 rounded-lg font-bold">3 Alt Soru</SelectItem>
                                                            <SelectItem value="4" className="py-3 rounded-lg font-bold">4 Alt Soru</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {step === 'confirm' && (
                            <div className="py-16 px-8 text-center space-y-8 animate-in zoom-in-95 duration-700 relative">
                                <div className="absolute inset-0 bg-orange-500/5 blur-[120px] rounded-full" />
                                <div className="relative">
                                    <div className="w-24 h-24 bg-orange-500/10 rounded-[32px] flex items-center justify-center mx-auto text-orange-500 border border-orange-500/20 shadow-2xl shadow-orange-500/10">
                                        <ImageIcon size={48} className="animate-pulse" />
                                    </div>
                                </div>
                                <div className="space-y-3 relative">
                                    <h3 className="text-3xl font-black text-white tracking-tight">Diyagram Tespit Edildi</h3>
                                    <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed text-base">
                                        Görselde bir şema veya teknik çizim buldum. Soruları bu bölüm odaklı mı üretelim?
                                    </p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto pt-6 relative">
                                    <Button
                                        variant="outline"
                                        onClick={() => handleConfirmDiagram(false)}
                                        className="flex-1 h-14 border-white/[0.08] bg-white/[0.02] text-zinc-500 hover:text-white hover:bg-white/[0.05] rounded-2xl font-black transition-all"
                                    >
                                        FOTOĞRAFIN TÜMÜNÜ KULLAN
                                    </Button>
                                    <Button
                                        onClick={() => handleConfirmDiagram(true)}
                                        className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-500/20 hover:scale-[1.03] transition-all"
                                    >
                                        ŞEMAYI SEÇ VE ÜRET
                                    </Button>
                                </div>
                            </div>
                        )}

                        {step === 'crop' && (
                            <div className="space-y-6 animate-in fade-in duration-700">
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2.5 text-base font-black text-white">
                                            <Scissors className="w-5 h-5 text-orange-500" />
                                            Alan Seçimi
                                        </div>
                                        <p className="text-xs text-zinc-500 font-medium">Lütfen işlenmesini istediğiniz diyagramı kutu içine alın.</p>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/[0.05] border border-white/5 text-zinc-500 px-4 py-1.5 rounded-full">Diyagram Kırpma</span>
                                </div>

                                <div className="relative rounded-[32px] border border-white/[0.08] overflow-hidden bg-black/60 flex justify-center p-6 shadow-2xl h-[450px]">
                                    {image && (
                                        <div className="relative w-full h-full overflow-auto custom-scrollbar flex items-center justify-center">
                                            <ReactCrop
                                                crop={crop}
                                                onChange={(c) => setCrop(c)}
                                                onComplete={(c) => setCompletedCrop(c)}
                                                className="max-w-full"
                                            >
                                                <img
                                                    ref={imgRef}
                                                    src={image}
                                                    alt="Crop context"
                                                    className="max-h-full w-auto rounded-lg shadow-2xl"
                                                    onLoad={(e) => {
                                                        // Initial crop if needed
                                                    }}
                                                />
                                            </ReactCrop>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setStep('input')}
                                        className="h-14 px-8 text-zinc-500 hover:text-white hover:bg-white/5 rounded-2xl font-black transition-all"
                                        disabled={loading}
                                    >
                                        İPTAL
                                    </Button>
                                    <Button
                                        onClick={handleCropSave}
                                        className="flex-1 bg-white hover:bg-zinc-200 text-black font-black h-14 rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-3"
                                        disabled={loading || !completedCrop?.width}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                ANALİZ EDİLİYOR...
                                            </>
                                        ) : (
                                            <>
                                                <Check className="w-5 h-5" />
                                                SEÇİMİ ONAYLA VE BAŞLAT
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}



                        {(step === 'input' || step === 'generate-options') && (
                            <div className="flex gap-4 pt-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => step === 'generate-options' ? setStep('subtopics') : handleClose()}
                                    className="flex-1 h-14 rounded-2xl text-zinc-500 font-black hover:text-white hover:bg-white/5 transition-all"
                                    disabled={loading}
                                >
                                    {step === 'generate-options' ? 'GERİ DÖN' : 'VAZGEÇ'}
                                </Button>
                                <Button
                                    onClick={() => handleGenerate()}
                                    className={`flex-[2] text-white font-black h-14 rounded-2xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-0 group ${step === 'generate-options' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20'}`}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <div className="relative">
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-white animate-pulse" />
                                            </div>
                                            <span>YAPAY ZEKA ÇALIŞIYOR...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>SORULARI TASARLA</span>
                                            <div className="bg-white/20 p-2 rounded-xl group-hover:bg-white/30 transition-colors">
                                                <ArrowRight size={18} />
                                            </div>
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="fixed bottom-6 right-6 z-[200] bg-[#1c0f0f] border border-[#3b1717] p-5 rounded-[24px] flex items-center gap-4 shadow-[0_0_60px_rgba(239,68,68,0.15)] max-w-md w-[calc(100vw-3rem)] backdrop-blur-xl"
                    >
                        <div className="w-12 h-12 bg-red-500/10 rounded-[14px] flex items-center justify-center shrink-0 border border-red-500/20">
                            <AlertCircle className="w-5 h-5 text-red-500/80" />
                        </div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-[#d88989] uppercase text-[10px] font-black tracking-[0.15em]">Hata Mesajı</span>
                            <span className="text-[#e25050] font-bold text-sm leading-snug pr-6">{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="absolute top-4 right-4 text-red-500/40 hover:text-red-400 p-1 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </Fragment>
    )

}
