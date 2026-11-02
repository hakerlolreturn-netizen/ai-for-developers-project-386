import { expect, test, type Page } from '@playwright/test'

const meetingTypeId = 'e2e-intro'
const meetingTypeName = 'E2E intro call'
const guestName = 'Ада Лавлейс'
const guestEmail = 'ada@example.com'

const enabledDays = (page: Page) => page.locator('.mantine-DatePicker-day:not([data-disabled])')
const slotButtons = (page: Page) => page.getByRole('button', { name: /^\d{2}:\d{2}$/ })

test('guest books the first free slot and it is no longer offered', async ({ page }) => {
  await page.goto('/meeting-types')
  await page.getByLabel('Идентификатор').fill(meetingTypeId)
  await page.getByLabel('Название').fill(meetingTypeName)
  await page.getByRole('button', { name: 'Создать' }).click()
  await expect(page.getByRole('cell', { name: meetingTypeId, exact: true })).toBeVisible()

  await page.goto('/book')
  await page.getByRole('link', { name: new RegExp(meetingTypeName) }).click()

  const day = enabledDays(page).first()
  const dayLabel = await day.getAttribute('aria-label')
  await day.click()
  const slot = slotButtons(page).first()
  const slotTime = await slot.innerText()
  await slot.click()
  await page.getByRole('button', { name: 'Далее' }).click()

  await page.getByLabel('Имя').fill(guestName)
  await page.getByLabel('Email').fill(guestEmail)
  await page.getByRole('button', { name: 'Записаться' }).click()

  await expect(page.getByRole('heading', { name: 'Вы записаны' })).toBeVisible()
  await expect(page.getByText(guestName)).toBeVisible()
  await expect(page.getByText(guestEmail)).toBeVisible()

  await page.goto(`/book/${meetingTypeId}`)
  const sameDay = page.getByRole('button', { name: dayLabel!, exact: true })
  await expect(enabledDays(page).first()).toBeVisible()
  if (await sameDay.isEnabled()) {
    await sameDay.click()
    await expect(slotButtons(page).first()).toBeVisible()
    await expect(slotButtons(page).filter({ hasText: slotTime })).toHaveCount(0)
  }

  await page.goto('/meetings')
  await expect(page.getByText(`${meetingTypeName} · ${guestName} · ${guestEmail}`)).toBeVisible()
})
