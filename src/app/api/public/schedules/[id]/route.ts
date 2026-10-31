import { getPublicSchedule } from '@/lib/schedules/public'

const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex',
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const schedule = await getPublicSchedule((await params).id)
        return schedule ? Response.json(schedule, { headers }) : Response.json({ error: 'Jadwal belum tersedia.' }, { status: 404, headers })
    } catch {
        return Response.json({ error: 'Jadwal belum dapat dimuat.' }, { status: 503, headers })
    }
}

export async function OPTIONS() { return new Response(null, { status: 204, headers }) }
