import type { ConnectionErrorCode } from './types'

export class ConnectionError extends Error {
    constructor(public readonly code: ConnectionErrorCode, message: string) {
        super(message)
        this.name = 'ConnectionError'
    }
}
