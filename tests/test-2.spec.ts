import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://b2b-io--cpqsitdelo.sandbox.my.salesforce.com/?ec=302&startURL=%2Fvisualforce%2Fsession%3Furl%3Dhttps%253A%252F%252Fb2b-io--cpqsitdelo.sandbox.lightning.force.com%252Flightning%252Fr%252FQuote%252F0Q0MR000001PW7N0AW%252Fview');
  await page.getByRole('textbox', { name: 'Username' }).press('ControlOrMeta+v');
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill('o.harliansyah@ioh.co.id.cpqsitdelo');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).press('ControlOrMeta+v');
  await page.getByRole('textbox', { name: 'Password' }).fill('QFbe3fqe1osXwA');
  await page.getByRole('button', { name: 'Log In to Sandbox' }).click();
  await page.goto('https://b2b-io--cpqsitdelo.sandbox.lightning.force.com/lightning/r/Quote/0Q0MR000001PW7N0AW/view');
  await expect(page.getByRole('button', { name: 'Create Contract' })).toBeVisible();
  await page.getByRole('button', { name: 'Create Contract' }).click();
  await expect(page.locator('iframe[name="vfFrameId_1778060195732"]').contentFrame().getByText('Insert failed. First')).toBeVisible();

  await expect(page.locator('iframe[name="vfFrameId_1778060195732"]').contentFrame().getByText('Error is in expression \'{!')).toBeVisible();
  await expect(page.locator('iframe[name="vfFrameId_1778060195732"]').contentFrame().locator('[id="theErrorPage:theError"]')).toMatchAriaSnapshot(`- text: "Insert failed. First exception on row 0; first error: FIELD_CUSTOM_VALIDATION_EXCEPTION, Please input Date greater than Created Date: []"`);
});