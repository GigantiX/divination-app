import type { ScheduleDocument, ScheduleTemplate } from './types'

type Theme = ScheduleDocument['theme']
type Preset = Pick<Theme, 'background' | 'card' | 'text' | 'accent' | 'buttonText' | 'radius' | 'font' | 'alignment' | 'shadow' | 'border' | 'buttonStyle'>

export const THEME_PRESETS: Record<ScheduleTemplate, Preset> = {
    classic: { background: '#040f2b', card: '#f5f7fc', text: '#08235f', accent: '#ff1616', buttonText: '#ffffff', radius: 4, font: 'sans', alignment: 'center', shadow: 'none', border: 'none', buttonStyle: 'solid' },
    minimal: { background: '#edf5f3', card: '#ffffff', text: '#143c35', accent: '#126b60', buttonText: '#ffffff', radius: 20, font: 'sans', alignment: 'left', shadow: 'soft', border: 'solid', buttonStyle: 'pill' },
    warm: { background: '#f3eadb', card: '#fffaf2', text: '#4b3026', accent: '#b44426', buttonText: '#ffffff', radius: 12, font: 'serif', alignment: 'center', shadow: 'soft', border: 'none', buttonStyle: 'solid' },
    ticket: { background: '#e8edef', card: '#ffffff', text: '#173b3e', accent: '#cb532b', buttonText: '#ffffff', radius: 18, font: 'sans', alignment: 'left', shadow: 'soft', border: 'none', buttonStyle: 'solid' },
    editorial: { background: '#f0eada', card: '#fffdf5', text: '#23271e', accent: '#586337', buttonText: '#ffffff', radius: 0, font: 'serif', alignment: 'left', shadow: 'none', border: 'solid', buttonStyle: 'outline' },
    spotlight: { background: '#101c30', card: '#1b2d47', text: '#f0f5ff', accent: '#c7f267', buttonText: '#172713', radius: 26, font: 'sans', alignment: 'center', shadow: 'bold', border: 'solid', buttonStyle: 'pill' },
    timeline: { background: '#f4f2ef', card: '#ffffff', text: '#302723', accent: '#985236', buttonText: '#ffffff', radius: 14, font: 'sans', alignment: 'left', shadow: 'none', border: 'solid', buttonStyle: 'solid' },
}

export const SCHEDULE_TEMPLATES: { id: ScheduleTemplate; name: string; description: string }[] = [
    { id: 'ticket', name: 'Boarding Pass', description: 'Tiket dengan tanggal besar dan garis perforasi.' },
    { id: 'editorial', name: 'The Editorial', description: 'Tipografi serif dan komposisi seperti majalah.' },
    { id: 'spotlight', name: 'Night Spotlight', description: 'Kartu malam dengan aksen cerah dan nomor kota.' },
    { id: 'timeline', name: 'City Journey', description: 'Sesi tersusun sebagai perjalanan waktu.' },
    { id: 'minimal', name: 'Studio Green', description: 'Ruang lega, detail halus, dan sentuhan hijau.' },
    { id: 'warm', name: 'Warm Paper', description: 'Palet hangat dengan karakter undangan cetak.' },
    { id: 'classic', name: 'Classic Bold', description: 'Judul tegas dan tombol merah seperti referensi awal.' },
]

export function applyTemplate(theme: Theme, preset: ScheduleTemplate): Theme {
    return { ...theme, ...THEME_PRESETS[preset], preset }
}
