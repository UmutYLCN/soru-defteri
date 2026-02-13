import { NextResponse } from 'next/server'
import puppeteer from 'puppeteer'

export async function POST(req: Request) {
    try {
        const { html, title } = await req.json()

        if (!html) {
            return NextResponse.json({ error: 'HTML content is required' }, { status: 400 })
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()

        // Add KaTeX CSS and basic styles
        const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              background: white;
            }
            .print-area {
              display: block !important;
              padding: 15mm !important;
            }
            .pdf-section {
              break-inside: avoid;
              page-break-inside: avoid;
              margin-bottom: 20px;
            }
            .answer-key-section {
              page-break-before: always;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            /* Add any other essential styles here */
          </style>
        </head>
        <body>
          <div class="print-area">
            ${html}
          </div>
        </body>
      </html>
    `

        await page.setContent(fullHtml, { waitUntil: 'networkidle0' })

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                bottom: '10mm',
                left: '10mm',
                right: '10mm'
            }
        })

        const screenshot = await page.screenshot({
            type: 'jpeg',
            quality: 70,
            clip: { x: 0, y: 0, width: 800, height: 1000 } // Capture a decent portion for preview
        })

        await browser.close()

        return NextResponse.json({
            pdf: Buffer.from(pdfBuffer).toString('base64'),
            thumbnail: Buffer.from(screenshot).toString('base64')
        })

    } catch (error: any) {
        console.error('PDF Export Error:', error)
        return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 })
    }
}
