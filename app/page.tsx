'use client'

import { useState, useEffect, useCallback } from 'react'
import katex from 'katex'
import { Button } from '@/components/ui/button'
import { QuestionForm } from '@/components/question-form'
import { QuestionTable } from '@/components/question-table'
import { CSVImport } from '@/components/csv-import'
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

  const fetchData = useCallback(async () => {
    try {
      const [questionsRes, categoriesRes] = await Promise.all([
        fetch('/api/questions'),
        fetch('/api/categories')
      ])

      const questionsData = await questionsRes.json()
      const categoriesData = await categoriesRes.json()

      setQuestions(questionsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])



  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setEditDialogOpen(true)
  }

  const handleExportPDF = async () => {
    setShowExportDialog(false)
    setExporting(true)
    try {
      const { jsPDF } = await import('jspdf')
      const { toCanvas } = await import('html-to-image')

      const element = document.getElementById('pdf-export-content')
      if (!element) return

      // Temporary show element to ensure it's captured correctly
      element.style.display = 'block'

      // Wait a bit for KaTeX to finish any potential layout shifts
      await new Promise(resolve => setTimeout(resolve, 100))

      const canvas = await toCanvas(element, {
        backgroundColor: '#ffffff',
        width: element.offsetWidth,
        height: element.offsetHeight,
        style: {
          display: 'block'
        }
      })

      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      // Handle multi-page if content is longer than A4
      let heightLeft = pdfHeight
      let position = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      pdf.save('sorular.pdf')
      element.style.display = 'none'
      setExporting(false)
    } catch (error) {
      console.error('Error exporting PDF:', error)
      setExporting(false)
    }
  }

  const filteredQuestions = selectedCategory === 'all'
    ? questions
    : questions.filter(q => q.category?.id.toString() === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Soru Defteri</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-zinc-400">
                <span className="text-emerald-400 font-semibold">{questions.length}</span> soru
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <QuestionForm categories={categories} onSuccess={fetchData} />
          <AIGenerator categories={categories} onSuccess={fetchData} />
          <CSVImport onSuccess={fetchData} />
          <Button
            variant="ghost"
            onClick={async () => {
              if (confirm('Veritabanını kontrol edip hataları otomatik düzeltmek istiyor musunuz?')) {
                const res = await fetch('/api/db-check', { method: 'POST' })
                const data = await res.json()
                if (data.success) {
                  alert(`Düzeltme tamamlandı!\nSilinen geçersiz soru: ${data.fixed.invalid}\nSilinen kopya soru: ${data.fixed.duplicates}`)
                  fetchData()
                }
              }
            }}
            className="text-zinc-500 hover:text-white hover:bg-zinc-800"
            title="Veritabanı Sağlık Kontrolü"
          >
            🛡️ Kontrol Et
          </Button>

          <div className="flex-1" />

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px] bg-zinc-800 border-zinc-700 text-white">
              <SelectValue placeholder="Kategori filtrele" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              <SelectItem value="all" className="text-white hover:bg-zinc-700">
                Tüm Kategoriler
              </SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()} className="text-white hover:bg-zinc-700">
                  {cat.name} ({cat._count?.questions || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export PDF Button - Now opens dialog */}
          <Button
            onClick={() => setShowExportDialog(true)}
            disabled={exporting || filteredQuestions.length === 0}
            className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {exporting ? '⏳ Oluşturuluyor...' : '📄 PDF İndir'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="text-3xl font-bold text-emerald-400">{questions.length}</div>
            <div className="text-zinc-400 text-sm mt-1">Toplam Soru</div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20">
            <div className="text-3xl font-bold text-blue-400">{categories.length}</div>
            <div className="text-zinc-400 text-sm mt-1">Kategori</div>
          </div>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="text-3xl font-bold text-purple-400">{filteredQuestions.length}</div>
            <div className="text-zinc-400 text-sm mt-1">Görüntülenen</div>
          </div>
        </div>

        {/* Questions Table */}
        <QuestionTable
          questions={filteredQuestions}
          onEdit={handleEdit}
          onDelete={fetchData}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 mt-12">
        <div className="container mx-auto px-6 text-center text-zinc-500 text-sm">
          Soru Defteri © 2024 - Tüm hakları saklıdır
        </div>
      </footer>

      {/* Export Options Dialog */}
      <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${showExportDialog ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowExportDialog(false)} />
        <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4">PDF Dışa Aktar</h3>
          <p className="text-zinc-400 mb-6 font-medium">PDF dosyanızda soru çözümleri yer alsın mı?</p>

          <div className="flex flex-col gap-3 mb-8">
            <button
              onClick={() => setIncludeSolutions(true)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${includeSolutions
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-800/80'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <span className="font-semibold text-lg">Çözümler Olsun</span>
              </div>
              {includeSolutions && <span className="text-emerald-500">●</span>}
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
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
            >
              PDF Oluştur
            </Button>
          </div>
        </div>
      </div>

      {/* Edit Question Dialog */}
      <EditQuestionDialog
        question={editingQuestion}
        categories={categories}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={fetchData}
      />

      {/* Hidden PDF Export Content */}
      <div
        id="pdf-export-content"
        style={{
          display: 'none',
          width: '210mm',
          backgroundColor: 'white',
          color: 'black',
          padding: '20mm',
          fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        {/* PDF Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '20px'
        }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#111827' }}>SORU DEFTERİ</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              {selectedCategory !== 'all' ? categories.find(c => c.id.toString() === selectedCategory)?.name : 'Tüm Kategoriler'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>{filteredQuestions.length} Soru</div>
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date().toLocaleDateString('tr-TR')}</div>
          </div>
        </div>

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
          {filteredQuestions.map((q, i) => (
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
                  borderLeft: '3px solid #10b981',
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
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', marginBottom: '2px' }}>
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
                              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#059669', textTransform: 'uppercase', marginBottom: '1px' }}>
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
          ))}
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
        </div>
      </div>
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

