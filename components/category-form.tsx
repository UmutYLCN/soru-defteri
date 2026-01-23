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
import { FolderPlus, Tag, Loader2 } from 'lucide-react'

interface CategoryFormProps {
    onSuccess: () => void
}

export function CategoryForm({ onSuccess }: CategoryFormProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            })

            if (res.ok) {
                setName('')
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
                <Button variant="outline" className="border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:bg-zinc-800 hover:text-white px-6 py-2.5 rounded-xl transition-all duration-300 flex items-center gap-2">
                    <FolderPlus className="w-5 h-5" />
                    <span>Yeni Kategori</span>
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
                            placeholder="Örn: Matematik, Fizik, Tarih..."
                            className="bg-zinc-800 border-zinc-700 text-white"
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
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
