import { readFileSync } from 'node:fs';
import { expect, showView, slot, test } from './fixtures';

test.describe('Builds und Teilen', () => {
  test('Build anlegen, bearbeiten und löschen', async ({ app }) => {
    await showView(app, 'Builds');
    await app.getByRole('button', { name: 'Build erstellen' }).first().click();
    const dialog = app.getByRole('dialog', { name: 'Build erstellen' });
    await dialog.getByRole('radio', { name: 'Firebrand' }).check();
    await dialog.getByLabel('Buildname').fill('HFB');
    await dialog.getByLabel('Rolle').fill('Heal');
    await expect(dialog.getByRole('option', { name: 'Heal', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await dialog.getByLabel('Build-Link').fill('javascript:alert(1)');
    await dialog.getByRole('button', { name: 'Build speichern' }).click();
    await expect(dialog.getByText('Bitte einen Link mit https://')).toBeVisible();
    await dialog
      .getByLabel('Build-Link')
      .fill('https://snowcrows.com/builds/wvw/guardian/heal-firebrand');
    await dialog.getByRole('button', { name: 'Build speichern' }).click();

    const card = app.getByRole('button', { name: /^HFB Heal\s*, Firebrand/ });
    await expect(card).toBeVisible();
    await expect(app.getByRole('link', { name: 'Build öffnen (snowcrows.com)' })).toHaveAttribute(
      'rel',
      /noopener/,
    );

    await app
      .getByRole('region', { name: 'Auswahl' })
      .getByRole('button', { name: 'Weitere Aktionen' })
      .click();
    await app.getByRole('menuitem', { name: 'Bearbeiten' }).click();
    await app.getByRole('dialog').getByLabel('Buildname').fill('HFB 2');
    await app.getByRole('button', { name: 'Änderungen speichern' }).click();
    await expect(app.getByRole('button', { name: /^HFB 2 / })).toBeVisible();

    await app
      .getByRole('region', { name: 'Auswahl' })
      .getByRole('button', { name: 'Weitere Aktionen' })
      .click();
    await app.getByRole('menuitem', { name: /Build löschen/ }).click();
    await app.getByRole('alertdialog').getByRole('button', { name: 'Build löschen' }).click();
    await expect(app.getByRole('button', { name: /^HFB 2 / })).toHaveCount(0);
  });

  test('Teilen-Link überträgt den Squad', async ({ app, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await slot(app, 0, 0).click();
    await app
      .getByRole('dialog')
      .getByRole('button', { name: /Allgemein - Heal/ })
      .click();

    await app.getByRole('button', { name: 'Teilen-Optionen' }).click();
    await app.getByRole('menuitem', { name: 'Link kopieren' }).click();
    await expect(app.getByText(/Link kopiert/)).toBeVisible();
    const link = await app.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/#s=[A-Za-z0-9_-]+$/);

    const other = await context.browser()!.newContext({ locale: 'de-DE' });
    const page = await other.newPage();
    await page.goto(link);
    const dialog = page.getByRole('dialog', { name: 'Geteilten Squad übernehmen?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Als neuen Squad speichern' }).click();
    await expect(slot(page, 0, 0)).toHaveAccessibleName(/Allgemein - Heal/);
    expect(new URL(page.url()).hash).toBe('');
    await other.close();
  });

  test('JSON der Desktop-App importieren und exportieren', async ({ app }, info) => {
    const file = info.outputPath('desktop.json');
    const json = {
      builds: [
        {
          id: 3,
          name: 'SupportTroub',
          klasse: 'Mesmer',
          elite: 'Troubadour',
          rolle: 'Support',
          link: '',
          icon: 'class_icon/Troubadour_tango_icon_48px.png',
          zeit: '2026-10-18 21:00',
        },
      ],
      squad: [{ build_id: 3, group: 1, slot: 2 }],
      group_slots: { '0': 5, '1': 5 },
    };
    (await import('node:fs')).writeFileSync(file, JSON.stringify(json));

    const chooser = app.waitForEvent('filechooser');
    await app.getByRole('banner').getByRole('button', { name: 'Weitere Aktionen' }).click();
    await app.getByRole('menuitem', { name: 'JSON importieren …' }).click();
    await (await chooser).setFiles(file);
    await expect(app.getByText(/„desktop“ importiert: 1 neue Builds/)).toBeVisible();
    await expect(slot(app, 1, 2)).toHaveAccessibleName(/SupportTroub/);

    const download = app.waitForEvent('download');
    await app.getByRole('button', { name: 'Teilen-Optionen' }).click();
    await app.getByRole('menuitem', { name: 'Als JSON exportieren' }).click();
    const exported = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
    expect(exported.group_slots).toEqual({ '0': 5, '1': 5 });
    expect(exported.squad).toContainEqual({ build_id: expect.any(Number), group: 1, slot: 2 });
  });

  test('Fehlerhafte Datei meldet einen verständlichen Grund', async ({ app }, info) => {
    const file = info.outputPath('broken.json');
    (await import('node:fs')).writeFileSync(file, '{"builds": []}');
    const chooser = app.waitForEvent('filechooser');
    await app.getByRole('banner').getByRole('button', { name: 'Weitere Aktionen' }).click();
    await app.getByRole('menuitem', { name: 'JSON importieren …' }).click();
    await (await chooser).setFiles(file);
    await expect(
      app.getByText(/Import fehlgeschlagen: Die Datei enthält keine Squad-Daten/),
    ).toBeVisible();
  });

  test('Post erstellen: Text und Bild', async ({ app, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await slot(app, 0, 0).click();
    await app
      .getByRole('dialog')
      .getByRole('button', { name: /Allgemein - Heal/ })
      .click();
    await app.getByRole('button', { name: 'Teilen-Optionen' }).click();
    await app.getByRole('menuitem', { name: 'Post erstellen …' }).click();
    const dialog = app.getByRole('dialog', { name: 'Post erstellen' });
    await expect(dialog.getByLabel('Beitragstext')).toHaveValue(
      /\[Allgemein - Heal : Heal \(Anzahl: 1\)\]/,
    );
    await expect(dialog.getByRole('img', { name: /Squad-Aufstellung/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Text kopieren' }).click();
    expect(await app.evaluate(() => navigator.clipboard.readText())).toContain(
      'Verwendete Builds für das Event:',
    );
  });

  test('Sprache auf Englisch umstellen', async ({ app }) => {
    await app.getByRole('banner').getByRole('button', { name: 'Weitere Aktionen' }).click();
    await app.getByRole('menuitem', { name: 'Sprache' }).click();
    await app.getByRole('menuitemradio', { name: 'English' }).click();
    await expect(app.getByRole('heading', { name: 'Group 1' })).toBeVisible();
    await expect(app.locator('html')).toHaveAttribute('lang', 'en');
  });
});
