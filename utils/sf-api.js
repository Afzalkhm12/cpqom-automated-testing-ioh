import fs from "fs";

/**
 * Salesforce REST API wrapper for Playwright tests.
 *
 * Provides generic sObject CRUD, SOQL queries, approval process helpers,
 * and Vlocity CPQ / Orchestration-specific operations.
 *
 * Uses Playwright's APIRequestContext for HTTP calls so it works seamlessly
 * inside both API-only and UI tests.
 */
export class SalesforceAPI {
  /** @type {string} */
  instanceUrl;
  /** @type {string} */
  accessToken;
  /** @type {import('@playwright/test').APIRequestContext} */
  request;

  static API_VERSION = "v65.0";
  static VLOCITY_NS = "vlocity_cmt";

  /**
   * @param {import('@playwright/test').APIRequestContext} request
   * @param {string} instanceUrl - e.g. https://b2b-io--cpqsitdelo.sandbox.my.salesforce.com
   * @param {string} accessToken - Session ID or OAuth access token
   */
  constructor(request, instanceUrl, accessToken) {
    this.request = request;
    // Remove trailing slash
    this.instanceUrl = instanceUrl.replace(/\/+$/, "");
    this.accessToken = accessToken;
  }

  // ─── Factory Methods ─────────────────────────────────────────────────────

  /**
   * Create instance from a saved Playwright storageState file (sf-sit-session.json).
   * Extracts the `sid` cookie which doubles as a valid Bearer token.
   */
  static fromSessionFile(request, sessionFilePath, instanceUrl) {
    if (!fs.existsSync(sessionFilePath)) {
      throw new Error(
        `Session file not found: ${sessionFilePath}\n` +
          "Run: node scripts/sf-save-session.js"
      );
    }
    const state = JSON.parse(fs.readFileSync(sessionFilePath, "utf8"));
    const sidCookie = state.cookies?.find((c) => c.name === "sid");
    if (!sidCookie) {
      throw new Error(
        "No 'sid' cookie found in session file. Re-run sf-save-session.js."
      );
    }
    return new SalesforceAPI(request, instanceUrl, sidCookie.value);
  }

  /**
   * Create instance from an OAuth response (sfOAuthLogin result).
   */
  static fromOAuth(request, oauthResult) {
    return new SalesforceAPI(
      request,
      oauthResult.instanceUrl,
      oauthResult.accessToken
    );
  }

  // ─── Internal HTTP ───────────────────────────────────────────────────────

