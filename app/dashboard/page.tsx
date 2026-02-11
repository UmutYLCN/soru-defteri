'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import katex from 'katex'
import { User, LogOut, Settings, FileText, CheckCircle2, Layout, Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuestionForm } from '@/components/question-form'
import { QuestionTable } from '@/components/question-table'
import { CategoryForm } from '@/components/category-form'
import { AIGenerator } from '@/components/ai-generator'
import { EditQuestionDialog } from '@/components/edit-question-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase'

interface Category {
  id: number
  name: string
  parentId?: number | null
  _count?: { questions: number }
}

interface Question {
  id: number
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  solution: string | null
  questionTextEN: string | null
  optionAEN: string | null
  optionBEN: string | null
  optionCEN: string | null
  optionDEN: string | null
  solutionEN: string | null
  imageUrl: string | null
  groupId: number | null
  group: {
    id: number
    stemText: string
    stemTextEN: string | null
    imageUrl: string | null
  } | null
  category: {
    id: number
    name: string
  } | null
}

export default function Dashboard() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [includeSolutions, setIncludeSolutions] = useState(true)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [exportWizardStep, setExportWizardStep] = useState<'options' | 'generating' | 'preview'>('options')
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [pdfThumbnail, setPdfThumbnail] = useState<string | null>(null)
  const [language, setLanguage] = useState<'tr' | 'en'>('tr')
  const [user, setUser] = useState<any>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async (newLang?: 'tr' | 'en') => {
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUser(authUser)
      }

      const [questionsRes, categoriesRes] = await Promise.all([
        fetch('/api/questions'),
        fetch('/api/categories')
      ])

      const questionsData = await questionsRes.json()
      const categoriesData = await categoriesRes.json()

      setQuestions(Array.isArray(questionsData) ? questionsData : [])
      setCategories(Array.isArray(categoriesData) ? categoriesData : [])
      if (newLang) setLanguage(newLang)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  const handleLogout = async () => {
    const { signOut } = await import('@/app/auth/actions')
    await signOut()
    router.push('/')
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setEditDialogOpen(true)
  }

  const handleExportPDF = async () => {
    setExportWizardStep('generating')
    try {
      const { jsPDF } = await import('jspdf')
      const { toCanvas } = await import('html-to-image')

      const element = document.getElementById('pdf-export-content')
      if (!element) return

      // Temporary show element to ensure it's captured correctly
      element.style.display = 'block'

      // Ensure element is visible but off-screen if needed, though block is usually fine for html-to-image
      // Wait a bit for KaTeX and layout
      await new Promise(resolve => setTimeout(resolve, 500))

      const canvas = await toCanvas(element, {
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
        style: {
          display: 'block'
        }
      })

      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      setPdfThumbnail(imgData)
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = pdfHeight
      let position = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST')
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight, undefined, 'FAST')
        heightLeft -= pageHeight
      }

      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)

      setPdfBlob(blob)
      setPdfPreviewUrl(url)
      setExportWizardStep('preview')
      element.style.display = 'none'
    } catch (error) {
      console.error('Error exporting PDF:', error)
      setExportWizardStep('options')
      setShowExportDialog(false)
    }
  }

  const handleDownloadPDF = () => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'NoteDiur_Sorular.pdf'
      link.click()
      URL.revokeObjectURL(url)

      // Reset wizard
      setShowExportDialog(false)
      setExportWizardStep('options')
      setPdfPreviewUrl(null)
      setPdfBlob(null)
    }
  }

  // Get all descendant category IDs for a parent category
  const getAllChildCategoryIds = (parentId: number, categories: Category[]): number[] => {
    let ids: number[] = [parentId];
    const children = categories.filter(c => c.parentId === parentId);
    children.forEach(child => {
      ids = [...ids, ...getAllChildCategoryIds(child.id, categories)];
    });
    return ids;
  };

  const filteredQuestions = useMemo(() => {
    if (selectedCategory === 'all') return questions;

    const selectedCatId = parseInt(selectedCategory);
    const allowedCategoryIds = new Set(getAllChildCategoryIds(selectedCatId, categories));

    return questions.filter(q => q.category && allowedCategoryIds.has(q.category.id));
  }, [selectedCategory, questions, categories]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black selection:bg-orange-500/30 font-[family-name:var(--font-geist-sans)]">
      {/* Background Effects - Brand Loyal */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Checkered Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-zinc-800/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100" />
      </div>

      {/* Premium Floating Header - Brand Colors */}
      <header className="fixed top-8 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-6xl">
        <div className="bg-zinc-900/40 border border-white/10 backdrop-blur-2xl rounded-[28px] px-8 py-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center relative shadow-[0_0_25px_rgba(249,115,22,0.15)] transition-all duration-300 group-hover:scale-105 group-hover:border-orange-500/30">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path d="M10 10H30V30H10V10Z" stroke="#f97316" strokeWidth="2.5" />
                  <path d="M15 20C15 17.2386 17.2386 15 20 15C22.7614 15 25 17.2386 25 20C25 22.7614 22.7614 25 20 25C17.2386 25 15 27.2386 15 30H25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tighter">NoteDiur</h1>
            </Link>


            <div className="hidden lg:flex items-center gap-6 border-l border-white/10 pl-8 ml-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] leading-none mb-1">Toplam Soru</span>
                <span className="text-lg text-orange-500 font-black leading-none">{questions.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] leading-none mb-1">Ders Sayısı</span>
                <span className="text-lg text-white font-black leading-none">
                  {categories.filter(c => !c.parentId).length}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* TR/EN Toggle Premium */}
            <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-xl p-0.5">
              <button
                onClick={() => setLanguage('tr')}
                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all duration-300 ${language === 'tr'
                  ? 'bg-white text-black shadow-lg scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                TR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all duration-300 ${language === 'en'
                  ? 'bg-white text-black shadow-lg scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                EN
              </button>
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-xl border transition-all duration-300 ${showUserMenu
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]'
                  : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white'
                  }`}
              >
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline max-w-[100px] truncate">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Hesabım'}
                </span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-zinc-800 mb-2">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Kullanıcı Paneli</p>
                    <p className="text-sm font-bold text-white truncate">{user?.user_metadata?.full_name || 'Kullanıcı'}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
                  </div>


                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-white/5 transition-colors text-sm font-semibold"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <LogOut size={16} />
                    </div>
                    <span>{language === 'tr' ? 'Çıkış Yap' : 'Sign Out'}</span>
                  </button>

                  <div className="mt-2 pt-2 border-t border-zinc-800 px-2">
                    <p className="text-[10px] text-zinc-600 text-center uppercase tracking-tighter">NoteDiur v1.0</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-40 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          {/* Left Action Group */}
          <div className="flex items-center gap-3">
            <QuestionForm categories={categories} onSuccess={() => fetchData()} />
            <AIGenerator categories={categories} onSuccess={() => fetchData()} />
          </div>

          {/* Right Action Group (Filters & Category Management) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 h-12">
              <AnimatePresence mode="popLayout">
                {(() => {
                  const selectedCat = categories.find(c => c.id.toString() === selectedCategory);
                  const activeParentId = selectedCat?.parentId || (selectedCat && !selectedCat.parentId ? selectedCat.id : null);
                  const children = categories.filter(c => c.parentId === activeParentId);

                  if (activeParentId && children.length > 0) {
                    return (
                      <motion.div
                        key="child-select"
                        initial={{ opacity: 0, x: 20, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex items-center gap-2 h-full"
                      >
                        <Select
                          value={selectedCat?.parentId ? selectedCategory : "all"}
                          onValueChange={(value) => setSelectedCategory(value === "all" ? activeParentId.toString() : value)}
                        >
                          <SelectTrigger className="min-w-[140px] w-full sm:w-auto bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-zinc-400 font-bold text-xs uppercase tracking-widest focus:ring-0 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all h-full rounded-xl px-4">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                              <SelectValue placeholder="Alt Kategori" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-950/95 border-white/[0.08] backdrop-blur-2xl text-white rounded-2xl shadow-2xl p-2 min-w-[200px]">
                            <SelectItem value="all" className="rounded-xl focus:bg-white/5 hover:bg-white/5 cursor-pointer py-3 text-[11px] font-black uppercase tracking-widest text-zinc-400 focus:text-white">
                              Tüm Alt Kategoriler
                            </SelectItem>
                            <div className="h-px bg-white/[0.05] my-2" />
                            {children.map(child => (
                              <SelectItem key={child.id} value={child.id.toString()} className="rounded-xl focus:bg-white/5 focus:text-white text-zinc-400 text-[11px] font-medium py-2.5">
                                {child.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="w-px h-5 bg-white/[0.05] mx-1" />
                      </motion.div>
                    );
                  }
                  return null;
                })()}
              </AnimatePresence>

              <Select
                value={(() => {
                  const cat = categories.find(c => c.id.toString() === selectedCategory);
                  return cat?.parentId?.toString() || selectedCategory;
                })()}
                onValueChange={(value) => setSelectedCategory(value)}
              >
                <SelectTrigger className="min-w-[140px] w-full sm:w-auto bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl text-zinc-400 font-bold text-xs uppercase tracking-widest focus:ring-0 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all h-full rounded-xl px-4">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                    <SelectValue placeholder="KATEGORİ" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-zinc-950/95 border-white/[0.08] backdrop-blur-2xl text-white rounded-2xl shadow-2xl p-2 min-w-[200px]">
                  <SelectItem value="all" className="rounded-xl focus:bg-white/5 hover:bg-white/5 cursor-pointer py-3 text-[11px] font-black uppercase tracking-widest text-zinc-400 focus:text-white">
                    Tüm Kategoriler
                  </SelectItem>
                  <div className="h-px bg-white/[0.05] my-2" />
                  {Array.isArray(categories) && categories.filter(c => !c.parentId).map((parent) => (
                    <SelectItem key={parent.id} value={parent.id.toString()} className="rounded-xl focus:bg-orange-500/10 focus:text-orange-500 mt-1 font-black text-[11px] uppercase tracking-[0.1em] text-orange-500/80 py-3">
                      {parent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CategoryForm categories={categories} onSuccess={() => fetchData()} />
            </div>

            {/* Export PDF Button */}
            <Button
              onClick={() => setShowExportDialog(true)}
              disabled={exporting || filteredQuestions.length === 0}
              className="bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/[0.1] backdrop-blur-xl font-black px-8 h-12 rounded-xl shadow-2xl active:scale-95 transition-all flex items-center gap-3 group"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <FileText className="w-5 h-5 text-orange-500 group-hover:rotate-12 transition-transform" />
                  <span className="text-xs uppercase tracking-[0.2em]">PDF DIŞA AKTAR</span>
                </>
              )}
            </Button>
          </div>
        </div>



        {/* Questions Table */}
        <QuestionTable
          questions={filteredQuestions}
          onEdit={handleEdit}
          onDelete={fetchData}
          onVariantsGenerated={fetchData}
          language={language}
          categories={categories}
        />
      </main>

      <footer className="border-t border-white/5 py-12 mt-20 relative z-10">
        <div className="container mx-auto px-6 text-center text-zinc-600 text-[11px] font-bold uppercase tracking-[0.4em] font-[family-name:var(--font-outfit)]">
          NoteDiur Premium v1.0 • Built for Excellence
        </div>
      </footer>

      {/* Export Options Wizard - Premium Redesign */}
      <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-500 ${showExportDialog ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => exportWizardStep !== 'generating' && setShowExportDialog(false)} />
        <div className="relative bg-zinc-950 border border-white/10 rounded-[32px] w-full max-w-md shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
          {/* Decorative Glow */}
          <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />

          {exportWizardStep === 'options' && (
            <div className="p-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center border border-orange-500/20">
                  <FileText className="text-orange-500" size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">PDF Export</h3>
                  <p className="text-zinc-500 text-sm font-medium uppercase tracking-widest">Yapılandırma</p>
                </div>
              </div>

              <p className="text-zinc-400 mb-6 font-medium leading-relaxed">
                Test belgenizi oluşturmadan önce tercihlerinizi belirleyin.
              </p>

              <div className="grid grid-cols-1 gap-3 mb-10">
                <button
                  onClick={() => setIncludeSolutions(true)}
                  className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${includeSolutions
                    ? 'bg-orange-500/10 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${includeSolutions ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold text-base transition-colors ${includeSolutions ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`}>Çözümler Dahil</div>
                    <div className="text-xs text-zinc-500 font-medium">Cevap anahtarı ve detaylı çözümler.</div>
                  </div>
                </button>

                <button
                  onClick={() => setIncludeSolutions(false)}
                  className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${!includeSolutions
                    ? 'bg-zinc-100 border-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${!includeSolutions ? 'bg-zinc-900 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                    <Layout size={20} />
                  </div>
                  <div className="text-left">
                    <div className={`font-bold text-base transition-colors ${!includeSolutions ? 'text-black' : 'text-zinc-400 group-hover:text-zinc-300'}`}>Sadece Sorular</div>
                    <div className="text-xs text-zinc-500 font-medium">Temiz ve yalın test görünümü.</div>
                  </div>
                </button>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="ghost"
                  onClick={() => setShowExportDialog(false)}
                  className="flex-1 h-14 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl font-bold transition-all"
                >
                  Vazgeç
                </Button>
                <Button
                  onClick={handleExportPDF}
                  className="flex-1 h-14 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={18} />
                  OLUŞTUR
                </Button>
              </div>
            </div>
          )}

          {exportWizardStep === 'generating' && (
            <div className="p-12 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
              <div className="relative w-28 h-28 mb-8">
                <div className="absolute inset-0 border-[3px] border-orange-500/10 rounded-[32px] rotate-12" />
                <div className="absolute inset-0 border-[3px] border-orange-500 border-t-transparent rounded-[32px] animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50 rounded-[32px] backdrop-blur-sm border border-white/5">
                  <div className="relative">
                    <FileText className="text-orange-500 animate-bounce" size={40} />
                    <Sparkles className="absolute -top-1 -right-1 text-white animate-pulse" size={16} />
                  </div>
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Belge Hazırlanıyor</h3>
              <p className="text-zinc-500 font-medium text-center max-w-[200px]">Yapay zeka mizanpajı optimize ediyor...</p>

              <div className="mt-10 w-full max-w-[200px] h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-orange-600 to-orange-400 w-1/2 animate-shimmer" />
              </div>
            </div>
          )}

          {exportWizardStep === 'preview' && (
            <div className="p-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">İşlem Tamam!</h3>
                  <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">Önizleme Hazır</p>
                </div>
                <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20 text-green-500">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              <div className="relative aspect-[3/4.2] w-full bg-white rounded-2xl mb-8 overflow-hidden border border-white shadow-[0_20px_50px_rgba(0,0,0,0.4)] group overflow-y-auto custom-scrollbar">
                {pdfThumbnail && (
                  <img
                    src={pdfThumbnail}
                    alt="PDF Preview"
                    className="w-full h-auto object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Önizleme Modu
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setExportWizardStep('options')
                    setPdfPreviewUrl(null)
                    setPdfThumbnail(null)
                  }}
                  className="px-6 h-14 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white rounded-2xl font-bold transition-all flex items-center justify-center"
                >
                  <ArrowRight className="rotate-180" size={20} />
                </button>
                <Button
                  onClick={handleDownloadPDF}
                  className="flex-1 h-14 bg-white hover:bg-zinc-200 text-black font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                  <span>PDF OLARAK İNDİR</span>
                  <div className="w-6 h-6 bg-black rounded-lg flex items-center justify-center">
                    <ArrowRight className="text-white" size={14} />
                  </div>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Question Dialog */}
      < EditQuestionDialog
        question={editingQuestion}
        categories={categories}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchData}
      />


      {/* Hidden PDF Export Content */}
      < div
        id="pdf-export-content"
        style={{
          display: 'none',
          width: '210mm',
          backgroundColor: 'white',
          color: 'black',
          padding: '20mm',
          fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }
        }
      >
        {/* PDF Header */}
        < div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '20px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827', letterSpacing: '-0.5px' }}>NOTEDIUR</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              {selectedCategory !== 'all' ? categories.find(c => c.id.toString() === selectedCategory)?.name : 'Tüm Kategoriler'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{filteredQuestions.length} Soru</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div >

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
          {(() => {
            const items: any[] = []
            const processedGroupIds = new Set()
            let questionCounter = 1

            // Local helper for solution rendering to avoid duplication
            const renderSolutionBlock = (q: any) => {
              if (!includeSolutions || !q.solution) return null;
              return (
                <div style={{
                  marginLeft: '40px',
                  marginTop: '15px',
                  padding: '12px 15px',
                  backgroundColor: '#f9fafb',
                  borderLeft: '3px solid #f97316',
                  borderRadius: '4px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {q.solution.includes('STEP_START') ? (
                      q.solution.split('STEP_START').filter(Boolean).map((section: string, index: number) => {
                        const stepEndParts = section.split('STEP_END');

                        // If there's no STEP_END, the whole section is content
                        if (stepEndParts.length === 1) {
                          return (
                            <div key={index} style={{ fontSize: '12.5px', color: '#374151', lineHeight: '1.4' }}>
                              <QuestionTextDisplay text={stepEndParts[0].trim()} />
                            </div>
                          );
                        }

                        const title = stepEndParts[0];
                        const content = stepEndParts.slice(1).join('STEP_END');
                        const isStepLabel = title.trim().length < 60 && !title.includes('\\frac') && !title.includes('$$');

                        return (
                          <div key={index} style={{ marginBottom: '4px' }}>
                            {isStepLabel && title.trim() && (
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#ea580c', marginBottom: '2px' }}>
                                {title.trim()}
                              </div>
                            )}
                            <div style={{ fontSize: '12.5px', color: '#374151', lineHeight: '1.4' }}>
                              <QuestionTextDisplay text={isStepLabel ? content.trim() : section.replace(/STEP_END/g, '').trim()} />
                            </div>
                          </div>
                        )
                      })
                    ) : q.solution.match(/(\d+\.\s*Adım|Adım\s*\d+)/i) ? (
                      q.solution.split(/(\d+\.\s*Adım:?|Adım\s*\d+:?)/gi).filter(Boolean).map((part: string, i: number, arr: string[]) => {
                        if (part.match(/(\d+\.\s*Adım:?|Adım\s*\d+:?)/i)) {
                          return (
                            <div key={i} style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#ea580c', marginBottom: '1px' }}>
                                {part.trim().replace(/:$/, '')}
                              </div>
                              <div style={{ fontSize: '12.5px', color: '#374151', lineHeight: '1.4' }}>
                                <QuestionTextDisplay text={arr[i + 1]?.trim() || ''} />
                              </div>
                            </div>
                          )
                        }
                        return null;
                      })
                    ) : (
                      <div style={{ fontSize: '12.5px', color: '#374151', lineHeight: '1.4' }}>
                        <QuestionTextDisplay text={q.solution} />
                      </div>
                    )}
                  </div>
                </div>
              );
            };

            filteredQuestions.forEach((q) => {
              if (q.groupId) {
                if (!processedGroupIds.has(q.groupId)) {
                  const groupQuestions = filteredQuestions.filter(fq => fq.groupId === q.groupId)
                  items.push({
                    type: 'group',
                    id: q.groupId,
                    group: q.group,
                    questions: groupQuestions,
                    number: questionCounter++
                  })
                  processedGroupIds.add(q.groupId)
                }
              } else {
                items.push({
                  type: 'single',
                  question: q,
                  number: questionCounter++
                })
              }
            })

            return items.map((item, idx) => {
              if (item.type === 'single') {
                const q = item.question
                return (
                  <div key={`single-${q.id}`} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <span style={{
                        backgroundColor: '#f3f4f6',
                        color: '#374151',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        flexShrink: 0
                      }}>
                        {item.number}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15.5px', lineHeight: '1.6', color: '#111827', fontWeight: '500' }}>
                          <QuestionTextDisplay text={q.questionText} />
                        </div>
                        {q.imageUrl && (
                          <div style={{ marginTop: '15px', marginBottom: '15px', textAlign: 'center' }}>
                            <img
                              src={q.imageUrl}
                              alt="Diagram"
                              style={{ maxWidth: '100%', maxHeight: '60mm', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '10px 20px',
                      paddingLeft: '40px',
                    }}>
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                        <div key={opt} style={{ display: 'flex', gap: '8px', fontSize: '14.5px' }}>
                          <span style={{ fontWeight: 'bold', color: '#4b5563' }}>{opt})</span>
                          <QuestionTextDisplay text={q[`option${opt}` as keyof typeof q] as string} />
                        </div>
                      ))}
                    </div>
                    {renderSolutionBlock(q)}
                  </div>
                )
              } else {
                return (
                  <div key={`group-${item.id}`} style={{ borderBottom: idx !== items.length - 1 ? '1px solid #f3f4f6' : 'none', paddingBottom: '30px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                      <span style={{
                        backgroundColor: '#374151',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        flexShrink: 0
                      }}>
                        {item.number}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '15px',
                          lineHeight: '1.6',
                          color: '#374151',
                          backgroundColor: '#f9fafb',
                          padding: '15px',
                          borderRadius: '8px',
                          borderLeft: '4px solid #f97316',
                          marginBottom: '20px',
                          fontStyle: 'italic'
                        }}>
                          <QuestionTextDisplay text={item.group?.stemText || ''} />
                        </div>
                        {item.group?.imageUrl && (
                          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <img
                              src={item.group.imageUrl}
                              alt="Group Diagram"
                              style={{ maxWidth: '90%', maxHeight: '70mm', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', paddingLeft: '40px' }}>
                      {item.questions.map((subQ: any, subIdx: number) => {
                        const subLabel = String.fromCharCode(97 + subIdx) + ')';
                        return (
                          <div key={subQ.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                            <div style={{ fontSize: '15px', lineHeight: '1.5', color: '#111827', fontWeight: '500', marginBottom: '12px', display: 'flex', gap: '10px' }}>
                              <span style={{ color: '#f97316', fontWeight: 'bold' }}>{subLabel}</span>
                              <div style={{ flex: 1 }}>
                                <QuestionTextDisplay text={subQ.questionText} />
                              </div>
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '10px 20px',
                              paddingLeft: '25px',
                            }}>
                              {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                <div key={opt} style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                                  <span style={{ fontWeight: 'bold', color: '#4b5563' }}>{opt})</span>
                                  <QuestionTextDisplay text={subQ[`option${opt}` as keyof typeof subQ] as string} />
                                </div>
                              ))}
                            </div>
                            {renderSolutionBlock(subQ)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
            })
          })()}
        </div>

        {/* Answer Key Page */}
        <div style={{
          marginTop: '60px',
          paddingTop: '40px',
          borderTop: '2px dashed #d1d5db',
          breakBefore: 'page',
          pageBreakBefore: 'always'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '30px', color: '#111827' }}>
            CEVAP ANAHTARI
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '12px',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {(() => {
              const answerCells: any[] = []
              const processedGroupIds = new Set()
              let questionCounter = 1

              filteredQuestions.forEach((q) => {
                if (q.groupId) {
                  if (!processedGroupIds.has(q.groupId)) {
                    const groupQuestions = filteredQuestions.filter(fq => fq.groupId === q.groupId)
                    const currentNum = questionCounter++
                    groupQuestions.forEach((subQ, subIx) => {
                      const subLabel = String.fromCharCode(97 + subIx)
                      answerCells.push({
                        label: `${currentNum}-${subLabel}`,
                        answer: subQ.correctAnswer,
                        id: subQ.id
                      })
                    })
                    processedGroupIds.add(q.groupId)
                  }
                } else {
                  answerCells.push({
                    label: `${questionCounter++}`,
                    answer: q.correctAnswer,
                    id: q.id
                  })
                }
              })

              return answerCells.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid #e5e7eb',
                  padding: '8px 4px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb'
                }}>
                  <span style={{ fontWeight: 'bold', color: '#6b7280' }}>{item.label}.</span>
                  <span style={{ fontWeight: 'bold', color: '#111827', fontSize: '15px' }}>{item.answer}</span>
                </div>
              ))
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for PDF text to handle math rendering with clean styles
function QuestionTextDisplay({ text }: { text: string }) {
  if (!text) return null;

  // Normalize escaped dollars
  const normalizedText = text.replace(/\\\$/g, '$')

  // Regex to match $...$ or $$...$$
  const parts = normalizedText.split(/(\$\$[\s\S]*?\$\$|\$.*?\$)/g)

  return (
    <span style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
      {parts.map((part, index) => {
        try {
          if (part.startsWith('$$') && part.endsWith('$$')) {
            const math = part.slice(2, -2)
            return (
              <span
                key={index}
                className="pdf-math-block"
                style={{ display: 'block', margin: '10px 0', textAlign: 'center' }}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(math, {
                    displayMode: true,
                    throwOnError: false,
                    strict: false
                  })
                }}
              />
            )
          } else if (part.startsWith('$') && part.endsWith('$')) {
            const math = part.slice(1, -1)
            return (
              <span
                key={index}
                className="pdf-math-inline"
                style={{ display: 'inline-block', padding: '0 2px' }}
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(math, {
                    displayMode: false,
                    throwOnError: false,
                    strict: false
                  })
                }}
              />
            )
          }
        } catch (e) {
          console.error('Math rendering error in PDF:', e)
          return <span key={index}>{part}</span>
        }
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}

