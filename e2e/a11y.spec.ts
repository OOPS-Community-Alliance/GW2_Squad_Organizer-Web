import AxeBuilder from '@axe-core/playwright';
import { Page } from '@playwright/test';
import { expect, showView, slot, test } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function audit(page: Page) {
  // Tooltips blenden gerade ein (halbe Deckkraft) und verfälschen sonst die Kontrastmessung.
  await page.mouse.move(0, 0);
  await expect(page.locator('.mat-mdc-tooltip')).toHaveCount(0);
  const result = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Barrierefreiheit (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test('Squad mit Auswahl', async ({ app }) => {
      await slot(app, 0, 0).click();
      await app
        .getByRole('dialog')
        .getByRole('button', { name: /Allgemein - Heal/ })
        .click();
      await slot(app, 0, 0).click();
      await audit(app);
    });

    test('Bibliothek', async ({ app }) => {
      await showView(app, 'Builds');
      await audit(app);
    });

    test('Rollen-Übersicht', async ({ app }) => {
      await slot(app, 0, 0).click();
      await app
        .getByRole('dialog')
        .getByRole('button', { name: /Allgemein - pDPS/ })
        .click();
      await showView(app, 'Rollen');
      await expect(app.getByText('Pro Gruppe')).toBeVisible();
      await audit(app);
    });

    test('Build-Formular', async ({ app }) => {
      await showView(app, 'Builds');
      await app.getByRole('button', { name: 'Build erstellen' }).first().click();
      await expect(app.getByRole('dialog')).toBeVisible();
      await audit(app);
    });
  });
}

test('Alle Bedienelemente haben mindestens 48 × 48 px Trefferfläche', async ({ app }) => {
  const small = await app.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('button, a[href], [role="tab"]')]
      .filter((el) => el.offsetParent !== null && !el.closest('.visually-hidden, .skip-link'))
      .map((el) => {
        // Material-Buttons haben sichtbar 40 px und eine unsichtbare 48-px-Touch-Fläche.
        const own = el.getBoundingClientRect();
        const touch = el.querySelector('.mat-mdc-button-touch-target')?.getBoundingClientRect();
        const rect = {
          width: Math.max(own.width, touch?.width ?? 0),
          height: Math.max(own.height, touch?.height ?? 0),
        };
        return { el, rect };
      })
      .filter(({ rect }) => rect.width < 47.5 || rect.height < 47.5)
      .map(
        ({ el, rect }) =>
          `${el.getAttribute('aria-label') ?? el.textContent?.trim()} (${rect.width}×${rect.height})`,
      ),
  );
  expect(small).toEqual([]);
});
