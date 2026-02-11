'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Zap, Check, BookOpen, Sparkles } from 'lucide-react'

interface Category {
    id: number
    name: string
    parentId?: number | null
}

interface ExamSetupDialogProps {
    categories: Category[]
}

export function ExamSetupDialog({ categories }: ExamSetupDialogProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [selectedCategories, setSelectedCategories] = useState<number[]>([])

    const toggleCategory = (id: number) => {
        setSelectedCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        )
    }

    const handleStart = () => {
        const params = new URLSearchParams()
        if (selectedCategories.length > 0) {
            params.set('categories', selectedCategories.join(','))
        }
        router.push(`/exam?${params.toString()}`)
    }

    return (
        <div className="relative group">
            <Button
                disabled
                className="bg-white/[0.03] text-zinc-500 border border-white/[0.05] backdrop-blur-xl font-black px-7 h-12 rounded-xl flex items-center gap-2.5 cursor-not-allowed opacity-60"
            >
                <div className="relative">
                    <Zap className="w-5 h-5 text-zinc-600" />
                </div>
                <span className="tracking-tight">Pratik Yap</span>
            </Button>
            <div className="absolute -top-2 -right-2 bg-orange-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] z-10 uppercase tracking-tighter border border-orange-400/20 animate-pulse">
                Yakında
            </div>
        </div>
    )
}
