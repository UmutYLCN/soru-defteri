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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    parentId: parentId !== 'none' ? parentId : null
                })
            })

            if (res.ok) {
                setName('')
                setParentId('none')
                setOpen(false)
                onSuccess()
            }
        } catch (error) {
            console.error('Error creating category:', error)
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
                    className="h-8 w-8 rounded-lg text-zinc-500 hover:text-orange-500 hover:bg-orange-500/10 transition-all duration-200"
                    title="Yeni Kategori Ekle"
                >
                    <FolderPlus size={18} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">Yeni Kategori Oluştur</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="categoryName" className="text-zinc-300">Kategori Adı</Label>
                        <Input
                            id="categoryName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: Integrals, Logic Gates..."
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="parentCategory" className="text-zinc-300">Üst Kategori (Opsiyonel)</Label>
                        <Select value={parentId} onValueChange={setParentId}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                                <SelectValue placeholder="Ana ders seçin" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="none" className="text-zinc-400">Üst Kategori Yok (Ana Ders)</SelectItem>
                                {Array.isArray(categories) && categories.filter(c => !c.parentId).map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()} className="text-white hover:bg-zinc-700">
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-zinc-500">Bir ders seçerseniz, bu kategori o dersin alt konusu olur.</p>
                    </div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold h-11 rounded-xl shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2 border-0"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Oluşturuluyor...</span>
                            </>
                        ) : (
                            <>
                                <Tag className="w-4 h-4" />
                                <span>Kategori Oluştur</span>
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
