import { expect, isMobile, showView, slot, test } from './fixtures';

test.describe('Squad aufbauen', () => {
  test('leerer Slot öffnet die Build-Auswahl und platziert den Build', async ({ app }) => {
    await slot(app, 0, 0).click();
    const dialog = app.getByRole('dialog', { name: 'Build für Gruppe 1, Slot 1' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Allgemein - Heal/ }).click();
    await expect(slot(app, 0, 0)).toHaveAccessibleName(/Gruppe 1, Slot 1: Allgemein - Heal/);
    await expect(app.getByText('1 von 5 Slots belegt')).toBeVisible();
  });

  test('Auswahl-Modell: Build wählen, dann Slots antippen', async ({ app }) => {
    test.skip(isMobile(app), 'Auf Mobilgeräten läuft das über die Build-Auswahl');
    await app.getByRole('button', { name: /^Allgemein - Stab/ }).click();
    await slot(app, 0, 1).click();
    await slot(app, 0, 2).click();
    await expect(slot(app, 0, 1)).toHaveAccessibleName(/Allgemein - Stab/);
    await expect(slot(app, 0, 2)).toHaveAccessibleName(/Allgemein - Stab/);

    // Slot wählen und tauschen
    await app.keyboard.press('Escape');
    await slot(app, 0, 1).click();
    await expect(slot(app, 0, 1)).toHaveAttribute('aria-pressed', 'true');
    await slot(app, 0, 4).click();
    await expect(slot(app, 0, 4)).toHaveAccessibleName(/Allgemein - Stab/);
    await expect(slot(app, 0, 1)).toHaveAccessibleName(/leer/);
  });

  test('Ziehen aus der Bibliothek, Tauschen und Herausziehen entfernt', async ({ app }) => {
    test.skip(isMobile(app), 'Maus-Drag nur auf Desktop');
    const card = app.getByRole('button', { name: /^Allgemein - pDPS/ });
    await card.dragTo(slot(app, 0, 3));
    await expect(slot(app, 0, 3)).toHaveAccessibleName(/Allgemein - pDPS/);

    await slot(app, 0, 3).dragTo(slot(app, 0, 0));
    await expect(slot(app, 0, 0)).toHaveAccessibleName(/Allgemein - pDPS/);
    await expect(slot(app, 0, 3)).toHaveAccessibleName(/leer/);

    await slot(app, 0, 0).dragTo(app.locator('app-library-panel'));
    await expect(slot(app, 0, 0)).toHaveAccessibleName(/leer/);
    await expect(app.getByText('Allgemein - pDPS aus dem Squad entfernt.')).toBeVisible();
  });

  test('Rückgängig per Tastatur und Button', async ({ app }) => {
    await slot(app, 0, 0).click();
    await app
      .getByRole('dialog')
      .getByRole('button', { name: /Allgemein - Heal/ })
      .click();
    await app.getByRole('button', { name: 'Gruppe hinzufügen' }).click();
    await expect(app.getByRole('heading', { name: 'Gruppe 2' })).toBeVisible();

    await app.getByRole('button', { name: 'Rückgängig', exact: true }).click();
    await expect(app.getByRole('heading', { name: 'Gruppe 2' })).toHaveCount(0);
    await app.locator('body').press('Control+z');
    await expect(slot(app, 0, 0)).toHaveAccessibleName(/leer/);
    await app.locator('body').press('Control+Shift+z');
    await expect(slot(app, 0, 0)).toHaveAccessibleName(/Allgemein - Heal/);
  });

  test('Pfeiltasten navigieren, Entf leert den Slot', async ({ app }) => {
    test.skip(isMobile(app), 'Tastatur nur auf Desktop');
    await app.getByRole('button', { name: /^Allgemein - Heal/ }).dblclick();
    await app.keyboard.press('Escape');
    await slot(app, 0, 1).focus();
    await app.keyboard.press('ArrowLeft');
    await expect(slot(app, 0, 0)).toBeFocused();
    await app.keyboard.press('Delete');
    await expect(slot(app, 0, 0)).toHaveAccessibleName(/leer/);
  });

  test('Gruppen und Slots begrenzen', async ({ app }) => {
    const add = app.getByRole('button', { name: 'Slot zu Gruppe 1 hinzufügen' });
    for (let i = 0; i < 5; i++) await add.click();
    await expect(add).toHaveCount(0);
    await expect(slot(app, 0, 9)).toBeVisible();
  });

  test('Rollen-Übersicht zeigt Lücken', async ({ app }) => {
    await slot(app, 0, 0).click();
    await app
      .getByRole('dialog')
      .getByRole('button', { name: /Allgemein - pDPS/ })
      .click();
    await expect(app.getByText('Heal fehlt')).toBeVisible();
    await showView(app, 'Rollen');
    await expect(app.getByRole('status').filter({ hasText: '2 Lücken' })).toBeVisible();
  });

  test('Stand bleibt nach dem Neuladen erhalten', async ({ app }) => {
    await slot(app, 0, 2).click();
    await app
      .getByRole('dialog')
      .getByRole('button', { name: /Allgemein - Stab/ })
      .click();
    await app.waitForTimeout(600);
    await app.reload();
    await expect(slot(app, 0, 2)).toHaveAccessibleName(/Allgemein - Stab/);
  });
});
