import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://b2b-io--cpqsitdelo.sandbox.my.salesforce.com/');
  await page.getByRole('textbox', { name: 'Username' }).fill('o.harliansyah@ioh.co.id.cpqsitdelo');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('QFbe3fqe1osXwA');
  await page.getByRole('button', { name: 'Log In to Sandbox' }).click();
  await page.goto('https://b2b-io--cpqsitdelo.sandbox.my.salesforce.com/_ui/identity/verification/method/TotpVerificationUi/e?vcsrf=A6MC6F-e5kOU2YmEjG09jAmlpUE6U1Q78h_tIUVOxVnn-enlRs3yZdB5fZT9XbL0z6Y3Me_1KCBp6leXz08a6rghzc_dYe8KZ9mStH549k13Yjq__Zaw2-mWQbGnR5vJ1UJ91upJJRImXDgqQraExt-5MH9xpSgnVbPV3PfBZ1DkmYFHNTYrJkx9akzVEIMgayX8fCG_5gk_aBl6ubh7pIml2Ri5IXqdWnH5g8pbw4Fa08sdiM6unMWyz6O-4tg-sGsnEPUYvaNKONKI_9WWwZZBqAlBtMUs4qHLVIhbh4fdluxnpdk9LypG8JaQwSKvqM9ureP752LPGB_tKxc5J4wJCSIAC64Y2aSyvJN2h08iT2wSCIhqgKlzNc9hdrTc83jTA6BiUrLjGdGI2Y5KiABlWzZ9ybfxNEytjioR5ybgpiJ7fYDDdIENjKj0FPHpdw0yyRvioqSNPwsyj5zi9VUGRF0wfPdkF0PbLL-OP-rnklchYBcEWM3qAriYu5LBtG1lIbS7vR7QvoO-2UYdWCXQwEtyJG_RnQIimV7h50Rt8yAfhUTNd7ml2B3ePEMuu1fXw3TZP-oRxoitPsBGF1buy9DG-wzVHSreQLK8D0Z0sQbzWZ5F55zCXSgDs5GLYWZhCBtfXWn3TbVwUw9iywmsFJypHEBaQJYQA3GvB4g%3D&vpol=ic&vflid=0&vfgrp=47447112&retURL=%2Fsecur%2Ffrontdoor.jsp%3Fallp%3D1%26cshc%3D1000001AMWsR000001U98X%26apv%3D1%26display%3Dpage%26ucs%3D1&sfafb=2');
  await page.getByRole('textbox', { name: 'Verification Code' }).click();
  await page.getByRole('textbox', { name: 'Verification Code' }).fill('440627');
  await page.getByRole('button', { name: 'Verify' }).click();
  await page.getByRole('link', { name: 'Opportunities' }).click();
  await page.getByRole('link', { name: 'ABC', exact: true }).click();
  await page.getByRole('tab', { name: 'Score Card' }).click();
  await expect(page.getByRole('button', { name: 'Edit (ES) Has Incumbent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) RFP Influence' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Implementation Risk' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Partnership Tier' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Customer Favor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Customer Budget' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Project Timeline' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Customer Relationship' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Core Product' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Deal Registered' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit (ES) Internal' })).toBeVisible();


  await expect(page.getByRole('button', { name: 'Edit Has Incumbent' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit RFP Influence' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Implementation Risk' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Partnership Tier with' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Customer Favor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Customer Budget' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Project Timeline' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Customer Relationship' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Core Product' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Deal Registered' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Internal Capabilities' })).toBeVisible();
});