export const BUSINESS_TIME_ZONE = 'Asia/Jakarta'

export function getJakartaDateString(date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BUSINESS_TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date)
}
