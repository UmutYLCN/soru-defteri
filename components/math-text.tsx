'use client'

import React from 'react'
import { InlineMath, BlockMath } from 'react-katex'

interface MathTextProps {
    text: string
    className?: string
}

export function MathText({ text, className }: MathTextProps) {
    if (!text) return null

    // Split text by $$...$$ first, then by $...$
    // This is a simple parser for demo purposes. 
    // For more complex cases, a library like markdown-it-katex is better.

    const normalizedText = text.replace(/\\\$/g, '$')
    // Match $$...$$, $...$, \[...\], or \(...\)
    const parts = normalizedText.split(/(\$\$[\s\S]*?\$\$|\$.*?\$|\\\[[\s\S]*?\\\]|\\\(.*?\\\))/g)

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
                return <span key={index}>{part}</span>
            })}
        </span>
    )
}
