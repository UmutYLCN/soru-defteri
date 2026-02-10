'use client'

import { useState, Fragment, useRef } from 'react'
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
import { Wand2, Loader2, BookOpen, AlertCircle, Calculator, Brain, BarChart3, Shuffle, Layers, Image as ImageIcon, X, Check, Scissors, RefreshCw } from 'lucide-react'
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
    { value: 'Grafik/Tablo', label: 'Grafik / Tablo', icon: BarChart3, desc: 'Veri yorumlama' },
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

    // Interactive Crop States
    const [step, setStep] = useState<'input' | 'confirm' | 'crop'>('input')
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        x: 25,
        y: 25,
        width: 50,
        height: 50
    })
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
    const imgRef = useRef<HTMLImageElement>(null)

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

        if (!categoryId) {
            setError('Lütfen bir kategori seçin.')
            return
        }

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
                    categoryId: categoryId || null,
                }
                : {
                    prompt,
                    image: activeImage,
                    originalImage: originalContextImage,
                    subQuestionCount: parseInt(integratedCount),
                    categoryId: categoryId || null,
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
            setError('Resim kırpılamadı')
            setLoading(false)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setStep('input')
        setPrompt('')
        setImage(null)
        setImagePreview(null)
        setError(null)
        setLoading(false)
        setCrop({
            unit: '%',
            x: 25,
            y: 25,
            width: 50,
            height: 50
        })
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-orange-500/50 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-black/20 transition-all duration-300 flex items-center gap-2 border-0 active:scale-95">
                    <Wand2 className="w-5 h-5 text-orange-500" />
                    <span>AI Soru Üret</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800 text-white p-0 custom-scrollbar">
                <div className="bg-orange-500/5 px-6 py-6 border-b border-zinc-800">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Wand2 className="w-6 h-6 text-orange-500" />
                        AI Soru Üretici
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 mt-1">
                        Metin girerek veya soru görseli yükleyerek sınav kalitesinde sorular üretin.
                    </DialogDescription>
                </div>

                <div className="p-6 space-y-6">
                    {step === 'input' && (
                        <>
                            {/* Mode Selection */}
                            <div className="flex p-1 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                                <button
                                    onClick={() => setMode('normal')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'normal'
                                        ? 'bg-zinc-700 text-white shadow-lg'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <Shuffle className="w-4 h-4" />
                                    Bağımsız Sorular
                                </button>
                                <button
                                    onClick={() => setMode('integrated')}
                                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${mode === 'integrated'
                                        ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    <Layers className="w-4 h-4" />
                                    Bütünleşik Soru (X-Y)
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="prompt" className="text-zinc-300 flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" />
                                        {mode === 'normal' ? 'Konu veya Örnek Soru' : 'Senaryo / Problem Tanımı'}
                                    </Label>
                                    <Textarea
                                        id="prompt"
                                        placeholder={mode === 'normal'
                                            ? "Örn: Newton'un hareket yasaları hakkında soru üret veya fotoğrafını yüklediğin soruya benzer sorular oluştur..."
                                            : "Örn: Bir RLC devresi ve bu devredeki elemanların değerlerini içeren bir senaryo yazın veya görselden analiz yaptırın..."
                                        }
                                        className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50 focus:ring-orange-500/50 min-h-[100px] resize-none text-zinc-200 placeholder:text-zinc-600"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                </div>

                                {/* Image Upload Area */}
                                <div className="space-y-2">
                                    <Label className="text-zinc-300 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" />
                                        Görsel Yükle (Opsiyonel)
                                    </Label>
                                    {!imagePreview ? (
                                        <div className="relative group overflow-hidden">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center group-hover:border-orange-500/30 group-hover:bg-orange-500/5 transition-all duration-300">
                                                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-2 text-zinc-500 group-hover:scale-110 group-hover:text-orange-500 transition-all">
                                                    <ImageIcon size={24} />
                                                </div>
                                                <p className="text-sm font-bold text-zinc-400 group-hover:text-zinc-200">Fotoğraf Yükle veya Sürükle</p>
                                                <p className="text-[11px] text-zinc-600 mt-1 uppercase tracking-tighter">JPG, PNG (Maks 5MB)</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden border border-orange-500/30 group">
                                            <img src={imagePreview} alt="Preview" className="w-full h-32 object-contain bg-black/50" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={clearImage}
                                                    className="bg-red-500 p-2 rounded-full text-white hover:bg-red-600 transition-all scale-90 group-hover:scale-100"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                            <div className="absolute top-2 left-2 bg-orange-500 px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider">Görsel Seçildi</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {mode === 'normal' ? (
                                <div className="space-y-3">
                                    <Label className="text-zinc-300">Soru Tipi</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {questionTypes.map(type => {
                                            const Icon = type.icon
                                            return (
                                                <button
                                                    key={type.value}
                                                    onClick={() => setQuestionType(type.value)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left ${questionType === type.value
                                                        ? 'border-orange-500/50 bg-orange-500/10 shadow-lg shadow-orange-500/5'
                                                        : 'border-zinc-800 bg-zinc-800/30 hover:border-zinc-700 hover:bg-zinc-800/60'
                                                        }`}
                                                >
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${questionType === type.value
                                                        ? 'bg-orange-500/20 text-orange-500'
                                                        : 'bg-zinc-800 text-zinc-500'
                                                        }`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className={`text-sm font-bold ${questionType === type.value ? 'text-orange-400' : 'text-zinc-300'
                                                            }`}>
                                                            {type.label}
                                                        </div>
                                                        <div className="text-[11px] text-zinc-500">{type.desc}</div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-3">
                                    <div className="flex items-center gap-2 text-violet-400 font-bold text-sm">
                                        <Layers className="w-4 h-4" />
                                        Bütünleşik Soru Yapısı
                                    </div>
                                    <p className="text-xs text-zinc-500 leading-relaxed">
                                        Görseldeki veya metindeki verileri kullanarak ortak bir senaryoya bağlı ardışık sorular üretilir.
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">
                                        {mode === 'normal' ? 'Soru Sayısı' : 'Alt Soru Sayısı'}
                                    </Label>
                                    {mode === 'normal' ? (
                                        <Select value={count} onValueChange={setCount}>
                                            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectItem value="3">3 Soru</SelectItem>
                                                <SelectItem value="5">5 Soru</SelectItem>
                                                <SelectItem value="10">10 Soru</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Select value={integratedCount} onValueChange={setIntegratedCount}>
                                            <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                                <SelectItem value="2">2 Alt Soru</SelectItem>
                                                <SelectItem value="3">3 Alt Soru</SelectItem>
                                                <SelectItem value="4">4 Alt Soru</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Kategori *</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId} required>
                                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700 text-zinc-200">
                                            <SelectValue placeholder="Bir kategori seçin *" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                            {Array.isArray(categories) && categories.filter(c => !c.parentId).map((parent) => (
                                                <Fragment key={parent.id}>
                                                    <SelectItem value={parent.id.toString()} className="text-white font-bold bg-zinc-800/50">
                                                        {parent.name}
                                                    </SelectItem>
                                                    {categories.filter(c => c.parentId === parent.id).map(child => (
                                                        <SelectItem key={child.id} value={child.id.toString()} className="text-zinc-300 pl-6 hover:bg-zinc-700">
                                                            ㄴ {child.name}
                                                        </SelectItem>
                                                    ))}
                                                </Fragment>
                                            ))}
                                            {(!Array.isArray(categories) || categories.length === 0) && (
                                                <div className="p-2 text-sm text-zinc-500 text-center">Önce kategori oluşturun</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 'confirm' && (
                        <div className="py-8 px-4 text-center space-y-6 animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto text-orange-500">
                                <ImageIcon size={40} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Diyagram Tespit Edildi!</h3>
                                <p className="text-zinc-400">
                                    Görselde bir şema/devre tespit ettim. Soruları bu şemayı kullanarak mı üretmemi istersiniz?
                                </p>
                            </div>
                            <div className="flex gap-4 max-w-sm mx-auto pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => handleConfirmDiagram(false)}
                                    className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                >
                                    Hayır, Devam Et
                                </Button>
                                <Button
                                    onClick={() => handleConfirmDiagram(true)}
                                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white font-bold"
                                >
                                    Evet, Şemayı Seç
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'crop' && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <div className="flex items-center justify-between text-zinc-400 mb-2">
                                <div className="flex items-center gap-2 text-sm font-bold text-white">
                                    <Scissors className="w-4 h-4 text-violet-400" />
                                    Şemayı Mouse ile Çerçeve içine Alın
                                </div>
                                <span className="text-[10px] uppercase tracking-widest bg-zinc-800 px-2 py-1 rounded">Serbest Seçim</span>
                            </div>

                            <div className="relative max-h-[500px] rounded-2xl border-2 border-zinc-800 overflow-y-auto bg-black/40 flex justify-center p-4 custom-scrollbar">
                                {image && (
                                    <ReactCrop
                                        crop={crop}
                                        onChange={(c) => setCrop(c)}
                                        onComplete={(c) => setCompletedCrop(c)}
                                    >
                                        <img
                                            ref={imgRef}
                                            src={image}
                                            alt="Crop context"
                                            className="max-w-full h-auto rounded-lg"
                                        />
                                    </ReactCrop>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                                <ImageIcon className="w-3 h-3 text-zinc-600" />
                                Köşelerden çekiştirerek veya yeni alan çizerek seçin
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('input')}
                                    className="border-zinc-700 text-zinc-400"
                                    disabled={loading}
                                >
                                    Geri Dön
                                </Button>
                                <Button
                                    onClick={handleCropSave}
                                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white font-bold h-12"
                                    disabled={loading || !completedCrop?.width}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            İşleniyor...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5 mr-2" />
                                            Seçimi Onayla ve Üret
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-1">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {step === 'input' && (
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                                className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                disabled={loading}
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={() => handleGenerate()}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 border-0"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Analiz Ediliyor...
                                    </>
                                ) : (
                                    'Soruları Oluştur'
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
