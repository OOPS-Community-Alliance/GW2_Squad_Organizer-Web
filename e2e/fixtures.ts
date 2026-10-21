import { expect, Page, test as base } from '@playwright/test';

export const test = base.extend<{ app: Page }>({
  app: async ({ page }, use) => {
    await page.goto('./');
    await expect(page.locator('app-squad-panel')).toBeVisible();
    await use(page);
  },
});

export { expect };

export const slot = (page: Page, group: number, index: number) =>
  page.locator(`[data-slot-key="${group}:${index}"]`);

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 840;

/** Öffnet auf schmalen Bildschirmen die passende Ansicht. */
export async function showView(page: Page, view: 'Squad' | 'Builds' | 'Rollen') {
  if (isMobile(page)) {
    await page
      .getByRole('navigation', { name: 'Hauptnavigation' })
      .getByRole('button', { name: view })
      .click();
  } else if (view !== 'Squad') {
    await page.getByRole('tab', { name: view }).click();
  }
}
