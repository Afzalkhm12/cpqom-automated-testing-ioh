/**
 * Performs a Salesforce browser login using the two-step identity-provider flow
 * (username on the first page, password revealed after clicking Login).
 * Use this for orgs where the login page splits username and password across two steps.
 * @param {import('@playwright/test').Page} page
 * @param {{ url: string, username: string, password: string }} loginUser
 */
export async function sfBrowserLogin(page, loginUser) {
  await page.goto(loginUser.url);
  await page.fill("#username", loginUser.username);
  await page.click("#Login");
  await page.waitForSelector("#password", { timeout: 20000 });
  await page.fill("#password", loginUser.password);
  await page.click("#Login");
  await page.waitForURL("**/lightning/**", { timeout: 60000 });
}

/**
 * Authenticates against Salesforce using the client_credentials OAuth flow.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {{ url: string, clientId: string, clientSecret: string }} sfEnv
 * @returns {Promise<{ accessToken: string, instanceUrl: string }>}
 */
export async function sfOAuthLogin(request, sfEnv) {
  const loginResponse = await request.post(
    `${sfEnv.url}/services/oauth2/token`,
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      form: {
        grant_type: "client_credentials",
        client_id: sfEnv.clientId,
        client_secret: sfEnv.clientSecret
      }
    }
  );
  if (!loginResponse.ok()) {
    throw new Error(
      `OAuth login failed: HTTP ${loginResponse.status()} — check clientId/clientSecret in sf_environments`
    );
  }
  const body = await loginResponse.json();
  console.log("Instance URL:", body.instance_url);
  return { accessToken: body.access_token, instanceUrl: body.instance_url };
}
