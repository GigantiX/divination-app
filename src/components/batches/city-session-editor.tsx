"use client"

import * as React from "react"
import { MapPin, Plus, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { indonesiaRegionSuggestions } from "@/lib/indonesia-regions"

const MAX_SESSIONS = 30
const MAX_SESSION_NAME_LENGTH = 100

function normalize(value: string) {
    return value.trim().replace(/\s+/g, " ")
}

function searchText(value: string) {
    return value.toLocaleLowerCase("id-ID")
}

interface CitySessionEditorProps {
    value: string[]
    onChange: (sessions: string[]) => void
    disabled?: boolean
}

export function CitySessionEditor({ value, onChange, disabled = false }: CitySessionEditorProps) {
    const [draft, setDraft] = React.useState("")
    const [message, setMessage] = React.useState("")
    const [isFocused, setIsFocused] = React.useState(false)

    const suggestions = React.useMemo(() => {
        const query = searchText(normalize(draft))
        if (query.length < 2) return []

        return indonesiaRegionSuggestions
            .filter((item) => searchText(`${item.value} ${item.detail}`).includes(query))
            .slice(0, 8)
    }, [draft])

    const addSession = () => {
        const session = normalize(draft)
        if (!session) return

        if (session.length > MAX_SESSION_NAME_LENGTH) {
            setMessage(`Kota/Sesi maksimal ${MAX_SESSION_NAME_LENGTH} karakter.`)
            return
        }

        if (value.length >= MAX_SESSIONS) {
            setMessage(`Maksimal ${MAX_SESSIONS} Kota/Sesi dalam satu batch.`)
            return
        }

        if (value.some((item) => searchText(item) === searchText(session))) {
            setMessage("Kota/Sesi ini sudah ditambahkan.")
            return
        }

        onChange([...value, session])
        setDraft("")
        setMessage("")
    }

    return (
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
            <div>
                <Label htmlFor="city-session" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Kota/Sesi <span className="font-normal text-muted-foreground">(Opsional)</span>
                </Label>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Tambahkan kota, kabupaten, provinsi, atau nama sesi sendiri. Laporan akan memilih salah satu dari daftar ini.
                </p>
            </div>

            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="city-session"
                            value={draft}
                            onChange={(event) => {
                                setDraft(event.target.value)
                                setMessage("")
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => window.setTimeout(() => setIsFocused(false), 120)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault()
                                    addSession()
                                }
                            }}
                            placeholder="Contoh: Kota Bandung atau Sesi Pagi"
                            maxLength={MAX_SESSION_NAME_LENGTH}
                            autoComplete="off"
                            disabled={disabled}
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded={isFocused && suggestions.length > 0}
                            aria-controls="indonesia-region-suggestions"
                            className="h-12 pl-10"
                        />
                    </div>
                    <Button type="button" onClick={addSession} disabled={disabled || !normalize(draft)} className="h-12 shrink-0">
                        <Plus className="mr-1 h-4 w-4" />
                        Tambahkan
                    </Button>
                </div>

                {isFocused && suggestions.length > 0 && (
                    <div id="indonesia-region-suggestions" role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-lg">
                        {suggestions.map((suggestion) => (
                            <button
                                key={`${suggestion.detail}-${suggestion.value}`}
                                type="button"
                                role="option"
                                aria-selected={suggestion.value === normalize(draft)}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    setDraft(suggestion.value)
                                    setMessage("")
                                    setIsFocused(false)
                                }}
                                className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-accent"
                            >
                                <span className="text-sm font-medium text-foreground">{suggestion.value}</span>
                                <span className="text-xs text-muted-foreground">{suggestion.detail}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {message && <p className="text-xs text-destructive" role="status">{message}</p>}

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2" aria-label="Kota/Sesi yang ditambahkan">
                    {value.map((session) => (
                        <span key={session} className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/15 py-1 pl-3 pr-1 text-sm font-medium text-primary">
                            <span className="truncate">{session}</span>
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((item) => item !== session))}
                                disabled={disabled}
                                aria-label={`Hapus ${session}`}
                                className="rounded-full p-1 hover:bg-primary/15 disabled:cursor-not-allowed"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
