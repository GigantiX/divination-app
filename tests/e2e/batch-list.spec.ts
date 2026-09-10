import { test, expect } from '@playwright/test'

test.describe('Batch list mobile layout', () => {
  const eventId = '11111111-1111-1111-1111-111111111111'

  test.use({ viewport: { width: 375, height: 667 } })

  test('keeps long batch content inside an iPhone SE viewport', async ({ page }) => {
    await page.goto(`/events/${eventId}/batches`)
    await expect(page.getByRole('heading', { name: 'Batch Aktif' })).toBeVisible()
    await expect(page.locator('nav').filter({ hasText: 'Pengaturan' })).toHaveCount(0)

    const card = page.locator('[data-testid^="batch-card-"]').first()
    await expect(card).toBeVisible()

    await card.locator('h3').evaluate((heading) => {
      heading.textContent = 'OFFLINEJakartaBandungOktober2026DenganNamaBatchYangSangatPanjangTanpaSpasi'
    })
    await card.getByText('Catatan').locator('..').locator('p').evaluate((notes) => {
      notes.textContent = 'CatatanSangatPanjangTanpaSpasiYangTetapHarusMembungkusDiDalamKartuBatch'
    })

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    const cardBounds = await card.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      return { left: bounds.left, right: bounds.right }
    })

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth)
    expect(cardBounds.left).toBeGreaterThanOrEqual(0)
    expect(cardBounds.right).toBeLessThanOrEqual(layout.viewportWidth)
  })
})
