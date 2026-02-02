import { useState, useEffect, useCallback } from 'react'

const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+'

export default function TextScramble({ text, className = '', delay = 0 }) {
    const [displayText, setDisplayText] = useState('')

    const scramble = useCallback(() => {
        let iteration = 0
        let interval = null

        clearInterval(interval)

        interval = setInterval(() => {
            setDisplayText(
                text
                    .split('')
                    .map((char, index) => {
                        if (index < iteration) {
                            return text[index]
                        }
                        return chars[Math.floor(Math.random() * chars.length)]
                    })
                    .join('')
            )

            if (iteration >= text.length) {
                clearInterval(interval)
            }

            iteration += 1 / 3
        }, 30)
    }, [text])

    useEffect(() => {
        const timeout = setTimeout(() => {
            scramble()
        }, delay * 1000)

        return () => clearTimeout(timeout)
    }, [scramble, delay])

    return (
        <span className={className}>
            {displayText}
        </span>
    )
}
