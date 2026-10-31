/* Divination Schedule Widget v2. Native DOM + Shadow DOM; no framework required. */
;(function () {
    'use strict'
    if (window.DivinationSchedules) { window.DivinationSchedules.scan(); return }
    var scriptUrl = document.currentScript && document.currentScript.src
    var origin = scriptUrl ? new URL(scriptUrl).origin : window.location.origin
    var mounts = new WeakMap()
    var initialized = new WeakSet()
    var liveHosts = new Set()
    var volatileTimers = new Map()
    var lottiePromise
    var trackingKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'fbclid', 'gclid', 'msclkid', 'fbp', 'fbc']
    var offsets = { 'Asia/Jakarta': '+07:00', 'Asia/Makassar': '+08:00', 'Asia/Jayapura': '+09:00' }
    var zones = { 'Asia/Jakarta': 'WIB', 'Asia/Makassar': 'WITA', 'Asia/Jayapura': 'WIT' }
    var css = `
        :host{display:block;min-width:0;isolation:isolate;color-scheme:light}
        *,*::before,*::after{box-sizing:border-box} .widget{container-type:inline-size;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:16px;line-height:1.5;padding:clamp(18px,4%,40px);overflow-wrap:anywhere}
        .inner{max-width:var(--width);margin:auto}h2,h3,p{margin:0} .heading{text-align:center;margin-bottom:28px}.heading h2{font-size:clamp(24px,5cqi,38px);font-weight:800;line-height:1.2}.heading p{margin-top:10px;opacity:.82}
        .cities{display:grid;grid-template-columns:minmax(0,1fr);gap:var(--gap)}.city{min-width:0;background:var(--card);border-radius:var(--radius);padding:clamp(20px,5cqi,36px);text-align:center;box-shadow:0 2px 12px #0000000a;border:1px solid #0000000b}.city h3{font-size:clamp(25px,5cqi,36px);font-weight:850;line-height:1.2;margin-bottom:22px}
        .session+.session{border-top:1px solid #80808038;margin-top:26px;padding-top:26px}.session-name{font-size:13px;text-transform:uppercase;letter-spacing:.12em;font-weight:750;margin-bottom:8px;opacity:.75}.date{font-size:clamp(18px,3.9cqi,25px);font-weight:700}.time{font-size:clamp(18px,3.9cqi,25px);font-weight:650;margin:3px 0 14px}.venue{font-size:clamp(18px,3.7cqi,24px);font-weight:750}.address{font-size:15px;margin:6px 0 0;opacity:.85}
        .cta{display:inline-flex;justify-content:center;align-items:center;min-height:54px;max-width:100%;padding:13px 26px;background:var(--accent);color:var(--button);border:0;border-radius:max(6px,var(--radius));font:700 17px/1.35 var(--font);text-decoration:none;cursor:pointer;margin-top:22px;box-shadow:0 5px 12px #00000020;transition:transform .18s,filter .18s;white-space:normal;word-break:break-word}.cta:hover{transform:translateY(-2px);filter:brightness(1.06)}.cta:focus-visible{outline:3px solid var(--ink);outline-offset:4px}.cta:disabled{background:#5d626b;color:#fff;cursor:default;box-shadow:none;transform:none;filter:none}.pulse{animation:dv-pulse 2s ease-in-out infinite}
        .timer{background:var(--card);color:var(--ink);border:1px solid #80808033;border-radius:max(6px,var(--radius));padding:16px;text-align:center;margin:0 0 24px}.session .timer{margin:18px 0 0;padding:12px}.timer-label{font-size:13px;font-weight:600}.digits{display:block;font-variant-numeric:tabular-nums;font-weight:800;letter-spacing:.04em;font-size:clamp(25px,5cqi,34px);margin-top:4px}.expired{font-size:14px;font-weight:650}.seats{max-width:320px;margin:18px auto 0;font-size:14px;font-weight:650}.meter{height:7px;overflow:hidden;background:#80808030;border-radius:9px;margin-top:8px}.meter span{display:block;height:100%;background:var(--accent);border-radius:9px}.empty{text-align:center;padding:32px 16px;background:var(--card);color:var(--ink);border-radius:var(--radius)}
        .arrows{display:flex;align-items:center;justify-content:center;gap:clamp(8px,3%,32px);margin:0 0 24px;overflow:hidden}.arrow{color:var(--accent);animation:dv-arrow 1.2s ease-in-out infinite;flex:0 1 auto;max-width:22%;height:auto}.animation{display:flex;justify-content:center;align-items:center;gap:12px;margin-bottom:24px;overflow:hidden}.animation-item{flex:0 1 auto;max-width:45%;aspect-ratio:1}.animation-item img{display:block;max-width:100%;height:100%;object-fit:contain}.animation-error{font-size:12px;text-align:center;opacity:.7}
        .loading{font:15px/1.5 system-ui,sans-serif;text-align:center;padding:28px;color:#334155;background:#f8fafc;border-radius:8px}.retry{font:inherit;display:block;margin:12px auto 0;border:1px solid #94a3b8;border-radius:6px;background:#fff;padding:8px 16px;cursor:pointer}
        .cta[aria-disabled="true"]{background:#5d626b;color:#fff;cursor:default;box-shadow:none;transform:none;filter:none}
        @container (min-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.grid .city{padding:28px 22px}.grid .city h3{font-size:28px}.grid .date,.grid .time{font-size:21px}.grid .venue{font-size:20px}}
        @keyframes dv-arrow{0%,100%{transform:translateY(-5px);opacity:.6}50%{transform:translateY(6px);opacity:1}}@keyframes dv-pulse{0%,100%{box-shadow:0 0 0 0 #ff000000}50%{box-shadow:0 0 0 7px #ff000020}}
        .city{position:relative;text-align:var(--align,center);border-style:var(--border-style,solid);box-shadow:var(--card-shadow,0 2px 12px #0000000a)}.city-header{margin-bottom:22px}.city-header h3{margin-bottom:0}.city-index,.city-kicker,.date-stamp{display:none}.session-body{min-width:0}.city-prefix{display:inline}.city-title{min-width:0}.cta{border:2px solid transparent;border-radius:var(--cta-radius,max(6px,var(--radius)))}
        .widget[data-button="outline"] .cta:not(:disabled):not([aria-disabled="true"]){background:transparent;color:var(--accent);border-color:var(--accent);box-shadow:none}
        .widget[data-template="ticket"] .city{overflow:hidden;border-top:6px solid var(--accent)}.widget[data-template="ticket"] .city-header{border-bottom:1px dashed currentColor;padding-bottom:20px}.widget[data-template="ticket"] .city-prefix{display:block;font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.65;margin-bottom:5px}.widget[data-template="ticket"] .city h3{font-size:clamp(24px,5cqi,32px)}.widget[data-template="ticket"] .city::after{content:"";position:absolute;top:112px;left:-10px;width:20px;height:20px;border-radius:50%;background:var(--bg)}
        .widget[data-template="ticket"] .session,.widget[data-template="editorial"] .session{display:grid;grid-template-columns:58px minmax(0,1fr);gap:18px}.widget[data-template="ticket"] .date-stamp,.widget[data-template="editorial"] .date-stamp{display:flex;flex-direction:column;align-items:center;justify-content:center;align-self:start;border:1px solid currentColor;border-radius:10px;padding:12px 4px;color:var(--accent);font-size:11px;font-weight:700;letter-spacing:.08em}.date-stamp strong{font-size:32px;line-height:1.1;letter-spacing:-.05em}.date-stamp span{margin-top:4px}.widget[data-template="ticket"] .date,.widget[data-template="editorial"] .date{font-size:16px}.widget[data-template="ticket"] .time,.widget[data-template="editorial"] .time{font-size:19px}.widget[data-template="ticket"] .venue,.widget[data-template="editorial"] .venue{font-size:18px}.widget[data-template="ticket"] .cta{width:100%;font-size:15px}.widget[data-template="ticket"] .session+.session{border-top-style:dashed}
        .widget[data-template="editorial"] .city-header{padding-bottom:24px;border-bottom:3px double currentColor}.widget[data-template="editorial"] .city-prefix{display:block;font-family:Verdana,sans-serif;text-transform:uppercase;font-size:10px;letter-spacing:.25em;margin-bottom:12px}.widget[data-template="editorial"] .city h3{font-size:clamp(30px,6cqi,48px);font-weight:500;letter-spacing:-.045em}.widget[data-template="editorial"] .date-stamp{border-radius:0;border-width:0 0 2px;padding-top:0}.widget[data-template="editorial"] .date-stamp strong{font-size:42px;font-weight:400}.widget[data-template="editorial"] .session-name{letter-spacing:.17em;font-size:10px}.widget[data-template="editorial"] .cta{font-family:Verdana,sans-serif;text-transform:uppercase;letter-spacing:.08em;font-size:12px;min-height:46px;padding:10px 18px}
        .widget[data-template="spotlight"] .city{overflow:hidden}.widget[data-template="spotlight"] .city-header{display:flex;align-items:center;gap:20px;padding-bottom:24px;border-bottom:1px solid #80808040}.widget[data-template="spotlight"] .city-index{display:block;font-size:64px;font-weight:900;letter-spacing:-.08em;line-height:1;color:transparent;-webkit-text-stroke:1px var(--accent);opacity:.8;flex-shrink:0}.widget[data-template="spotlight"] .city-kicker{display:block;margin-bottom:8px;color:var(--accent);font-size:10px;letter-spacing:.23em}.widget[data-template="spotlight"] .city-prefix{display:none}.widget[data-template="spotlight"] h3{font-size:clamp(24px,5cqi,34px);letter-spacing:-.04em}.widget[data-template="spotlight"] .session-name{display:inline-block;color:var(--accent);border:1px solid currentColor;border-radius:99px;padding:4px 12px;font-size:10px}.widget[data-template="spotlight"] .date{margin-top:10px}.widget[data-template="spotlight"] .cta{width:100%}
        .widget[data-template="timeline"] .city-header{border-bottom:1px solid #80808030;padding-bottom:20px}.widget[data-template="timeline"] .city-prefix{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.2em;margin-bottom:6px;color:var(--accent)}.widget[data-template="timeline"] h3{font-size:clamp(26px,5cqi,36px);letter-spacing:-.045em}.widget[data-template="timeline"] .session{position:relative;padding-left:26px;border-left:2px solid var(--accent);padding-bottom:8px}.widget[data-template="timeline"] .session::before{content:"";position:absolute;left:-7px;top:6px;width:12px;height:12px;border:3px solid var(--accent);border-radius:50%;background:var(--card)}.widget[data-template="timeline"] .session+.session{border-top:0;margin-top:0;padding-top:32px}.widget[data-template="timeline"] .session+.session::before{top:38px}.widget[data-template="timeline"] .date{font-size:20px}.widget[data-template="timeline"] .time{font-size:18px;font-weight:500}.widget[data-template="timeline"] .venue{font-size:19px}.widget[data-template="timeline"] .session-name{color:var(--accent);font-size:10px}
        .widget[data-template="minimal"] .city-header{border-left:4px solid var(--accent);padding-left:18px}.widget[data-template="minimal"] h3{font-size:30px;letter-spacing:-.05em}.widget[data-template="minimal"] .city-prefix{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.2em;opacity:.6;margin-bottom:6px}.widget[data-template="minimal"] .date{font-size:20px}.widget[data-template="minimal"] .time{font-size:19px;font-weight:500}.widget[data-template="warm"] .city-header{padding:12px 0 22px;border-bottom:1px solid #80808030}.widget[data-template="warm"] .city-prefix{display:block;font-size:14px;font-style:italic;font-weight:400;margin-bottom:6px}.widget[data-template="warm"] h3{font-size:36px;font-weight:500}.widget[data-template="warm"] .date{font-size:22px;font-weight:400}
        @container(max-width:380px){.widget[data-template="ticket"] .session,.widget[data-template="editorial"] .session{grid-template-columns:42px minmax(0,1fr);gap:12px}.widget[data-template="ticket"] .date-stamp strong{font-size:27px}.widget[data-template="spotlight"] .city-header{gap:14px}.widget[data-template="spotlight"] .city-index{font-size:46px}.widget[data-template="ticket"] .cta{padding:12px 10px}}
        @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}}`

    function element(tag, className, text) {
        var node = document.createElement(tag)
        if (className) node.className = className
        if (text !== undefined) node.textContent = text
        return node
    }
    function shadow(host) {
        var root = host.shadowRoot || host.attachShadow({ mode: 'open' })
        root.replaceChildren()
        var style = element('style'); style.textContent = css; root.append(style)
        return root
    }
    function safeUrl(value) {
        try { var url = new URL(value); return /^(https?:)$/.test(url.protocol) && !url.username && !url.password ? url.toString() : '' } catch { return '' }
    }
    function buildTrackedUrl(destination, search, cookies) {
        try {
            var url = new URL(destination)
            if (!/^(https?:)$/.test(url.protocol)) return ''
            var incoming = new URLSearchParams(search)
            trackingKeys.forEach(function (key) { var value = incoming.get(key); if (value) url.searchParams.set(key, value) })
            ;['fbp', 'fbc'].forEach(function (key) {
                if (incoming.get(key)) return
                var found = (cookies || '').split(';').map(function (part) { return part.trim() }).find(function (part) { return part.indexOf(key + '=') === 0 || part.indexOf('_' + key + '=') === 0 })
                if (found) {
                    var value = found.slice(found.indexOf('=') + 1)
                    try { value = decodeURIComponent(value) } catch { /* Keep malformed cookie values encoded by URLSearchParams. */ }
                    url.searchParams.set(key, value)
                }
            })
            return url.toString()
        } catch { return '' }
    }
    function cookieString() { try { return document.cookie } catch { return '' } }
    function sessionEnd(session) { return Date.parse(session.date + 'T' + (session.endTime || '23:59') + ':59' + (offsets[session.timezone] || '+07:00')) }
    function dateLabel(value) {
        if (!value) return 'Tanggal belum diisi'
        var date = new Date(value + 'T12:00:00Z')
        return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date) : 'Tanggal belum diisi'
    }
    function template(value, city, session, remaining) {
        return String(value || '').replace(/\{city\}/g, city || '').replace(/\{session\}/g, session || '').replace(/\{remaining\}/g, String(remaining === undefined ? '' : remaining))
    }
    function loadLottie() {
        if (window.lottie) return Promise.resolve(window.lottie)
        if (!lottiePromise) lottiePromise = new Promise(function (resolve, reject) {
            var script = document.createElement('script')
            // Light player omits expression evaluation. Loaded only for an enabled Lottie asset.
            script.src = 'https://cdn.jsdelivr.net/npm/lottie-web@5.13.0/build/player/lottie_light.min.js'
            script.async = true
            var timeout = setTimeout(function () { reject(new Error('Animation timeout')) }, 12000)
            script.onload = function () { clearTimeout(timeout); if (window.lottie) resolve(window.lottie); else reject(new Error('Animation unavailable')) }
            script.onerror = function () { clearTimeout(timeout); reject(new Error('Animation unavailable')) }
            document.head.append(script)
        }).catch(function (error) { lottiePromise = null; throw error })
        return lottiePromise
    }

    function render(host, doc, options) {
        options = options || {}
        if (mounts.has(host)) mounts.get(host)()
        liveHosts.add(host)
        var disposed = false, intervals = [], animations = [], timerChecks = [], buttons = []
        var root = shadow(host), widget = element('section', 'widget'), inner = element('div', 'inner')
        var theme = doc.theme
        widget.dataset.template = theme.preset || 'classic'
        widget.dataset.button = theme.buttonStyle || 'solid'
        var shadows = { none: 'none', soft: '0 8px 28px #0000000d', bold: '0 18px 44px #00000030' }
        widget.style.setProperty('--align', theme.alignment || 'center')
        widget.style.setProperty('--border-style', theme.border || 'solid')
        widget.style.setProperty('--card-shadow', shadows[theme.shadow] || shadows.soft)
        if (theme.buttonStyle === 'pill') widget.style.setProperty('--cta-radius', '99px')

        var fonts = { sans: '"Trebuchet MS",Verdana,sans-serif', serif: 'Georgia,"Times New Roman",serif', rounded: '"Arial Rounded MT Bold","Trebuchet MS",sans-serif' }
        Object.entries({ '--bg': theme.background, '--card': theme.card, '--ink': theme.text, '--accent': theme.accent, '--button': theme.buttonText, '--radius': theme.radius + 'px', '--gap': theme.gap + 'px', '--width': theme.maxWidth + 'px', '--font': fonts[theme.font] || fonts.sans }).forEach(function (entry) { widget.style.setProperty(entry[0], entry[1]) })
        widget.setAttribute('aria-label', doc.heading || 'Jadwal seminar')
        widget.append(inner); root.append(widget)

        function timer(settings, key, parent) {
            if (!settings || settings.mode === 'off') return function () { return false }
            var deadline
            if (settings.mode === 'fixed') deadline = Date.parse(settings.deadline + ':00' + offsets[settings.timezone])
            else {
                var storageKey = 'divination-timer:v1:' + (options.key || host.dataset.divinationSchedule || 'preview') + ':' + key + ':' + settings.minutes
                if (options.preview) deadline = Date.now() + settings.minutes * 60000
                else {
                    try { deadline = Number(localStorage.getItem(storageKey)) } catch { deadline = volatileTimers.get(storageKey) }
                    if (!deadline || !Number.isFinite(deadline)) {
                        deadline = Date.now() + settings.minutes * 60000
                        volatileTimers.set(storageKey, deadline)
                        try { localStorage.setItem(storageKey, String(deadline)) } catch { /* In-memory fallback for restricted storage. */ }
                    }
                }
            }
            var block = element('div', 'timer'), label = element('span', 'timer-label', settings.label), digits = element('span', 'digits')
            block.append(label, digits); parent.append(block)
            function expired() { return Number.isFinite(deadline) && Date.now() >= deadline }
            function tick() {
                if (!Number.isFinite(deadline)) { digits.className = 'expired'; digits.textContent = 'Batas waktu belum diisi'; return }
                if (expired()) {
                    block.hidden = settings.expiryAction === 'hide_timer'
                    label.hidden = true; digits.className = 'expired'; digits.textContent = settings.expiredText || 'Periode diskon telah berakhir'
                } else {
                    var seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)), days = Math.floor(seconds / 86400)
                    digits.textContent = (days ? days + ' hari ' : '') + [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60].map(function (value) { return String(value).padStart(2, '0') }).join(' : ')
                }
            }
            tick(); timerChecks.push(tick)
            return function () { return settings.expiryAction === 'close_cta' && expired() }
        }

        var animation = doc.animation
        if (animation.mode === 'arrows') {
            var arrows = element('div', 'arrows'); arrows.setAttribute('aria-hidden', 'true')
            for (var n = 0; n < animation.count; n++) {
                var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
                arrow.setAttribute('viewBox', '0 0 80 90'); arrow.setAttribute('width', String(animation.size)); arrow.setAttribute('class', 'arrow'); arrow.style.animationDelay = n * .13 + 's'
                var path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
                path.setAttribute('d', 'M40 5 L40 70 M12 48 L40 78 L68 48'); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '9'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); arrow.append(path); arrows.append(arrow)
            }
            inner.append(arrows)
        } else if (animation.mode === 'lottie' || animation.mode === 'image') {
            var row = element('div', 'animation'); row.setAttribute('aria-hidden', 'true'); inner.append(row)
            for (var i = 0; i < animation.count; i++) {
                var item = element('div', 'animation-item'); item.style.width = animation.size + 'px'; row.append(item)
                if (animation.mode === 'image') {
                    var img = element('img'); img.alt = ''; img.src = animation.upload || safeUrl(animation.url); img.loading = 'lazy'
                    img.onerror = function () { this.remove() }; item.append(img)
                } else {
                    ;(function (container) {
                        loadLottie().then(function (lottie) {
                            if (disposed) return
                            var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
                            var config = { container: container, renderer: 'svg', loop: !reducedMotion, autoplay: !reducedMotion }
                            if (animation.upload) config.animationData = JSON.parse(animation.upload)
                            else config.path = safeUrl(animation.url)
                            var instance = lottie.loadAnimation(config); animations.push(instance)
                            instance.addEventListener('data_failed', function () { container.textContent = '' })
                        }).catch(function () { if (!disposed) container.replaceChildren() })
                    })(item)
                }
            }
        }
        if (doc.heading || doc.subtitle) {
            var heading = element('header', 'heading')
            if (doc.heading) heading.append(element('h2', '', doc.heading))
            if (doc.subtitle) heading.append(element('p', '', doc.subtitle))
            inner.append(heading)
        }
        var globalClosed = timer(doc.countdown, 'schedule', inner)
        var cityList = element('div', 'cities' + (theme.layout === 'grid' ? ' grid' : ''))
        var now = Date.now(), cities = doc.cities.map(function (city) {
            return { id: city.id, name: city.name, sessions: city.sessions.filter(function (session) { return !doc.hidePast || !session.date || sessionEnd(session) >= now }) }
        }).filter(function (city) { return (!options.city || city.id === options.city) && city.sessions.length })
        if (doc.sort === 'date') {
            cities.forEach(function (city) { city.sessions.sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time) }) })
            cities.sort(function (a, b) { return (a.sessions[0].date + a.sessions[0].time).localeCompare(b.sessions[0].date + b.sessions[0].time) })
        }
        cities.forEach(function (city, cityIndex) {
            var card = element('article', 'city'), header = element('header', 'city-header'), title = element('h3'), titleBlock = element('div', 'city-title')
            if (doc.cityPrefix) title.append(element('span', 'city-prefix', doc.cityPrefix + ' '))
            title.append(element('span', 'city-name', city.name || 'Nama kota'))
            var ordinal = element('span', 'city-index', String(cityIndex + 1).padStart(2, '0')); ordinal.setAttribute('aria-hidden', 'true')
            titleBlock.append(element('p', 'city-kicker', 'SEMINAR / ' + String(cityIndex + 1).padStart(2, '0')), title)
            header.append(ordinal, titleBlock); card.append(header)
            city.sessions.forEach(function (session, index) {
                var block = element('div', 'session'), body = element('div', 'session-body'), stamp = element('div', 'date-stamp')
                stamp.setAttribute('aria-hidden', 'true')
                var stampDate = new Date(session.date + 'T12:00:00Z')
                stamp.append(element('strong', '', session.date ? session.date.slice(8) : '—'), element('span', '', Number.isFinite(stampDate.getTime()) ? new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' }).format(stampDate).toUpperCase() : 'TGL'))
                block.append(stamp, body)
                if (session.name || city.sessions.length > 1) body.append(element('p', 'session-name', session.name || 'Sesi ' + (index + 1)))
                body.append(element('p', 'date', dateLabel(session.date)), element('p', 'time', session.time ? 'Jam ' + session.time.replace(':', '.') + (session.endTime ? ' – ' + session.endTime.replace(':', '.') : '') + ' ' + zones[session.timezone] : 'Jam belum diisi'), element('p', 'venue', session.venue || 'Venue belum diisi'))
                if (session.address) body.append(element('p', 'address', session.address))
                var sessionClosed = timer(session.countdown, session.id, body)
                var seats = session.seats, remaining = seats.mode === 'actual' ? Math.max(0, seats.capacity - seats.booked) : seats.remaining
                if (seats.mode !== 'off') {
                    var seatBlock = element('div', 'seats', template(seats.label, city.name, session.name, remaining))
                    if (seats.showProgress) {
                        var meter = element('div', 'meter'), fill = element('span')
                        meter.setAttribute('role', 'meter'); meter.setAttribute('aria-label', 'Kursi tersisa'); meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', String(seats.capacity)); meter.setAttribute('aria-valuenow', String(remaining))
                        fill.style.width = Math.min(100, Math.max(0, remaining / seats.capacity * 100)) + '%'; meter.append(fill); seatBlock.append(meter)
                    }
                    body.append(seatBlock)
                }
                var soldOut = session.status === 'sold_out' || (seats.mode === 'actual' && remaining === 0)
                var blocked = soldOut || session.status !== 'open' || (!options.preview && !safeUrl(session.checkoutUrl))
                var button = element(blocked || options.preview ? 'button' : 'a', 'cta' + (doc.cta.pulse && !blocked ? ' pulse' : ''))
                var openLabel = template(session.ctaLabel || doc.cta.label || 'Daftar Sekarang', city.name, session.name || 'Sesi ' + (index + 1))
                var closedLabel = soldOut ? doc.cta.soldOutLabel || 'Sold Out' : session.status === 'cancelled' ? 'Sesi Dibatalkan' : doc.cta.closedLabel || 'Pendaftaran Ditutup'
                button.textContent = blocked ? closedLabel : openLabel
                if (button.tagName === 'A') {
                    var updateHref = function () {
                        if (globalClosed() || sessionClosed()) { button.removeAttribute('href'); return }
                        button.href = buildTrackedUrl(session.checkoutUrl, options.search === undefined ? window.location.search : options.search, cookieString())
                    }
                    updateHref(); button.rel = 'noopener noreferrer'; button.target = doc.cta.newTab ? '_blank' : '_self'
                    // No oo-link class: OO's one-shot decorator would append duplicate parameters.
                    button.addEventListener('pointerdown', updateHref); button.addEventListener('focus', updateHref)
                    button.addEventListener('click', function (event) {
                        if (globalClosed() || sessionClosed()) { event.preventDefault(); tickButtons(); return }
                        updateHref()
                        host.dispatchEvent(new CustomEvent('divination:schedule-click', { bubbles: true, composed: true, detail: { scheduleId: options.key, cityId: city.id, sessionId: session.id } }))
                    })
                } else { button.type = 'button'; button.disabled = blocked; if (options.preview) button.title = 'Preview — link pendaftaran tidak dibuka' }
                buttons.push({ node: button, blocked: blocked, label: openLabel, closedLabel: closedLabel, isClosed: sessionClosed, expiryText: session.countdown && session.countdown.expiredText })
                body.append(button); card.append(block)
            })
            cityList.append(card)
        })
        inner.append(cityList)
        if (!cities.length) inner.append(element('p', 'empty', doc.emptyMessage || 'Jadwal berikutnya segera hadir.'))
        function tickButtons() {
            buttons.forEach(function (entry) {
                var expired = globalClosed() || entry.isClosed()
                if (entry.node.tagName === 'A') {
                    entry.node.setAttribute('aria-disabled', String(expired))
                    if (expired) { entry.node.removeAttribute('href'); entry.node.tabIndex = -1; entry.node.classList.remove('pulse') }
                } else entry.node.disabled = entry.blocked || expired
                entry.node.textContent = expired ? (globalClosed() ? doc.countdown.expiredText : entry.expiryText) || 'Periode diskon telah berakhir' : entry.blocked ? entry.closedLabel : entry.label
            })
        }
        tickButtons()
        if (timerChecks.length) intervals.push(setInterval(function () { timerChecks.forEach(function (tick) { tick() }); tickButtons() }, 1000))
        // Re-evaluate sessions when the configured end time passes on an already-open LP.
        if (doc.hidePast && !options.preview) intervals.push(setInterval(function () {
            if (cities.some(function (city) { return city.sessions.some(function (session) { return session.date && sessionEnd(session) < Date.now() }) })) render(host, doc, options)
        }, 60000))
        var cleanup = function () { disposed = true; intervals.forEach(clearInterval); animations.forEach(function (animation) { animation.destroy() }); mounts.delete(host) }
        mounts.set(host, cleanup)
        return cleanup
    }

    function mount(host) {
        if (initialized.has(host)) return
        initialized.add(host)
        var id = host.dataset.divinationSchedule
        if (!/^[a-f0-9-]{36}$/i.test(id || '')) return
        var root = shadow(host), message = element('div', 'loading', 'Memuat jadwal…'); root.append(message)
        var controller = new AbortController(), timeout = setTimeout(function () { controller.abort() }, 12000)
        fetch(origin + '/api/public/schedules/' + encodeURIComponent(id), { credentials: 'omit', cache: 'no-store', signal: controller.signal })
            .then(function (response) { if (!response.ok) { var error = new Error('unavailable'); error.notFound = response.status === 404; throw error } return response.json() })
            .then(function (data) {
                if (!host.isConnected) { initialized.delete(host); return }
                if (data.document && data.document.schemaVersion === 1) render(host, data.document, { key: id, city: host.dataset.city }); else throw new Error('Invalid schedule')
            })
            .catch(function (error) {
                message.textContent = error.notFound ? 'Jadwal belum tersedia.' : 'Jadwal belum dapat dimuat.'
                if (!error.notFound) { var retry = element('button', 'retry', 'Coba lagi'); retry.type = 'button'; retry.onclick = function () { initialized.delete(host); mount(host) }; message.append(retry) }
            }).finally(function () { clearTimeout(timeout) })
    }
    function scan() { document.querySelectorAll('[data-divination-schedule]').forEach(mount) }
    window.DivinationSchedules = { render: render, scan: scan, buildTrackedUrl: buildTrackedUrl }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan, { once: true })
    else scan()
    // Elementor can insert HTML widgets after the initial DOMContentLoaded event.
    var observer = new MutationObserver(function (records) {
        if (records.some(function (record) { return Array.from(record.addedNodes).some(function (node) { return node.nodeType === 1 && (node.matches('[data-divination-schedule]') || node.querySelector('[data-divination-schedule]')) }) })) scan()
        mountsCleanup()
    })
    function mountsCleanup() { liveHosts.forEach(function (host) { if (!host.isConnected) { if (mounts.has(host)) mounts.get(host)(); liveHosts.delete(host) } }) }
    observer.observe(document.documentElement, { childList: true, subtree: true })
})()
