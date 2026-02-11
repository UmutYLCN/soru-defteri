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
                    className="h-10 w-10 rounded-xl text-zinc-400 hover:text-orange-500 hover:bg-orange-500/10 transition-all duration-300 border border-white/5 hover:border-orange-500/30 active:scale-95"
                    title="Yeni Kategori Ekle"
                >
                    <FolderPlus size={18} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-zinc-950/95 border-white/[0.08] backdrop-blur-2xl rounded-[32px] p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]">
                {/* Radiant Header */}
                <div className="relative overflow-hidden px-8 py-8 border-b border-white/[0.05]">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none" />
                    <div className="relative z-10 flex flex-col gap-1">
                        <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5">
                                <FolderPlus className="w-5 h-5 text-orange-500" />
                            </div>
                            Kategori <span className="text-orange-500 ml-1">Yönetimi</span>
                        </DialogTitle>
                        <p className="text-zinc-500 text-xs font-medium mt-1 ml-13">
                            Yeni konular ekleyerek soru bankanızı organize edin.
                        </p>
                    </div>
                </div>

                <div className="p-8">
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

