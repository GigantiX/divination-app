import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"

const sourceRoot = join(process.cwd(), "src")
const ignoredFile = /\.test\.[jt]sx?$/

const suspiciousPatterns = [
    /(?:bg|text|border|ring|fill|stroke|from|to|via|shadow)-(?:white|black|gray|slate|zinc|neutral|blue|red|green|yellow|amber|orange|sky|indigo|violet|purple|pink|emerald|teal|cyan)(?:-\d{2,3})?(?:\/\d+)?/g,
    /(?:bg|text|border|ring)-\[#[0-9a-fA-F]{3,8}\]/g,
    /(?:bg|text|border|ring)-\[(?:rgb|hsl)a?\([^\]]+\)\]/g,
    /style\s*=\s*\{\{[^}]*\b(?:color|backgroundColor|borderColor)\s*:/g,
    /\b(?:color|backgroundColor|borderColor)\s*:\s*["'](?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/g,
    /\b(?:fill|stroke)\s*=\s*["'](?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/g,
    /\b(?:fill|stroke)\s*:\s*["']?(?:#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/g,
]

const allowlist = {
    "components/ui/role-badge.tsx": [
        /(?:from|to|shadow)-(?:purple|indigo|blue|cyan|emerald|teal)-\d{3}(?:\/\d+)?/,
        /text-white/,
    ],
}

function walk(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) return walk(path)
        return entry.isFile() && /\.(?:css|[jt]sx?)$/.test(entry.name) ? [path] : []
    })
}

const findings = []

for (const file of walk(sourceRoot)) {
    if (ignoredFile.test(file)) continue

    const relativePath = relative(sourceRoot, file)
    const content = readFileSync(file, "utf8")
    const allowedPatterns = allowlist[relativePath] ?? []

    for (const pattern of suspiciousPatterns) {
        for (const match of content.matchAll(pattern)) {
            if (allowedPatterns.some((allowed) => allowed.test(match[0]))) continue

            const line = content.slice(0, match.index).split("\n").length
            findings.push(`${relativePath}:${line}  ${match[0]}`)
        }
    }
}

if (findings.length > 0) {
    console.error("Theme audit found non-semantic UI colors:\n")
    console.error(findings.join("\n"))
    console.error("\nUse semantic Tailwind tokens or add a narrowly documented allowlist entry.")
    process.exitCode = 1
} else {
    console.log("Theme audit passed: structural UI colors use semantic tokens.")
}
