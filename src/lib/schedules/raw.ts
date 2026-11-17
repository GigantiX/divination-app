import type { ScheduleDocument } from './types'

/** Serialize untrusted content inside a script data block without ending the block. */
function scriptJson(value: unknown): string {
    return JSON.stringify(value, null, 2).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
}

/** The renderer is copied at generation time; viewing the result never fetches Divination. */
export function rawScheduleHtml(doc: ScheduleDocument, renderer: string, scheduleId: string, cityId = ''): string {
    const marker = 'var rawScheduleToken = null // RAW_SCHEDULE_TOKEN'
    if (!renderer.includes(marker) || !/^[a-f0-9-]{36}$/i.test(scheduleId) || (cityId && !/^[a-f0-9-]{36}$/i.test(cityId))) throw new Error('Renderer jadwal tidak tersedia. Muat ulang halaman dan coba lagi.')
    // A literal closing tag in JavaScript would otherwise end the embedded script in HTML.
    const safeRenderer = renderer.replace(marker, `var rawScheduleToken = '${scheduleId}' // RAW_SCHEDULE_TOKEN`).replace(/<\/script/gi, '<\\/script')
    return `<!-- Salinan mandiri. Untuk tiap sesi, ubah "status": "open" menjadi "sold_out" atau sebaliknya. -->
<div data-divination-raw-host="${scheduleId}" data-schedule-key="${scheduleId}"${cityId ? ` data-city="${cityId}"` : ''}>
<textarea hidden data-schedule-data style="display:none!important">
${scriptJson(doc)}
</textarea>
<p>Jadwal sedang dimuat. Jika tidak tampil, muat ulang halaman atau hubungi penyelenggara.</p>
</div>
<script data-divination-raw style="display:none!important">
${safeRenderer}
</script>`
}
