'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { FolderPlus, Tag, Loader2 } from 'lucide-react'

interface Category {
    id: number
    name: string
    parentId?: number | null
}

interface CategoryFormProps {
    categories: Category[]
    onSuccess: () => void
}

export function CategoryForm({ categories, onSuccess }: CategoryFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [parentId, setParentId] = useState<string>('none')
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            setError(null)
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    parentId: parentId !== 'none' ? parentId : null
                })
            })

            const data = await res.json()

            if (res.ok) {
                setName('')
                setParentId('none')
                setOpen(false)
                onSuccess()
            } else {
                setError(data.error || 'Bir hata oluştu')
            }
        } catch (error) {
            console.error('Error creating category:', error)
            setError('Sunucuya bağlanırken bir hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 transition-all duration-300 border border-white/5 hover:border-orange-500/30 active:scale-95"
                    title="Yeni Kategori Ekle"
                >
                    <FolderPlus size={18} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px] bg-zinc-950/90 border-white/10 backdrop-blur-2xl rounded-[32px] p-0 overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]">
                {/* Premium Background Accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500/0 via-orange-500/50 to-orange-500/0" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

                <div className="p-8">
                    <DialogHeader className="mb-8">
                        <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500 mb-4 border border-orange-500/20">
                            <FolderPlus size={24} />
                        </div>
                        <DialogTitle className="text-2xl font-black text-white tracking-tight">
                            Yeni Kategori <span className="text-orange-500">Oluştur</span>
                        </DialogTitle>
                        <p className="text-zinc-500 text-sm font-medium">Soru bankanızı daha düzenli hale getirmek için yeni bir başlık ekleyin.</p>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <Label htmlFor="categoryName" className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Kategori / Konu Adı</Label>
                            <div className="relative group">
                                <Input
                                    id="categoryName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Örn: Limit ve Türev, Temel Kavramlar..."
                                    className="bg-white/[0.03] border-white/10 h-12 px-4 rounded-2xl text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:ring-orange-500/20 transition-all duration-300"
                                    required
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-orange-500/50 transition-colors">
                                    <Tag size={16} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="parentCategory" className="text-[11px] font-black uppercase tracking-widest text-zinc-500 ml-1">Üst Kategori (Opsiyonel)</Label>
                            <Select value={parentId} onValueChange={setParentId}>
                                <SelectTrigger className="bg-white/[0.03] border-white/10 h-12 px-4 rounded-2xl text-white focus:ring-offset-0 focus:ring-0 focus:border-orange-500/50 transition-all duration-300">
                                    <SelectValue placeholder="Bir üst kategori seçin" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                                    <SelectItem value="none" className="text-zinc-400 focus:bg-white/5 focus:text-white cursor-pointer py-3">Üst Kategori Yok (Ana Kategoriler)</SelectItem>
                                    {Array.isArray(categories) && categories.filter(c => !c.parentId).map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()} className="text-white focus:bg-orange-500 focus:text-white cursor-pointer py-3 font-semibold">
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2 ml-1">
                                <div className="w-1 h-1 rounded-full bg-orange-500/50" />
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">İpucu: Alt konular ders yönetimini kolaylaştırır.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold animate-in fade-in slide-in-from-top-2">
                                ⚠️ {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black h-14 rounded-2xl shadow-[0_20px_40px_rgba(249,115,22,0.2)] hover:shadow-[0_25px_50px_rgba(249,115,22,0.3)] transition-all duration-500 flex items-center justify-center gap-3 border-0 active:scale-[0.98] mt-4"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>Kategoriyi Kaydet</span>
                                    <FolderPlus size={20} />
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    )
}
