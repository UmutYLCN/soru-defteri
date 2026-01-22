import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CSVRow {
    category: string
    question_text: string
    option_a: string
    option_b: string
    option_c: string
    option_d: string
    correct_answer: string
    solution: string
}

function parseCSV(csvText: string): CSVRow[] {
    // Strip BOM if exists
    const cleanCsvText = csvText.startsWith('\uFEFF') ? csvText.slice(1) : csvText
    const lines = cleanCsvText.trim().split('\n')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const rows: CSVRow[] = []

    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        if (values.length !== headers.length) continue

        const row: Record<string, string> = {}
        headers.forEach((header, index) => {
            row[header] = values[index]
        })

        rows.push({
            category: row['category'] || '',
            question_text: row['question_text'] || '',
            option_a: row['option_a'] || '',
            option_b: row['option_b'] || '',
            option_c: row['option_c'] || '',
            option_d: row['option_d'] || '',
            correct_answer: row['correct_answer'] || '',
            solution: row['solution'] || ''
        })
    }

    return rows
}

function parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const char = line[i]
        const nextChar = line[i + 1]

        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"'
            i++ // Skip next quote
        } else if (char === '"') {
            inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
        } else {
            current += char
        }
    }
    result.push(current.trim())

    return result
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'CSV file is required' }, { status: 400 })
        }

        const csvText = await file.text()
        const rows = parseCSV(csvText)

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 })
        }

        // Get or create categories
        const categoryNames = [...new Set(rows.map(r => r.category).filter(Boolean))]
        const categoryMap: Record<string, number> = {}

        for (const name of categoryNames) {
            let category = await prisma.category.findUnique({ where: { name } })
            if (!category) {
                category = await prisma.category.create({ data: { name } })
            }
            categoryMap[name] = category.id
        }

        // Create questions
        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]

            // Validate row
            if (!row.question_text || !row.option_a || !row.option_b || !row.option_c || !row.option_d) {
                errors.push(`Satır ${i + 2}: Eksik alan`)
                errorCount++
                continue
            }

            const correctAnswer = row.correct_answer.toUpperCase()
            if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
                errors.push(`Satır ${i + 2}: Geçersiz cevap "${row.correct_answer}"`)
                errorCount++
                continue
            }

            try {
                await prisma.question.create({
                    data: {
                        categoryId: row.category ? categoryMap[row.category] : null,
                        questionText: row.question_text,
                        optionA: row.option_a,
                        optionB: row.option_b,
                        optionC: row.option_c,
                        optionD: row.option_d,
                        correctAnswer,
                        solution: row.solution || null
                    }
                })
                successCount++
            } catch {
                errors.push(`Satır ${i + 2}: Veritabanı hatası`)
                errorCount++
            }
        }

        return NextResponse.json({
            success: true,
            imported: successCount,
            failed: errorCount,
            errors: errors.slice(0, 10) // First 10 errors
        })
    } catch (error) {
        console.error('Error importing CSV:', error)
        return NextResponse.json({ error: 'Failed to import CSV' }, { status: 500 })
    }
}
