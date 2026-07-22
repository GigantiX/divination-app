import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadFile, deleteFile } from './index'
import * as r2Module from './r2'
import * as supabaseAdminModule from '@/lib/supabase/admin'

vi.mock('./r2', () => ({
    uploadToR2: vi.fn(),
    deleteFromR2: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: vi.fn(),
}))

describe('Storage Manager (Unified R2 / Supabase)', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('uploadFile should convert Blob to Buffer and call uploadToR2', async () => {
        const fakeFile = new Blob(['dummy content'], { type: 'image/png' })
        // jsdom's Blob doesn't implement arrayBuffer() — mock it for test environment only.
        // In production (Node.js ≥18 server actions), Blob.arrayBuffer() is always available.
        fakeFile.arrayBuffer = async () => new TextEncoder().encode('dummy content').buffer
        vi.mocked(r2Module.uploadToR2).mockResolvedValueOnce({
            url: 'https://divination-dashboard-storage.account.r2.dev/test.png',
        })

        const result = await uploadFile(fakeFile, 'test.png')

        expect(r2Module.uploadToR2).toHaveBeenCalledWith(
            expect.any(Buffer),
            'test.png',
            'image/png'
        )
        expect(result.url).toContain('r2.dev/test.png')
    })

    it('deleteFile should handle legacy Supabase Storage URLs', async () => {
        const mockRemove = vi.fn().mockResolvedValueOnce({ error: null })
        vi.mocked(supabaseAdminModule.createAdminClient).mockReturnValueOnce({
            storage: {
                from: () => ({
                    remove: mockRemove,
                }),
            },
        } as unknown as ReturnType<typeof supabaseAdminModule.createAdminClient>)

        const legacyUrl = 'https://xxx.supabase.co/storage/v1/object/public/uploads/event-logos/user1/event1.png'
        const result = await deleteFile(legacyUrl)

        expect(mockRemove).toHaveBeenCalledWith(['event-logos/user1/event1.png'])
        expect(result.success).toBe(true)
    })

    it('deleteFile should extract Key and call deleteFromR2 for R2 URLs', async () => {
        vi.mocked(r2Module.deleteFromR2).mockResolvedValueOnce({ success: true })

        const r2Url = 'https://divination-dashboard-storage.0afa06a1d7decb37095fa689067959a7.r2.dev/event-logos/user1/event1.png'
        const result = await deleteFile(r2Url)

        expect(r2Module.deleteFromR2).toHaveBeenCalledWith('event-logos/user1/event1.png')
        expect(result.success).toBe(true)
    })

    it('deleteFile should refuse to delete from an unknown (non-R2) hostname', async () => {
        const unknownUrl = 'https://evil.example.com/some/path/file.png'
        const result = await deleteFile(unknownUrl)

        // Should silently succeed without calling deleteFromR2
        expect(r2Module.deleteFromR2).not.toHaveBeenCalled()
        expect(result.success).toBe(true)
    })
})