  /** @private */
  _headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    };
  }

  /** @private */
  _dataUrl(path = "") {
    return `${this.instanceUrl}/services/data/${SalesforceAPI.API_VERSION}${path}`;
  }

  /**
   * Make an authenticated API request.
   * @param {'get'|'post'|'patch'|'put'|'delete'} method
   * @param {string} url - Full URL
   * @param {object} [data] - Request body (for POST/PATCH/PUT)
   * @returns {Promise<any>} Parsed response body
   */
  async apiRequest(method, url, data) {
    const opts = { headers: this._headers() };
    if (data !== undefined) opts.data = data;

    const response = await this.request[method](url, opts);

    let body;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    if (!response.ok()) {
      const bodyStr =
        typeof body === "object" ? JSON.stringify(body) : String(body);
      const err = new Error(
        `SF API ${response.status()} ${method.toUpperCase()} ${url}\nBody: ${bodyStr}`
      );
      err.status = response.status();
      err.body = body;
      throw err;
    }

    // Check for Salesforce logical errors in the response body
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const errField = body.error ?? body.errorCode;
      if (errField && !body.id && !body.records) {
        const err = new Error(
          `Salesforce error: ${errField} — ${body.message ?? ""}`
        );
        err.body = body;
        throw err;
      }
    }

    return body;
  }

  // ─── Generic SOQL / sObject ──────────────────────────────────────────────

  /**
   * Execute a SOQL query.
   * @param {string} soql - SOQL query string
   * @returns {Promise<{ totalSize: number, records: object[] }>}
   */
  async query(soql) {
    const url = this._dataUrl(`/query?q=${encodeURIComponent(soql)}`);
    return this.apiRequest("get", url);
  }

  /**
   * Create an sObject record.
   * @param {string} sobjectType - e.g. "Opportunity", "Account"
   * @param {object} data - Field values
   * @returns {Promise<{ id: string, success: boolean }>}
   */
  async create(sobjectType, data) {
    const url = this._dataUrl(`/sobjects/${sobjectType}`);
    return this.apiRequest("post", url, data);
  }

  /**
   * Update an sObject record.
   * @param {string} sobjectType
   * @param {string} id - Record ID
   * @param {object} data - Fields to update
   */
  async update(sobjectType, id, data) {
    const url = this._dataUrl(`/sobjects/${sobjectType}/${id}`);
    await this.apiRequest("patch", url, data);
  }

  /**
   * Get an sObject record.
   * @param {string} sobjectType
   * @param {string} id
   * @param {string[]} [fields] - Specific fields to retrieve
   * @returns {Promise<object>}
   */
  async get(sobjectType, id, fields) {
    let url = this._dataUrl(`/sobjects/${sobjectType}/${id}`);
    if (fields?.length) {
      url += `?fields=${fields.join(",")}`;
    }
    return this.apiRequest("get", url);
  }

  /**
   * Delete an sObject record.
   * @param {string} sobjectType
   * @param {string} id
   */
  async delete(sobjectType, id) {
    const url = this._dataUrl(`/sobjects/${sobjectType}/${id}`);
    await this.apiRequest("delete", url);
  }

  /**
   * Look up a RecordType ID by SobjectType and DeveloperName.
   */
  async getRecordTypeId(sobjectType, developerName) {
    const result = await this.query(
      `SELECT Id FROM RecordType WHERE SobjectType = '${sobjectType}' AND DeveloperName = '${developerName}' LIMIT 1`
    );
    const id = result.records?.[0]?.Id;
    if (!id) {
      throw new Error(
        `RecordType '${developerName}' not found for ${sobjectType}`
      );
    }
    return id;
  }

  /**
   * Describe an sObject to discover fields, record types, etc.
   */
  async describe(sobjectType) {
    const url = this._dataUrl(`/sobjects/${sobjectType}/describe`);
    return this.apiRequest("get", url);
  }

  // ─── Opportunity ─────────────────────────────────────────────────────────

  /**
   * Create an Opportunity with required fields.
   * @param {object} data - Opportunity field values
   * @returns {Promise<string>} Created Opportunity ID
   */
  async createOpportunity(data) {
    const result = await this.create("Opportunity", data);
    console.log(`Created Opportunity: ${result.id}`);
    return result.id;
  }

  /**
   * Update Opportunity stage.
   */
  async updateOpportunityStage(id, stageName) {
    await this.update("Opportunity", id, { StageName: stageName });
    console.log(`Opportunity ${id} stage → ${stageName}`);
  }

  // ─── Quote ───────────────────────────────────────────────────────────────

  /**
   * Get Quotes related to an Opportunity.
   */
  async getQuotesForOpportunity(opportunityId) {
    return this.query(
      `SELECT Id, Name, Status ` +
        `FROM Quote ` +
        `WHERE OpportunityId = '${opportunityId}' ` +
        `ORDER BY CreatedDate DESC`
    );
  }

  /**
   * Update Quote stage/status.
   */
  async updateQuoteStage(quoteId, stage) {
    const ns = SalesforceAPI.VLOCITY_NS;
    await this.update(`${ns}__Quote__c`, quoteId, {
      [`${ns}__Status__c`]: stage
    });
    console.log(`Quote ${quoteId} stage → ${stage}`);
  }

  // ─── Contract ────────────────────────────────────────────────────────────

  /**
   * Update Contract status/stage.
   */
  async updateContractStatus(contractId, status) {
    await this.update("Contract", contractId, { Status: status });
    console.log(`Contract ${contractId} status → ${status}`);
  }

  /**
   * Get contracts related to a Quote.
   */
  async getContractsForQuote(quoteId) {
    const ns = SalesforceAPI.VLOCITY_NS;
    return this.query(
      `SELECT Id, Status, ContractNumber ` +
        `FROM Contract ` +
        `WHERE ${ns}__QuoteId__c = '${quoteId}' ` +
        `ORDER BY CreatedDate DESC`
    );
  }

  // ─── Approval Process ───────────────────────────────────────────────────

  /**
   * Submit a record for approval.
   * @param {string} recordId - Record to submit
   * @param {string} [comments] - Optional comments
   */
  async submitForApproval(recordId, comments = "Submitted by automation") {
    const url = this._dataUrl("/process/approvals");
    const result = await this.apiRequest("post", url, {
      requests: [
        {
          actionType: "Submit",
          contextId: recordId,
          comments
        }
      ]
    });
    console.log(`Submitted ${recordId} for approval`);
    return result;
  }

  /**
   * Approve a pending approval work item.
   * @param {string} recordId - The record that has a pending approval
   * @param {string} [comments]
   */
  async approveRecord(recordId, comments = "Approved by automation") {
    // First, find the pending work item
    const workItems = await this.query(
      `SELECT Id FROM ProcessInstanceWorkitem ` +
        `WHERE ProcessInstance.TargetObjectId = '${recordId}' ` +
        `AND ProcessInstance.Status = 'Pending' LIMIT 1`
    );
    const workItemId = workItems.records?.[0]?.Id;
    if (!workItemId) {
      throw new Error(`No pending approval found for record ${recordId}`);
    }

    const url = this._dataUrl("/process/approvals");
    const result = await this.apiRequest("post", url, {
      requests: [
        {
          actionType: "Approve",
          contextId: recordId,
          comments
        }
      ]
    });
    console.log(`Approved record ${recordId}`);
    return result;
  }

  // ─── Order ───────────────────────────────────────────────────────────────

  /**
   * Get orders related to a Contract.
   */
  async getOrdersForContract(contractId) {
    return this.query(
      `SELECT Id, OrderNumber, Status, Type ` +
        `FROM Order ` +
        `WHERE ContractId = '${contractId}' ` +
        `ORDER BY CreatedDate DESC`
    );
  }

  /**
   * Get sub-orders for a master order.
   */
  async getSubOrders(masterOrderId) {
    const ns = SalesforceAPI.VLOCITY_NS;
    return this.query(
      `SELECT Id, OrderNumber, Status, ${ns}__ParentOrderId__c ` +
        `FROM Order ` +
        `WHERE ${ns}__ParentOrderId__c = '${masterOrderId}' ` +
        `ORDER BY OrderNumber`
    );
  }

  /**
   * Update Order status.
   */
  async updateOrderStatus(orderId, status) {
    await this.update("Order", orderId, { Status: status });
    console.log(`Order ${orderId} status → ${status}`);
  }

  // ─── Orchestration ──────────────────────────────────────────────────────

  /**
   * Get Orchestration Plans for an Order.
   */
  async getOrchestrationPlans(orderId) {
    const ns = SalesforceAPI.VLOCITY_NS;
    return this.query(
      `SELECT Id, Name, ${ns}__State__c, ${ns}__OrderId__c ` +
        `FROM ${ns}__OrchestrationPlan__c ` +
        `WHERE ${ns}__OrderId__c = '${orderId}' ` +
        `ORDER BY CreatedDate DESC`
    );
  }

  /**
   * Get all Orchestration Items for a Plan.
   */
  async getOrchestrationItems(planId) {
    const ns = SalesforceAPI.VLOCITY_NS;
    return this.query(
      `SELECT Id, Name, ${ns}__State__c, ${ns}__OrchestrationPlanId__c, ` +
        `${ns}__OrderItemId__c, ${ns}__AutoTaskParameters__c ` +
        `FROM ${ns}__OrchestrationItem__c ` +
        `WHERE ${ns}__OrchestrationPlanId__c = '${planId}' ` +
        `ORDER BY ${ns}__Sequence__c`
    );
  }

  /**
   * Get a specific Orchestration Item by name within a plan.
   */
  async getOrchestrationItemByName(planId, itemName) {
    const ns = SalesforceAPI.VLOCITY_NS;
    const result = await this.query(
      `SELECT Id, Name, ${ns}__State__c ` +
        `FROM ${ns}__OrchestrationItem__c ` +
        `WHERE ${ns}__OrchestrationPlanId__c = '${planId}' ` +
        `AND Name = '${itemName}' LIMIT 1`
    );
    return result.records?.[0] ?? null;
  }

  /**
   * Retry a failed Orchestration Item.
   */
  async retryOrchestrationItem(itemId) {
    const ns = SalesforceAPI.VLOCITY_NS;
    await this.update(`${ns}__OrchestrationItem__c`, itemId, {
      [`${ns}__State__c`]: "Ready"
    });
    console.log(`Retried orchestration item ${itemId}`);
  }

  /**
   * Poll until an Orchestration Item reaches the expected status.
   * @param {string} itemId
   * @param {string} expectedState - e.g. "Completed", "Failed"
   * @param {number} [timeoutMs=120000] - Max wait time in ms
   * @param {number} [pollIntervalMs=5000] - Poll interval in ms
   * @returns {Promise<object>} The orchestration item record
   */
  async waitForOrchItemStatus(
    itemId,
    expectedState,
    timeoutMs = 120000,
    pollIntervalMs = 5000
  ) {
    const ns = SalesforceAPI.VLOCITY_NS;
    const start = Date.now();
    let lastState = "";

    while (Date.now() - start < timeoutMs) {
      const item = await this.get(`${ns}__OrchestrationItem__c`, itemId, [
        `${ns}__State__c`,
        "Name"
      ]);
      lastState = item[`${ns}__State__c`];

      if (lastState === expectedState) {
        console.log(
          `Orchestration item ${item.Name} reached state: ${expectedState}`
        );
        return item;
      }

      console.log(
        `Orch item ${item.Name}: ${lastState} (waiting for ${expectedState})...`
      );
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }

    throw new Error(
      `Orchestration item ${itemId} did not reach '${expectedState}' ` +
        `within ${timeoutMs}ms (last state: ${lastState})`
    );
  }

  // ─── Asset ──────────────────────────────────────────────────────────────

  /**
   * Check if Assets were created for an Account.
   */
  async getAssetsForAccount(accountId) {
    return this.query(
      `SELECT Id, Name, Status, Product2.Name ` +
        `FROM Asset ` +
        `WHERE AccountId = '${accountId}' ` +
        `ORDER BY CreatedDate DESC`
    );
  }

  // ─── Work Order ─────────────────────────────────────────────────────────

  /**
   * Get Work Orders linked to an Orchestration Item.
   */
  async getWorkOrderForOrchItem(orchItemId) {
    const ns = SalesforceAPI.VLOCITY_NS;
    // Work Orders are typically linked via a lookup or related list
    const result = await this.query(
      `SELECT Id, WorkOrderNumber, Status, Subject ` +
        `FROM WorkOrder ` +
        `WHERE ${ns}__OrchestrationItemId__c = '${orchItemId}' ` +
        `ORDER BY CreatedDate DESC LIMIT 1`
    );
    return result.records?.[0] ?? null;
  }

  /**
   * Get Work Orders for an Order.
   */
  async getWorkOrdersForOrder(orderId) {
    const ns = SalesforceAPI.VLOCITY_NS;
    return this.query(
      `SELECT Id, WorkOrderNumber, Status, Subject ` +
        `FROM WorkOrder ` +
        `WHERE ${ns}__OrderId__c = '${orderId}' ` +
        `ORDER BY CreatedDate`
    );
  }

  // ─── Utility ────────────────────────────────────────────────────────────

  /**
   * Execute an Apex REST endpoint.
   * @param {string} endpoint - e.g. "/vlocity_cmt/v1/cpq/carts/"
   * @param {'get'|'post'|'patch'|'put'|'delete'} method
   * @param {object} [data]
   */
  async apexRest(endpoint, method = "get", data) {
    const url = `${this.instanceUrl}/services/apexrest${endpoint}`;
    return this.apiRequest(method, url, data);
  }

  /**
   * Execute anonymous Apex (for complex server-side operations).
   * Uses the Tooling API.
   */
  async executeApex(apexCode) {
    const url = `${this.instanceUrl}/services/data/${SalesforceAPI.API_VERSION}/tooling/executeAnonymous?anonymousBody=${encodeURIComponent(apexCode)}`;
    return this.apiRequest("get", url);
  }
}
