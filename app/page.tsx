'use client'

import React, { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import katex from 'katex'
import { User, Trash2, LogOut, Settings, FolderTree } from 'lucide-react'
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
  category: {
    id: number
    name: string
  } | null
}

export default function Home() {
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
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async (newLang?: 'tr' | 'en') => {
    try {
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

  const handleResetDatabase = async () => {
    const confirmMessage = language === 'tr'
      ? 'Tüm veritabanı silinecek. Bu işlem geri alınamaz. Emin misiniz?'
      : 'All database will be deleted. This action cannot be undone. Are you sure?'

    if (window.confirm(confirmMessage)) {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/reset-db', { method: 'POST' })
        if (res.ok) {
          alert(language === 'tr' ? 'Veritabanı başarıyla sıfırlandı.' : 'Database reset successfully.')
          fetchData()
        } else {
          const data = await res.json()
          alert(`Hata: ${data.error}`)
        }
      } catch (error: any) {
        alert(`Hata: ${error.message}`)
      } finally {
        setLoading(false)
        setShowUserMenu(false)
      }
    }
  }


  const handleSeedDatabase = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/seed-db', { method: 'POST' })
      if (res.ok) {
        alert(language === 'tr' ? 'Dersler başarıyla eklendi.' : 'Courses seeded successfully.')
        window.location.reload() // Force a full page reload to clear any cache
      } else {
        const data = await res.json()
        alert(`Hata: ${data.error}`)
      }
    } catch (error: any) {
      alert(`Hata: ${error.message}`)
    } finally {
      setLoading(false)
      setShowUserMenu(false)
    }
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

  const filteredQuestions = selectedCategory === 'all'
    ? questions
    : questions.filter(q => q.category?.id.toString() === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] selection:bg-orange-500/30">
      {/* Premium Glassmorphic Header */}
      <header className="fixed top-0 left-0 right-0 z-[100] border-b border-white/[0.06] bg-black/40 backdrop-blur-[20px] supports-[backdrop-filter]:bg-black/40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="group relative flex items-center justify-center">
              {/* Logo Glow */}
              <div className="absolute -inset-2 bg-orange-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-11 h-11 bg-zinc-950 border border-white/10 rounded-[14px] flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-105 active:scale-95">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="18" height="18" rx="5" stroke="#f97316" strokeWidth="2.5" />
                  <circle cx="12" cy="12" r="3.5" fill="white" />
                  <circle cx="12" cy="12" r="1.5" fill="#f97316" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-white tracking-[-0.03em] font-[family-name:var(--font-outfit)] leading-none">
                NoteDiur
                <span className="text-orange-500 ml-0.5">.</span>
              </h1>
              <span className="text-[10px] font-bold text-zinc-500 tracking-[0.2em] uppercase mt-1">Soru Defteri</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-6 px-4 py-2 bg-white/[0.03] border border-white/[0.06] rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Soru:</span>
                <span className="text-sm text-white font-black">{questions.length}</span>
              </div>
              <div className="w-px h-3 bg-white/10" />
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Ders:</span>
                <span className="text-sm text-white font-black">{categories.length}</span>
              </div>
            </div>

            <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-1 shadow-2xl">
              <button
                onClick={() => setLanguage('tr')}
                className={`px-4 py-1.5 rounded-xl text-[12px] font-black transition-all duration-300 ${language === 'tr'
                  ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
              >
                TR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-1.5 rounded-xl text-[12px] font-black transition-all duration-300 ${language === 'en'
                  ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] scale-[1.02]'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
              >
                EN
              </button>
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`w-11 h-11 rounded-[14px] border transition-all duration-300 flex items-center justify-center ${showUserMenu
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.2)]'
                  : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white hover:bg-white/[0.08]'
                  }`}
              >
                <User size={20} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-zinc-800 mb-2">
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Yönetici Paneli</p>
                    <p className="text-sm font-bold text-white">Admin User</p>
                  </div>

                  <button
                    onClick={handleSeedDatabase}
                    className="w-full flex items-center gap-3 px-4 py-3 text-zinc-300 hover:bg-orange-500/10 hover:text-orange-500 transition-colors text-sm font-semibold"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                      <FolderTree size={16} />
                    </div>
                    <span>{language === 'tr' ? 'Hazır Dersleri Yükle' : 'Load Ready Courses'}</span>
                  </button>

                  <button
                    onClick={handleResetDatabase}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-semibold"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Trash2 size={16} />
                    </div>
                    <span>{language === 'tr' ? 'Veritabanını Sıfırla' : 'Delete Database'}</span>
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
      <main className="container mx-auto px-6 py-32 relative">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
          {/* Left Action Group */}
          <div className="flex items-center gap-3">
            <QuestionForm categories={categories} onSuccess={() => fetchData()} />
            <AIGenerator categories={categories} onSuccess={(lang) => fetchData(lang)} />
          </div>

          {/* Right Action Group (Filters & Category Management) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 pr-2 gap-1 group hover:border-orange-500/30 transition-all duration-300">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[180px] bg-transparent border-0 text-zinc-300 focus:ring-0 hover:text-white transition-colors">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="all" className="hover:bg-zinc-800 cursor-pointer">
                    Tüm Kategoriler
                  </SelectItem>
                  {Array.isArray(categories) && categories.filter(c => !c.parentId).map((parent) => (
                    <Fragment key={parent.id}>
                      <SelectItem value={parent.id.toString()} className="font-bold text-orange-500 bg-orange-500/5 mt-1">
                        {parent.name}
                      </SelectItem>
                      {categories.filter(c => c.parentId === parent.id).map(child => (
                        <SelectItem key={child.id} value={child.id.toString()} className="pl-6 text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer">
                          ㄴ {child.name}
                        </SelectItem>
                      ))}
                    </Fragment>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px h-4 bg-zinc-800 mx-1" />
              <CategoryForm categories={categories} onSuccess={() => fetchData()} />
            </div>

            {/* Export PDF Button */}
            <Button
              onClick={() => setShowExportDialog(true)}
              disabled={exporting || filteredQuestions.length === 0}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-orange-900/20 hover:shadow-orange-500/20 transition-all duration-300 flex items-center gap-2 border-0 active:scale-95"
            >
              {exporting ? '⏳...' : (
                <>
                  <Trash2 size={18} className="rotate-180" />
                  <span>PDF EXPORT</span>
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
          language={language}
        />
      </main>

      <footer className="border-t border-white/5 py-12 mt-20 relative z-10">
        <div className="container mx-auto px-6 text-center text-zinc-600 text-[11px] font-bold uppercase tracking-[0.4em] font-[family-name:var(--font-outfit)]">
          NoteDiur Premium v1.0 • Built for Excellence
        </div>
      </footer>

      {/* Export Options Wizard */}
      <div className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ${showExportDialog ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => exportWizardStep !== 'generating' && setShowExportDialog(false)} />
        <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

          {exportWizardStep === 'options' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-xl font-bold text-white mb-4">PDF Dışa Aktar</h3>
              <p className="text-zinc-400 mb-6 font-medium">PDF dosyanızda soru çözümleri yer alsın mı?</p>

              <div className="flex flex-col gap-3 mb-8">
                <button
                  onClick={() => setIncludeSolutions(true)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${includeSolutions
                    ? 'bg-orange-500/10 border-orange-500/50 text-orange-500'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-800/80'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">✅</span>
                    <span className="font-semibold text-lg">Çözümler Olsun</span>
                  </div>
                  {includeSolutions && <span className="text-orange-500">●</span>}
                </button>
                <button
                  onClick={() => setIncludeSolutions(false)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${!includeSolutions
                    ? 'bg-zinc-500/10 border-zinc-500/50 text-zinc-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-800/80'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">❌</span>
                    <span className="font-semibold text-lg">Sadece Sorular</span>
                  </div>
                  {!includeSolutions && <span className="text-zinc-400">●</span>}
                </button>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setShowExportDialog(false)}
                  className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Vazgeç
                </Button>
                <Button
                  onClick={handleExportPDF}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold"
                >
                  PDF Oluştur
                </Button>
              </div>
            </div>
          )}

          {exportWizardStep === 'generating' && (
            <div className="py-12 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
              <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 border-4 border-orange-500/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">PDF Hazırlanıyor</h3>
              <p className="text-zinc-500 animate-pulse">Lütfen bekleyin...</p>
            </div>
          )}

          {exportWizardStep === 'preview' && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <h3 className="text-xl font-bold text-white mb-4">Önizleme Hazır</h3>

              <div className="relative aspect-[3/4] w-full bg-white rounded-xl mb-6 overflow-hidden border border-zinc-800 shadow-inner group">
                {pdfThumbnail && (
                  <img
                    src={pdfThumbnail}
                    alt="PDF Preview"
                    className="w-full h-full object-cover object-top"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-white text-sm font-semibold">
                    Belge Hazır
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setExportWizardStep('options')
                    setPdfPreviewUrl(null)
                    setPdfThumbnail(null)
                  }}
                  className="flex-1 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Geri
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center justify-center gap-2"
                >
                  <span>📂 İndir</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div >

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
        < div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
          {
            filteredQuestions.map((q, i) => (
              <div key={q.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                {/* Question Header */}
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
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15.5px', lineHeight: '1.6', color: '#111827', fontWeight: '500' }}>
                      <QuestionTextDisplay text={q.questionText} />
                    </div>
                  </div>
                </div>

                {/* Options Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px 20px',
                  paddingLeft: '40px',
                  marginBottom: (includeSolutions && q.solution) ? '15px' : '0'
                }}>
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <div key={opt} style={{ display: 'flex', gap: '8px', fontSize: '14.5px' }}>
                      <span style={{ fontWeight: 'bold', color: '#4b5563' }}>{opt})</span>
                      <QuestionTextDisplay text={q[`option${opt}` as keyof typeof q] as string} />
                    </div>
                  ))}
                </div>

                {/* Solution Block */}
                {includeSolutions && q.solution && (
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
                        q.solution.split('STEP_START').filter(Boolean).map((section, index) => {
                          const [title, ...contentParts] = section.split('STEP_END');
                          const content = contentParts.join('STEP_END');
                          return (
                            <div key={index} style={{ marginBottom: '4px' }}>
                              {title && (
                                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#ea580c', textTransform: 'uppercase', marginBottom: '2px' }}>
                                  {title.trim()}
                                </div>
                              )}
                              <div style={{ fontSize: '12.5px', color: '#374151', lineHeight: '1.4' }}>
                                <QuestionTextDisplay text={content.trim()} />
                              </div>
                            </div>
                          )
                        })
                      ) : q.solution.match(/(\d+\.\s*Adım|Adım\s*\d+)/i) ? (
                        q.solution.split(/(\d+\.\s*Adım:?|Adım\s*\d+:?)/gi).filter(Boolean).map((part, i, arr) => {
                          if (part.match(/(\d+\.\s*Adım:?|Adım\s*\d+:?)/i)) {
                            return (
                              <div key={i} style={{ marginBottom: '8px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#ea580c', textTransform: 'uppercase', marginBottom: '1px' }}>
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
                )}
              </div>
            ))
          }
        </div >

        {/* Answer Key Page */}
        < div style={{
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
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {filteredQuestions.map((q, i) => (
              <div key={q.id} style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                border: '1px solid #e5e7eb',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <span style={{ fontWeight: 'bold', color: '#6b7280' }}>{i + 1}.</span>
                <span style={{ fontWeight: 'bold', color: '#111827', fontSize: '16px' }}>{q.correctAnswer}</span>
              </div>
            ))}
          </div>
        </div >
      </div >
    </div >
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

