import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'

import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'

function convertToCSV(data: any[]): string {
    if (data.length === 0) return ''
    const headers = Object.keys(data[0])
    const csvRows = []
    
    // Header row
    csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','))
    
    // Data rows
    for (const row of data) {
        const values = headers.map(h => {
            const val = row[h]
            return `"${String(val === null || val === undefined ? '' : val).replace(/"/g, '""')}"`
          })
          csvRows.push(values.join(','))
    }
    return csvRows.join('\n')
}

export async function GET(request: NextRequest) {
    // 1. Authenticate user
    const session = await auth()
    if (!session?.user?.id) {
        return new Response(JSON.stringify({ error: 'Tidak terautentikasi' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // 2. Authorize admin/developer role
    const supabase = createAdminClient()
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'developer')) {
        return new Response(JSON.stringify({ error: 'Tidak memiliki akses' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const format = searchParams.get('format') || 'csv'
    
    if (!type) {
        return new Response(JSON.stringify({ error: 'Parameter type wajib disertakan' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    let exportData: any[] = []
    let filename = `export-${type}-${Date.now()}`

    try {
        if (type === 'event-performance') {
            const eventId = searchParams.get('eventId')
            const batchId = searchParams.get('batchId')

            if (!eventId) {
                return new Response(JSON.stringify({ error: 'eventId wajib diisi untuk report ini' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                })
            }

            // Fetch Event Name
            const { data: event } = await supabase
                .from('events')
                .select('name')
                .eq('id', eventId)
                .single()

            // Fetch Batches
            let batchesQuery = supabase
                .from('batches')
                .select('id, name, start_date, end_date, price')
                .eq('event_id', eventId)

            if (batchId && batchId !== 'all') {
                batchesQuery = batchesQuery.eq('id', batchId)
            }

            const { data: batches } = await batchesQuery.order('start_date', { ascending: false })
            const batchIds = batches?.map(b => b.id) || []

            // Fetch Reports
            let reports: any[] = []
            if (batchIds.length > 0) {
                const { data: reportData } = await supabase
                    .from('reports')
                    .select('batch_id, ads_spent, tax_percentage, leads_count, closing_count')
                    .in('batch_id', batchIds)
                reports = reportData || []
            }

            exportData = (batches || []).map(b => {
                const batchReports = reports.filter(r => r.batch_id === b.id)
                const spend = batchReports.reduce((acc, r) => acc + Math.round(Number(r.ads_spent || 0) * (1 + Number(r.tax_percentage ?? 11) / 100)), 0)
                const leads = batchReports.reduce((acc, r) => acc + (r.leads_count || 0), 0)
                const sales = batchReports.reduce((acc, r) => acc + (r.closing_count || 0), 0)
                const price = Number(b.price || 0)
                const revenue = sales * price
                const profitLoss = revenue - spend
                
                return {
                    'Nama Event': event?.name || '',
                    'Nama Batch': b.name,
                    'Tanggal Mulai': b.start_date,
                    'Tanggal Selesai': b.end_date || 'Berjalan',
                    'Harga per Unit': price,
                    'Total Spend (IDR)': spend,
                    'Total Leads': leads,
                    'Total Sales': sales,
                    'CPR (IDR)': sales > 0 ? Math.round(spend / sales) : 0,
                    'Closing Rate (%)': leads > 0 ? Math.round((sales / leads) * 10000) / 100 : 0,
                    'Revenue (IDR)': revenue,
                    'Profit / Loss (IDR)': profitLoss,
                    'ROAS': spend > 0 ? Math.round((revenue / spend) * 100) / 100 : 0
                }
            })
            filename = `performance-${event?.name || 'event'}-${Date.now()}`

        } else if (type === 'daily-reports') {
            const eventId = searchParams.get('eventId')
            const batchId = searchParams.get('batchId')

            if (!eventId) {
                return new Response(JSON.stringify({ error: 'eventId wajib diisi untuk report ini' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                })
            }

            // Fetch Batches & Event Name
            let batchesQuery = supabase
                .from('batches')
                .select(`
                    id, 
                    name, 
                    events:events ( name )
                `)
                .eq('event_id', eventId)

            if (batchId && batchId !== 'all') {
                batchesQuery = batchesQuery.eq('id', batchId)
            }

            const { data: batches } = await batchesQuery
            const batchIds = batches?.map(b => b.id) || []
            const batchMap = new Map(batches?.map(b => [b.id, { name: b.name, eventName: (b.events as any)?.name }]) || [])

            let reports: any[] = []
            if (batchIds.length > 0) {
                const { data: reportData } = await supabase
                    .from('reports')
                    .select(`
                        report_date, 
                        ads_spent, 
                        tax_percentage, 
                        leads_count, 
                        closing_count, 
                        notes, 
                        batch_id, 
                        profiles:profiles ( full_name )
                    `)
                    .in('batch_id', batchIds)
                    .order('report_date', { ascending: false })
                reports = reportData || []
            }

            exportData = reports.map(r => {
                const bInfo = batchMap.get(r.batch_id)
                const spend = Number(r.ads_spent || 0)
                const tax = Number(r.tax_percentage ?? 11)
                const spendWithTax = Math.round(spend * (1 + tax / 100))
                return {
                    'Tanggal': r.report_date,
                    'Nama Event': bInfo?.eventName || '',
                    'Nama Batch': bInfo?.name || '',
                    'Reporter': (r.profiles as any)?.full_name || 'Tidak Diketahui',
                    'Ad Spend (Raw)': spend,
                    'Tax (%)': tax,
                    'Spend dengan Pajak (IDR)': spendWithTax,
                    'Jumlah Leads': r.leads_count || 0,
                    'Sales / Closing': r.closing_count || 0,
                    'Catatan': r.notes || ''
                }
            })
            filename = `daily-reports-${eventId}-${Date.now()}`

        } else if (type === 'budget-history') {
            const { data: requests } = await supabase
                .from('budget_requests')
                .select(`
                    created_at, 
                    amount, 
                    status, 
                    proof_image_url, 
                    events:events ( name ), 
                    profiles:profiles ( full_name )
                `)
                .order('created_at', { ascending: false })

            exportData = (requests || []).map(r => {
                return {
                    'Tanggal': new Date(r.created_at).toLocaleString('id-ID'),
                    'Pemohon': (r.profiles as any)?.full_name || 'Tidak Diketahui',
                    'Nama Event': (r.events as any)?.name || 'Tidak Diketahui',
                    'Jumlah Request (IDR)': Number(r.amount || 0),
                    'Status Persetujuan': r.status === 'process' ? 'Pending' : r.status === 'approved' ? 'Disetujui' : 'Ditolak',
                    'URL Bukti Transfer': r.proof_image_url || ''
                }
            })
            filename = `budget-history-${Date.now()}`

        } else {
            return new Response(JSON.stringify({ error: 'Report type tidak didukung' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            })
        }

        // 4. Return formatted file response
        if (format === 'xlsx') {
            const worksheet = XLSX.utils.json_to_sheet(exportData)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Export')
            
            const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
            
            return new Response(arrayBuffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
                }
            })
        } else {
            // Default to CSV
            const csvString = convertToCSV(exportData)
            // Prepend BOM (\ufeff) to force Excel/UTF-8 recognition
            const csvWithBOM = '\ufeff' + csvString

            return new Response(csvWithBOM, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="${filename}.csv"`,
                }
            })
        }
    } catch (error: any) {
        console.error('Export error:', error)
        return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal saat membuat export' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
}
