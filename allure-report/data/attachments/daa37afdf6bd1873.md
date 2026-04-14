# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: non-ida/lead-mgmt.spec.js >> TC002_Create New Lead
- Location: tests/non-ida/lead-mgmt.spec.js:105:1

# Error details

```
Test timeout of 40000ms exceeded.
```

```
Error: locator.click: Test timeout of 40000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'New' })

```

# Test source

```ts
  12  |  * Fetches the Status field of a Lead via Salesforce REST API.
  13  |  * @param {import('@playwright/test').APIRequestContext} request
  14  |  * @param {string} instanceUrl  - e.g. https://your-org.my.salesforce.com
  15  |  * @param {string} accessToken  - Bearer token from OAuth
  16  |  * @param {string} leadId       - Salesforce Lead record ID
  17  |  * @param {string} [expectedStatus] - If provided, asserts the status matches
  18  |  * @returns {Promise<string>} The Lead Status value
  19  |  */
  20  | async function getLeadStatus(request, instanceUrl, accessToken, leadId, expectedStatus) {
  21  |     const url = `${instanceUrl}/services/data/v65.0/sobjects/Lead/${leadId}?fields=Status`;
  22  | 
  23  |     const response = await request.get(url, {
  24  |         headers: { Authorization: `Bearer ${accessToken}` }
  25  |     });
  26  | 
  27  |     console.log('Lead API response:', (await response.body()).toString());
  28  |     expect(response.ok()).toBeTruthy();
  29  | 
  30  |     const leadStatus = (await response.json()).Status;
  31  |     console.log('Lead status from API:', leadStatus);
  32  | 
  33  |     if (expectedStatus !== undefined) {
  34  |         expect(leadStatus).toBe(expectedStatus);
  35  |     }
  36  | 
  37  |     return leadStatus;
  38  | }
  39  | 
  40  | test('API Connection Test', async ({ request }) => {
  41  |     const loginUrl = data.login.url+'/services/oauth2/token';
  42  | 
  43  |     const grantType = 'client_credentials';
  44  |     const clientId = data.login.clientId;
  45  |     const clientSecret = data.login.clientSecret;
  46  | 
  47  |   // Step 1: Authenticate and get access token
  48  |     const loginResponse = await request.post(loginUrl, {
  49  |       headers: {
  50  |         'Content-Type' : 'application/x-www-form-urlencoded'
  51  |       },
  52  |       form: {
  53  |         grant_type: grantType,
  54  |         client_id: clientId,
  55  |         client_secret: clientSecret
  56  |       }
  57  |     });
  58  | 
  59  |     console.log('Login response is: ', (await (loginResponse).body()).toString());
  60  |     expect((loginResponse).ok()).toBeTruthy();
  61  | 
  62  | 
  63  |     const loginBody = await loginResponse.json();
  64  |     accessToken = loginBody.access_token;
  65  |     instanceUrl = loginBody.instance_url;
  66  | 
  67  |     console.log('Access token is: ', accessToken);
  68  | 
  69  |     console.log('Instance URL is: ', instanceUrl);
  70  | });
  71  | 
  72  | test('TC001_View All My Leads', async ({ page, request }) => {
  73  |     await allure.epic('Lead Management');
  74  |     await allure.feature('Manage My Leads');
  75  | 
  76  |     await allure.story('View All My Leads');
  77  |     await allure.severity('normal');
  78  |     await allure.label('pre-requisite', '1.1 User has logged into Salesforce as Sales profile');
  79  | 
  80  |     await test.step('TC001_S01 - Open Leads list view', async () => {
  81  |         await page.goto(data.login.url);
  82  |         await page.getByRole('textbox', { name: 'Username' }).fill(data.login.username);
  83  |         await page.getByRole('textbox', { name: 'Password' }).click();
  84  |         await page.getByRole('textbox', { name: 'Password' }).fill(data.login.password);
  85  |         await page.getByRole('button', { name: 'Log In to Sandbox' }).click();
  86  |         await page.getByRole('link', { name: 'Leads' }).click();
  87  | 
  88  |         // Expected: Leads list view is displayed
  89  |         await expect(page.getByRole('button', { name: 'Select a List View: Leads' })).toBeVisible();
  90  |     });
  91  | 
  92  |     await test.step('TC001_S02 - Select All my Leads', async () => {
  93  |         await page.getByRole('button', { name: 'Select a List View: Leads' }).click();
  94  |         await page.getByText(data.tc001.listViewName).click();
  95  | 
  96  |         // Expected: All leads owned by the user displayed with Project Name and Created By fields
  97  |         await expect(page.getByText(data.tc001.listViewName)).toBeVisible();
  98  |         await expect(page.getByRole('button', { name: `Sort by: ${data.tc001.expectedColumns[0]}` })).toBeVisible();
  99  |         await expect(page.getByRole('button', { name: `Sort by: ${data.tc001.expectedColumns[1]}` })).toBeVisible();
  100 |         await expect(page.getByLabel(data.tc001.expectedColumns[0], { exact: true }).locator('lightning-primitive-header-factory')).toContainText(data.tc001.expectedColumns[0]);
  101 |         await expect(page.getByLabel(data.tc001.expectedColumns[1], { exact: true })).toContainText(data.tc001.expectedColumns[1]);
  102 |     });
  103 | });
  104 | 
  105 | test('TC002_Create New Lead', async ({ page, request }) => {
  106 |     await allure.epic('Lead Management');
  107 |     await allure.feature('Manage My Leads');
  108 |     await allure.story('Create New Lead');
  109 |     await allure.severity('critical');
  110 | 
  111 |     await test.step('TC002_S01 - Click the New button', async () => {
> 112 |         await page.getByRole('button', { name: 'New' }).click();
      |                                                         ^ Error: locator.click: Test timeout of 40000ms exceeded.
  113 | 
  114 |         // Expected: Create new lead screen is displayed
  115 |         await expect(page.getByRole('heading', { name: 'New Lead' })).toBeVisible();
  116 |     });
  117 | 
  118 |     await test.step('TC002_S02 - Fill all mandatory fields', async () => {
  119 |         await page.getByRole('combobox', { name: 'Account Name' }).click();
  120 |         await page.getByRole('combobox', { name: 'Account Name' }).fill(data.tc002.accountName);
  121 |         await page.getByRole('option', { name: data.tc002.accountOption }).click();
  122 | 
  123 |         await page.getByRole('textbox', { name: 'Opportunity RFS Date' }).click();
  124 |         for (let i = 0; i < data.tc002.rfsDateMonthsAhead; i++) {
  125 |             await page.getByRole('button', { name: 'Next Month' }).click();
  126 |         }
  127 |         await page.getByRole('button', { name: data.tc002.rfsDateDay }).click();
  128 | 
  129 |         await page.getByRole('textbox', { name: 'Project Name' }).click();
  130 |         await page.getByRole('textbox', { name: 'Project Name' }).fill(`${data.tc002.projectName} ${counter}`);
  131 | 
  132 |         await page.getByRole('textbox', { name: 'Company' }).click();
  133 |         await page.getByRole('textbox', { name: 'Company' }).fill(`${data.tc002.company} ${counter}`);
  134 | 
  135 |         await page.getByRole('combobox', { name: 'Lead Source' }).click();
  136 |         await page.getByRole('option', { name: data.tc002.leadSource }).click();
  137 | 
  138 |         await page.getByRole('textbox', { name: 'Description' }).click();
  139 |         await page.getByRole('textbox', { name: 'Description' }).fill(data.tc002.description);
  140 | 
  141 |         await page.getByRole('combobox', { name: 'Lead Currency' }).click();
  142 |         await page.getByText(data.tc002.leadCurrency).click();
  143 | 
  144 |         await page.getByRole('combobox', { name: 'Primary Contact' }).click();
  145 |         await page.getByRole('combobox', { name: 'Primary Contact' }).fill(data.tc002.primaryContactSearch);
  146 |         await page.getByRole('option', { name: data.tc002.primaryContactOption }).click();
  147 | 
  148 |         await page.getByRole('textbox', { name: 'Last Name' }).click();
  149 |         await page.getByRole('textbox', { name: 'Last Name' }).fill(`${data.tc002.lastName} ${counter}`);
  150 | 
  151 |         await page.getByRole('textbox', { name: 'Mobile' }).click();
  152 |         await page.getByRole('textbox', { name: 'Mobile' }).fill(`${data.tc002.mobile}${counter}`);
  153 | 
  154 |         await page.getByRole('combobox', { name: 'Type of Product' }).click();
  155 |         await page.getByText(data.tc002.typeOfProduct).click();
  156 | 
  157 |         await page.getByRole('combobox', { name: 'Function' }).click();
  158 |         await page.locator('span').filter({ hasText: new RegExp(`^${data.tc002.function}$`) }).first().click();
  159 | 
  160 |         await page.getByRole('combobox', { name: 'Budget Status?' }).click();
  161 |         await page.getByText(data.tc002.budgetStatus).click();
  162 | 
  163 |         await page.getByRole('combobox', { name: 'Role of Lead (Seniority)' }).click();
  164 |         await page.getByText(data.tc002.roleOfLeadSeniority).click();
  165 | 
  166 |         await page.getByRole('combobox', { name: 'What is the timeframe of' }).click();
  167 |         await page.getByText(data.tc002.timeframe).click();
  168 | 
  169 |         await page.getByRole('combobox', { name: 'New requirements?' }).click();
  170 |         await page.getByRole('option', { name: data.tc002.newRequirements }).nth(0).click();
  171 | 
  172 |         await page.getByRole('combobox', { name: 'Is he an existing customer?' }).click();
  173 |         await page.getByRole('option', { name: data.tc002.existingCustomer }).nth(0).click();
  174 | 
  175 |         await page.getByRole('combobox', { name: 'Lead Type' }).click();
  176 |         await page.getByTitle(data.tc002.leadType).click();
  177 | 
  178 |         // Expected: All mandatory fields are filled
  179 |         await expect(page.getByRole('textbox', { name: 'Project Name' })).toHaveValue(`${data.tc002.projectName} ${counter}`);
  180 |     });
  181 | 
  182 |     await test.step('TC002_S03 - Click Save', async () => {
  183 |         await page.getByRole('button', { name: 'Save' }).click();
  184 |         await page.waitForURL('**/lightning/r/Lead/**');
  185 | 
  186 |         leadId = page.url().match(/\/lightning\/r\/Lead\/([^/]+)\//)?.[1];
  187 |         console.log(`[TC002] Lead ID: ${leadId}`);
  188 | 
  189 |         // Expected: Lead created successfully, status is New, lead owner is current user
  190 |         await expect(page.locator('div').filter({ hasText: 'Success notification.Lead "Mr' }).nth(3)).toBeVisible({ timeout: 10000 });
  191 |         await expect(page.locator('records-record-layout-item[field-label="Project Name"]')).toBeVisible();
  192 |         await expect(page.locator('records-record-layout-block')).toContainText(`${data.tc002.projectName} ${counter}`);
  193 |         await expect(page.locator('lightning-formatted-text').filter({ hasText: `${data.tc002.projectName} ${counter}` })).toBeVisible();
  194 |         await expect(page.locator('.slds-form-element.slds-hint-parent.test-id__output-root > .slds-form-element__control').first()).toBeVisible();
  195 |         await expect(page.locator('force-owner-lookup')).toBeVisible();
  196 |         await expect(page.locator('force-owner-lookup')).toContainText(data.tc002.expectedLeadOwner);
  197 |         await expect(page.getByRole('tabpanel', { name: 'Details' }).getByText('Lead Status', { exact: true })).toBeVisible();
  198 |         await expect(page.locator('lightning-formatted-text').filter({ hasText: data.tc002.expectedLeadStatus })).toContainText(data.tc002.expectedLeadStatus);
  199 |     });
  200 | 
  201 |     await test.step('TC002_S04 - Verify the lead status', async () => {
  202 |         // Expected: Lead status is New
  203 |         await getLeadStatus(request, instanceUrl, accessToken, leadId, data.tc002.expectedLeadStatus);
  204 |     });
  205 | });
  206 | 
  207 | test('TC008_Update Lead Status', async ({ page, request }) => {
  208 |     await allure.epic('Lead Management');
  209 |     await allure.feature('Manage My Leads');
  210 |     await allure.story('Update Lead Status');
  211 |     await allure.severity('normal');
  212 | 
```