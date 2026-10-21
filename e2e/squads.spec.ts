import { expect, slot, test } from './fixtures';

test('Squads anlegen, umbenennen, wechseln und löschen', async ({ app }) => {
  const switcher = app.getByRole('button', { name: /^Squad wechseln/ });

  await slot(app, 0, 0).click();
  await app
    .getByRole('dialog')
    .getByRole('button', { name: /Allgemein - Heal/ })
    .click();

  await switcher.click();
  await app.getByRole('menuitem', { name: 'Neuer Squad …' }).click();
  await app.getByRole('dialog').getByLabel('Name des Squads').fill('Raid Montag');
  await app.getByRole('button', { name: 'Squad anlegen' }).click();
  await expect(switcher).toHaveAccessibleName('Squad wechseln, aktuell: Raid Montag');
  await expect(slot(app, 0, 0)).toHaveAccessibleName(/leer/);

  await switcher.click();
  await app.getByRole('menuitem', { name: 'Squad umbenennen …' }).click();
  await app.getByRole('dialog').getByLabel('Name des Squads').fill('Raid Dienstag');
  await app.getByRole('button', { name: 'Namen speichern' }).click();
  await expect(switcher).toHaveAccessibleName('Squad wechseln, aktuell: Raid Dienstag');

  await switcher.click();
  await app.getByRole('menuitemradio', { name: 'Mein Squad' }).click();
  await expect(slot(app, 0, 0)).toHaveAccessibleName(/Allgemein - Heal/);

  await switcher.click();
  await app.getByRole('menuitem', { name: 'Squad löschen …' }).click();
  await app.getByRole('alertdialog').getByRole('button', { name: 'Squad löschen' }).click();
  await expect(switcher).toHaveAccessibleName('Squad wechseln, aktuell: Raid Dienstag');

  // Löschen lässt sich rückgängig machen.
  await app.getByRole('button', { name: 'Rückgängig', exact: true }).first().click();
  await expect(switcher).toHaveAccessibleName('Squad wechseln, aktuell: Mein Squad');
});
