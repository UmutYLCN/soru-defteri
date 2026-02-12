'use client'

import React from 'react'
import { InlineMath, BlockMath } from 'react-katex'

interface MathTextProps {
    text: string
    className?: string
}

export function MathText({ text, className }: MathTextProps) {
    if (!text) return null

    // Pre-process: normalize text
    let processedText = text.replace(/\\\$/g, '$')
    // Convert literal \n to actual newlines
    processedText = processedText.replace(/\\n/g, '\n')
    // Handle 'ext' common mistake/alias
    processedText = processedText.replace(/\\ext\b/g, '\\text')
    processedText = processedText.replace(/(\d+)ext([a-zA-Z/]+)/g, '$1\\text{$2}')
    processedText = processedText.replace(/ext\{/g, '\\text{')

    // If the text has no $ delimiters at all but contains LaTeX commands, wrap them
    if (!processedText.includes('$') && !processedText.includes('\\(') && !processedText.includes('\\[')) {
        const latexPattern = /\\(?:frac|sqrt|sum|prod|int|lim|vec|hat|bar|dot|ddot|overline|underline|mathbf|mathrm|text|ext|left|right|cdot|times|div|pm|mp|leq|geq|neq|approx|equiv|sim|propto|infty|partial|nabla|alpha|beta|gamma|delta|epsilon|varepsilon|zeta|eta|theta|vartheta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|varphi|chi|psi|omega|Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)\b/
        if (latexPattern.test(processedText)) {
            // Wrap contiguous LaTeX segments (commands + braces + operators)
            processedText = processedText.replace(
                /((?:\\[a-zA-Z]+(?:\{[^}]*\})*(?:\s*[_^]\s*(?:\{[^}]*\}|[a-zA-Z0-9]))*(?:\s*(?:[_^]\s*(?:\{[^}]*\}|[a-zA-Z0-9])|\\[a-zA-Z]+(?:\{[^}]*\})*|[+\-*/=<>]|\{[^}]*\}))*)+)/g,
                (match) => {
                    if (match.includes('STEP_START') || match.includes('STEP_END')) return match
                    return `$${match.trim()}$`
                }
            )
        }
    }

    // Match $$...$$, $...$, \[...\], or \(...\)
    const parts = processedText.split(/(\$\$[\s\S]*?\$\$|\$.*?\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g)

    return (
        <span className={className}>
            {parts.map((part, index) => {
                if ((part.startsWith('$$') && part.endsWith('$$')) ||
                    (part.startsWith('\\[') && part.endsWith('\\]'))) {
                    const math = part.startsWith('$$') ? part.slice(2, -2) : part.slice(2, -2)
                    return <BlockMath key={index} math={math} />
                } else if ((part.startsWith('$') && part.endsWith('$')) ||
                    (part.startsWith('\\(') && part.endsWith('\\)'))) {
                    const math = part.startsWith('$') ? part.slice(1, -1) : part.slice(2, -2)
                    return <InlineMath key={index} math={math} />
                }
                // Split plain text by newlines and insert <br/> for line breaks
                const lines = part.split('\n')
                return <span key={index}>{lines.map((line, li) => (
                    <React.Fragment key={li}>
                        {li > 0 && <br />}
                        {line}
                    </React.Fragment>
                ))}</span>
            })}
        </span>
    )
}
