export type OrderOnlineLeadRow = {
    order_id: string
    name: string
    email: string
    phone: string
    address: string
    province: string
    city: string
    subdistrict: string
    zip: string
    product: string
    product_code: string
    quantity: string
    status: string
    payment_status: string
    payment_method: string
    product_price: string
    discount: string
    gross_revenue: string
    net_revenue: string
    created_at: string
    paid_at: string
    completed_at: string
}

export function parseDelimitedRows(content: string): string[][] {
    const separator = content.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0].includes(';') ? ';' : ','
    const rows: string[][] = []
    let row: string[] = []
    let cell = ''
    let quoted = false
    const input = content.replace(/^\uFEFF/, '')

    for (let i = 0; i < input.length; i++) {
        const char = input[i]
        if (char === '"') {
            if (quoted && input[i + 1] === '"') {
                cell += '"'
                i++
            } else {
                quoted = !quoted
            }
        } else if (char === separator && !quoted) {
            row.push(cell.trim())
            cell = ''
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && input[i + 1] === '\n') i++
            row.push(cell.trim())
            if (row.some(Boolean)) rows.push(row)
            row = []
            cell = ''
        } else {
            cell += char
        }
    }
    if (quoted) throw new Error('Format CSV tidak valid: tanda kutip belum ditutup.')
    row.push(cell.trim())
    if (row.some(Boolean)) rows.push(row)
    return rows
}

export function parseOrderOnlineLeadCsv(content: string): OrderOnlineLeadRow[] | null {
    const rows = parseDelimitedRows(content)
    if (rows.length < 2) return null
    const headers = rows[0].map(header => header.toLowerCase().trim())
    if (!['order_id', 'name', 'phone', 'payment_status'].every(field => headers.includes(field))) return null

    const fields: (keyof OrderOnlineLeadRow)[] = [
        'order_id', 'name', 'email', 'phone', 'address', 'province', 'city', 'subdistrict',
        'zip', 'product', 'product_code', 'quantity', 'status', 'payment_status',
        'payment_method', 'product_price', 'discount', 'gross_revenue', 'net_revenue',
        'created_at', 'paid_at', 'completed_at',
    ]
    const indexes = new Map(fields.map(field => [field, headers.indexOf(field)]))
    return rows.slice(1).map(cols => Object.fromEntries(
        fields.map(field => [field, cols[indexes.get(field) ?? -1] ?? ''])
    ) as OrderOnlineLeadRow)
}
