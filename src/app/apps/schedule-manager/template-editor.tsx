'use client'

import { Check, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { applyTemplate, SCHEDULE_TEMPLATES, THEME_PRESETS } from '@/lib/schedules/templates'
import type { ScheduleDocument } from '@/lib/schedules/types'
import { Field, Select } from './schedule-form-fields'

type Theme = ScheduleDocument['theme']

export function TemplateEditor({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
    const selected = SCHEDULE_TEMPLATES.find(template => template.id === value.preset)!
    const change = <K extends keyof Theme>(key: K, next: Theme[K]) => onChange({ ...value, [key]: next })
    return <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-card p-4 md:p-5">
            <h2 className="text-base font-semibold">Pilih karakter jadwal Anda</h2>
            <p className="mb-5 mt-1 text-sm leading-6 text-muted-foreground">Setiap template memiliki susunan sendiri. Sesuaikan detailnya di bawah.</p>
            <div className="grid grid-cols-2 gap-3">
                {SCHEDULE_TEMPLATES.map(template => {
                    const preset = THEME_PRESETS[template.id]
                    const active = value.preset === template.id
                    return <button type="button" key={template.id} aria-pressed={active}
                        aria-label={`Pilih template ${template.name}`}
                        onClick={() => onChange(applyTemplate(value, template.id))}
                        className={`group overflow-hidden rounded-xl border-2 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${active ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40'}`}>
                        <div className="relative flex h-32 items-center justify-center overflow-hidden p-4" style={{ background: preset.background, color: preset.text }}>
                            <div className="relative w-full overflow-hidden px-3 py-3 shadow-sm" style={{ background: preset.card, borderRadius: preset.radius * .5, fontFamily: preset.font === 'serif' ? 'Georgia,serif' : undefined }}>
                                {template.id === 'ticket' && <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: preset.accent }} />}
                                <div className={`flex gap-2 ${template.id === 'editorial' ? 'flex-row-reverse justify-between' : ''}`}>
                                    {['ticket', 'editorial'].includes(template.id) && <div className="flex shrink-0 flex-col items-center justify-center rounded-md px-2 text-[8px] font-semibold" style={{ background: preset.accent, color: preset.buttonText }}><span className="text-xl leading-none">24</span><span>NOV</span></div>}
                                    <div className={`min-w-0 flex-1 ${preset.alignment === 'center' ? 'text-center' : ''}`}>
                                        {template.id === 'spotlight' && <p className="mb-1 text-[7px] uppercase tracking-[.2em]" style={{ color: preset.accent }}>SEMINAR / 01</p>}
                                        <p className="truncate text-[11px] font-bold">SURABAYA</p>
                                        <div className="mt-2 space-y-1.5">
                                            {[0, 1].map(index => <div key={index} className={`flex items-center gap-1.5 ${preset.alignment === 'center' ? 'justify-center' : ''}`}>
                                                {template.id === 'timeline' && <span className="h-1.5 w-1.5 rounded-full" style={{ background: preset.accent }} />}
                                                <span className="h-1 w-12 rounded-full opacity-20" style={{ background: preset.text }} />
                                            </div>)}
                                        </div>
                                        <div className={`mt-3 h-3 w-16 ${preset.alignment === 'center' ? 'mx-auto' : ''}`} style={{ background: preset.buttonStyle === 'outline' ? 'transparent' : preset.accent, border: `1px solid ${preset.accent}`, borderRadius: preset.buttonStyle === 'pill' ? 99 : 3 }} />
                                    </div>
                                </div>
                                {template.id === 'ticket' && <div className="mt-2 border-t border-dashed pt-1" style={{ borderColor: preset.text + '30' }}><span className="block h-1 w-16 rounded-full opacity-15" style={{ background: preset.text }} /></div>}
                            </div>
                            {active && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>}
                        </div>
                        <div className="p-3"><p className="text-sm font-semibold">{template.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{template.description}</p></div>
                    </button>
                })}
            </div>
        </section>

        <section aria-label={`Pengaturan template ${selected.name}`} className="space-y-5 rounded-2xl border border-primary/25 bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                <div><p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary"><SlidersHorizontal className="h-3.5 w-3.5" />Pengaturan template</p><h2 className="font-semibold">{selected.name}</h2></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(applyTemplate(value, value.preset))}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reset gaya</Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {([{ key: 'background', label: 'Latar section' }, { key: 'card', label: 'Latar kartu' }, { key: 'text', label: 'Teks' }, { key: 'accent', label: 'Aksen & tombol' }, { key: 'buttonText', label: 'Teks tombol' }] as const).map(item =>
                    <Field key={item.key} label={item.label}>
                        <input type="color" value={value[item.key]} onChange={event => change(item.key, event.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-input bg-background p-1" />
                    </Field>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Layout"><Select value={value.layout} onChange={next => change('layout', next as Theme['layout'])}><option value="stack">Kartu vertikal</option><option value="grid">Grid — 2 kolom di layar lebar</option></Select></Field>
                <Field label="Font widget"><Select value={value.font} onChange={next => change('font', next as Theme['font'])}><option value="sans">Sans</option><option value="rounded">Rounded</option><option value="serif">Serif</option></Select></Field>
                <Field label="Perataan teks"><Select value={value.alignment ?? 'center'} onChange={next => change('alignment', next as Theme['alignment'])}><option value="left">Kiri</option><option value="center">Tengah</option></Select></Field>
                <Field label="Gaya tombol"><Select value={value.buttonStyle ?? 'solid'} onChange={next => change('buttonStyle', next as Theme['buttonStyle'])}><option value="solid">Solid</option><option value="outline">Outline</option><option value="pill">Pill</option></Select></Field>
                <Field label="Garis kartu"><Select value={value.border ?? 'solid'} onChange={next => change('border', next as Theme['border'])}><option value="none">Tanpa garis</option><option value="solid">Garis tipis</option><option value="dashed">Putus-putus</option></Select></Field>
                <Field label="Bayangan kartu"><Select value={value.shadow ?? 'soft'} onChange={next => change('shadow', next as Theme['shadow'])}><option value="none">Tanpa bayangan</option><option value="soft">Halus</option><option value="bold">Tegas</option></Select></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
                <Field label="Radius (px)"><Input type="number" min={0} max={32} value={value.radius} onChange={event => change('radius', Number(event.target.value))} /></Field>
                <Field label="Jarak (px)"><Input type="number" min={12} max={64} value={value.gap} onChange={event => change('gap', Number(event.target.value))} /></Field>
                <Field label="Lebar maks. (px)"><Input type="number" min={360} max={1400} value={value.maxWidth} onChange={event => change('maxWidth', Number(event.target.value))} /></Field>
            </div>
        </section>
    </div>
}
