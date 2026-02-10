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
    <div className="min-h-screen bg-black selection:bg-orange-500/30 font-[family-name:var(--font-geist-sans)]">
      {/* Background Effects - Brand Loyal */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-5%] w-[30%] h-[30%] bg-zinc-800/10 blur-[100px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] brightness-100" />
      </div>

      {/* Premium Floating Header - Brand Colors */}
      <header className="fixed top-8 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-6xl">
        <div className="bg-zinc-950/80 border border-white/5 backdrop-blur-xl rounded-[28px] px-8 py-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4 group cursor-pointer">
              <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center relative shadow-[0_0_25px_rgba(249,115,22,0.15)] transition-all duration-300 group-hover:scale-105 group-hover:border-orange-500/30">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                  <path d="M10 10H30V30H10V10Z" stroke="#f97316" strokeWidth="2.5" />
                  <path d="M15 20C15 17.2386 17.2386 15 20 15C22.7614 15 25 17.2386 25 20C25 22.7614 22.7614 25 20 25C17.2386 25 15 27.2386 15 30H25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tighter">NoteDiur</h1>
            </div>

            <div className="hidden lg:flex items-center gap-6 border-l border-white/10 pl-8 ml-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] leading-none mb-1">Toplam Soru</span>
                <span className="text-lg text-orange-500 font-black leading-none">{questions.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] leading-none mb-1">Ders Sayısı</span>
                <span className="text-lg text-white font-black leading-none">{categories.length}</span>
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

            {/* User Profile Capsule */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300 ${showUserMenu
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                  : 'bg-white/[0.03] border-white/[0.08] text-zinc-400 hover:border-white/20 hover:text-white'
                  }`}
              >
                <User size={18} />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Admin</span>
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
      <main className="container mx-auto px-6 py-40 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
          {/* Left Action Group */}
          <div className="flex items-center gap-3">
            <QuestionForm categories={categories} onSuccess={() => fetchData()} />
            <AIGenerator categories={categories} onSuccess={() => fetchData()} />
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
          onVariantsGenerated={fetchData}
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
                    {/* Diagram in PDF */}
                    {(q.group?.imageUrl || q.imageUrl) && (
                      <div style={{ marginTop: '15px', marginBottom: '15px', textAlign: 'center' }}>
                        <img
                          src={q.group?.imageUrl || q.imageUrl || ''}
                          alt="Diagram"
                          style={{ maxWidth: '100%', maxHeight: '60mm', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                      </div>
                    )}
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

