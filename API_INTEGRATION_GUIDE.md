# myLogistics Public API Documentation

**Version:** 1.0  
**Last Updated:** March 18, 2026  
**For:** External website developers integrating with myLogistics CRM

---

## 1. Overview

The myLogistics Public API allows external websites to:

1. **Calculate shipping estimates** — Get instant price and delivery time estimates based on cargo weight, volume, and delivery type
2. **Create leads** — Submit customer inquiries directly into the myLogistics CRM system

### Key Principles

- **Backend is the source of truth** — Never calculate prices in the frontend. Always use the API response
- **Simple HTTP/JSON** — No complex authentication for public endpoints
- **Rate limited** — Protects against abuse while allowing legitimate usage
- **Bot-protected** — Honeypot field prevents automated spam submissions

### Architecture Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  External Site  │────▶│  myLogistics API │────▶│  myLogistics    │
│  (Your Website) │     │  (This Backend)  │     │  CRM Dashboard  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 2. Base URL Configuration

### Environment URLs

| Environment | Base URL | Usage |
|-------------|----------|-------|
| **Staging** | `https://mylogistics-staging.onrender.com` | Development and testing |
| **Production** | `https://api.mylogistics.com` (example) | Live customer traffic |

> **Note:** Your myLogistics administrator will provide the exact production URL.

### CORS Requirements

Before integration, your domain **must** be added to the `ALLOWED_ORIGINS` environment variable:

```
ALLOWED_ORIGINS=https://your-website.com,https://www.your-website.com
```

Contact your myLogistics administrator with your domain to whitelist it.

---

## 3. Endpoint: Calculate Shipping Estimate

Get an instant shipping price and delivery time estimate.

### Request

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/public/calculate` |
| **Authentication** | None (public endpoint) |
| **Rate Limit** | 30 requests per minute per IP |

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `X-Source` | Recommended | Source identifier: `website_calculator`, `prolife_site`, or `external_site` |

### Request Body

```json
{
  "weight": 150.5,
  "volume": 2.5,
  "deliveryType": "air",
  "originCity": "Shanghai",
  "destinationCity": "Moscow",
  "cargoName": "Electronics"
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `weight` | number | **Yes** | Cargo weight in kilograms (must be > 0) |
| `volume` | number | **Yes** | Cargo volume in cubic meters (must be > 0) |
| `deliveryType` | string | **Yes** | Transport mode: `air`, `road`, or `express` |
| `originCity` | string | No | Departure city (for reference) |
| `destinationCity` | string | No | Arrival city (for reference) |
| `cargoName` | string | No | Description of goods (for reference) |

### Response

**Status:** `200 OK`

```json
{
  "estimatedPrice": 1279.25,
  "estimatedCurrency": "USD",
  "estimatedDaysMin": 4,
  "estimatedDaysMax": 6,
  "calculatorPayload": {
    "weight": 150.5,
    "volume": 2.5,
    "originCity": "Shanghai",
    "destinationCity": "Moscow",
    "deliveryType": "air",
    "cargoName": "Electronics"
  }
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `estimatedPrice` | number | Calculated shipping cost in USD |
| `estimatedCurrency` | string | Currency code (always "USD") |
| `estimatedDaysMin` | integer | Minimum delivery time in days |
| `estimatedDaysMax` | integer | Maximum delivery time in days |
| `calculatorPayload` | object | Echo of input parameters |

### Validation Rules

| Rule | Error Response |
|------|----------------|
| Weight must be > 0 | `400 Bad Request`: "Вес должен быть положительным числом" |
| Volume must be > 0 | `400 Bad Request`: "Объём должен быть положительным числом" |
| Delivery type must be valid | `400 Bad Request`: "Тип доставки должен быть: air, road или express" |

### Error Cases

| Status | Code | Description |
|--------|------|-------------|
| `400` | `bad_request` | Invalid input parameters |
| `429` | `rate_limit` | Too many requests (30/min limit exceeded) |
| `500` | `calculate_failed` | Internal server error |

### Example cURL

```bash
curl -X POST https://mylogistics-staging.onrender.com/api/public/calculate \
  -H "Content-Type: application/json" \
  -H "X-Source: external_site" \
  -d '{
    "weight": 150.5,
    "volume": 2.5,
    "deliveryType": "air",
    "originCity": "Shanghai",
    "destinationCity": "Moscow",
    "cargoName": "Electronics"
  }'
```

---

## 4. Endpoint: Create Lead

Submit a customer inquiry to the myLogistics CRM.

### Request

| Property | Value |
|----------|-------|
| **Method** | `POST` |
| **Path** | `/api/leads` |
| **Authentication** | None (public endpoint) |
| **Rate Limit** | 5 requests per minute per IP |

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | Must be `application/json` |
| `X-Source` | Recommended | Source identifier (see below) |

### X-Source Header Behavior

The `X-Source` header (or `?source=` query parameter) tags where the lead came from:

| Value | Usage |
|-------|-------|
| `website_calculator` | Default. myLogistics main website calculator |
| `prolife_site` | ProLife partner website |
| `external_site` | Generic external integration |

**Behavior:**
- If valid source provided → stored in CRM
- If invalid/missing → defaults to `website_calculator`
- Used for reporting and attribution

### Honeypot Field Protection

To prevent bot submissions, include a hidden `website` field:

```html
<!-- Include in your form, hidden from real users -->
<input type="hidden" name="website" value="">
```

**Important:**
- Real users should never see or fill this field
- If the field contains any value, the submission is silently rejected (bot detected)
- The API returns a fake success response to avoid revealing the protection

### Request Body

```json
{
  "name": "Ivan Petrov",
  "phone": "+7 999 123-45-67",
  "company": "OOO Example",
  "email": "ivan@example.com",
  "note": "Urgent shipment needed",
  "cargoName": "Electronics",
  "weight": 150.5,
  "volume": 2.5,
  "originCity": "Shanghai",
  "destinationCity": "Moscow",
  "deliveryType": "air",
  "estimatedPrice": 1279.25,
  "estimatedCurrency": "USD",
  "estimatedDaysMin": 4,
  "estimatedDaysMax": 6,
  "website": ""
}
```

#### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **Yes** | Customer name (min 1 character) |
| `phone` | string | **Yes** | Phone number (min 5 characters) |
| `company` | string | No | Company name |
| `email` | string | No | Email address |
| `note` | string | No | Additional notes |
| `cargoName` | string | No | Description of cargo |
| `weight` | number | **Yes** | Cargo weight in kg (> 0) |
| `volume` | number | **Yes** | Cargo volume in m³ (> 0) |
| `originCity` | string | No | Departure city |
| `destinationCity` | string | No | Destination city |
| `deliveryType` | string | **Yes** | `air`, `road`, or `express` |
| `estimatedPrice` | number | No | Pre-calculated price (if not provided, recalculated) |
| `estimatedCurrency` | string | No | Currency (default: USD) |
| `estimatedDaysMin` | number | No | Min delivery days |
| `estimatedDaysMax` | number | No | Max delivery days |
| `website` | string | No | **Honeypot** — must be empty |

### Response

**Status:** `200 OK`

```json
{
  "success": true,
  "leadId": 12345,
  "message": "Заявка принята. Мы свяжемся с вами."
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Always `true` for accepted submissions |
| `leadId` | number | Unique ID of the created lead (null if honeypot triggered) |
| `message` | string | Confirmation message for the user |

### Validation Rules

| Rule | Error Response |
|------|----------------|
| Name is required | `400`: "Имя обязательно" |
| Phone min 5 chars | `400`: "Телефон обязателен (минимум 5 символов)" |
| Weight > 0 | `400`: "Вес должен быть положительным числом" |
| Volume > 0 | `400`: "Объём должен быть положительным числом" |
| Valid delivery type | `400`: "Тип доставки должен быть: air, road или express" |
| Honeypot filled | Returns fake success (bot blocked silently) |

### Error Cases

| Status | Code | Description |
|--------|------|-------------|
| `400` | `bad_request` | Validation error (missing/invalid fields) |
| `429` | `rate_limit` | Too many requests (5/min limit exceeded) |
| `500` | `create_lead_failed` | Internal server error |

### Example cURL

```bash
curl -X POST https://mylogistics-staging.onrender.com/api/leads \
  -H "Content-Type: application/json" \
  -H "X-Source: external_site" \
  -d '{
    "name": "Ivan Petrov",
    "phone": "+7 999 123-45-67",
    "company": "OOO Example",
    "email": "ivan@example.com",
    "cargoName": "Electronics",
    "weight": 150.5,
    "volume": 2.5,
    "originCity": "Shanghai",
    "destinationCity": "Moscow",
    "deliveryType": "air",
    "website": ""
  }'
```

---

## 5. Integration Flow

Complete user journey from calculator to CRM:

```
Step 1: User fills calculator form on your website
        ├─ Enters: weight, volume, origin, destination, delivery type
        └─ Clicks: "Get Estimate"

Step 2: Your website calls POST /api/public/calculate
        ├─ Sends: calculator data
        └─ Receives: { estimatedPrice, estimatedDaysMin, estimatedDaysMax }

Step 3: Display estimate to user
        ├─ Show: "$1,279 USD, 4-6 days"
        └─ Show: "Request Quote" button

Step 4: User fills contact form
        ├─ Enters: name, phone, email, company
        └─ Clicks: "Submit Request"

Step 5: Your website calls POST /api/leads
        ├─ Sends: contact info + calculator data + estimate
        └─ Receives: { success: true, leadId: 12345 }

Step 6: Lead appears in myLogistics CRM
        ├─ Status: "new"
        ├─ Source: "external_site" (from X-Source header)
        └─ Manager can view and process
```

### Data Flow Diagram

```javascript
// Step 1 & 2: Get estimate
const estimate = await fetch('/api/public/calculate', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Source': 'external_site'
  },
  body: JSON.stringify({
    weight: 150.5,
    volume: 2.5,
    deliveryType: 'air',
    originCity: 'Shanghai',
    destinationCity: 'Moscow'
  })
}).then(r => r.json());

// Step 3: Display to user
// Show: $1,279 USD, delivery 4-6 days

// Step 4 & 5: Submit lead
const lead = await fetch('/api/leads', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Source': 'external_site'
  },
  body: JSON.stringify({
    // Contact info
    name: 'Ivan Petrov',
    phone: '+7 999 123-45-67',
    email: 'ivan@example.com',
    company: 'OOO Example',
    
    // Calculator data (from step 1)
    cargoName: 'Electronics',
    weight: 150.5,
    volume: 2.5,
    originCity: 'Shanghai',
    destinationCity: 'Moscow',
    deliveryType: 'air',
    
    // Estimate (from step 2)
    estimatedPrice: estimate.estimatedPrice,
    estimatedCurrency: estimate.estimatedCurrency,
    estimatedDaysMin: estimate.estimatedDaysMin,
    estimatedDaysMax: estimate.estimatedDaysMax,
    
    // Honeypot (always empty)
    website: ''
  })
}).then(r => r.json());

// Step 6: Show confirmation
// "Thank you! Reference #12345"
```

---

## 6. Postman Testing Guide

### Setup

1. **Import this collection** or create manually:

```json
{
  "info": {
    "name": "myLogistics Public API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Calculate Estimate",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "X-Source", "value": "external_site" }
        ],
        "url": "{{baseUrl}}/api/public/calculate",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"weight\": 150.5,\n  \"volume\": 2.5,\n  \"deliveryType\": \"air\",\n  \"originCity\": \"Shanghai\",\n  \"destinationCity\": \"Moscow\",\n  \"cargoName\": \"Test Cargo\"\n}"
        }
      }
    },
    {
      "name": "2. Create Lead",
      "request": {
        "method": "POST",
        "header": [
          { "key": "Content-Type", "value": "application/json" },
          { "key": "X-Source", "value": "external_site" }
        ],
        "url": "{{baseUrl}}/api/leads",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"name\": \"Test User\",\n  \"phone\": \"+7 999 123-45-67\",\n  \"email\": \"test@example.com\",\n  \"company\": \"Test Company\",\n  \"cargoName\": \"Electronics\",\n  \"weight\": 150.5,\n  \"volume\": 2.5,\n  \"originCity\": \"Shanghai\",\n  \"destinationCity\": \"Moscow\",\n  \"deliveryType\": \"air\",\n  \"website\": \"\"\n}"
        }
      }
    }
  ],
  "variable": [
    { "key": "baseUrl", "value": "https://mylogistics-staging.onrender.com" }
  ]
}
```

### Testing Steps

#### Test 1: Calculate Estimate

1. Set `baseUrl` variable to your environment URL
2. Send **"1. Calculate Estimate"** request
3. **Expected Result:**
   - Status: `200 OK`
   - Body contains: `estimatedPrice`, `estimatedCurrency`, `estimatedDaysMin`, `estimatedDaysMax`
   - Price should be > $50 (minimum)

#### Test 2: Create Lead

1. Send **"2. Create Lead"** request
2. **Expected Result:**
   - Status: `200 OK`
   - Body: `{ "success": true, "leadId": <number>, "message": "..." }`
   - Save the `leadId` for verification

#### Test 3: Verify in CRM

1. Log into myLogistics CRM dashboard
2. Navigate to **Leads** section
3. Find the lead with ID from Test 2
4. Verify:
   - Source is "external_site"
   - Calculator data is saved
   - Status is "new"

#### Test 4: Honeypot Protection

1. Modify **"2. Create Lead"** request
2. Change `"website": ""` to `"website": "test"`
3. Send request
4. **Expected Result:**
   - Status: `200 OK` (fake success)
   - No lead created in CRM (bot blocked silently)

#### Test 5: Rate Limiting

1. Send **"1. Calculate Estimate"** 31 times rapidly
2. **Expected Result:**
   - First 30 requests: `200 OK`
   - 31st request: `429 Too Many Requests`

---

## 7. Best Practices

### DO ✅

| Practice | Reason |
|----------|--------|
| **Always call `/public/calculate` first** | Ensures user sees accurate pricing |
| **Use the API response prices** | Backend is source of truth for pricing |
| **Pass `X-Source: external_site` header** | Proper attribution in CRM |
| **Include empty `website` field** | Bot protection |
| **Store the full estimate response** | Pass all fields to lead creation |
| **Handle 429 errors gracefully** | Show "Please try again in a minute" |
| **Ensure your domain is whitelisted** | Contact admin before deployment |

### DON'T ❌

| Practice | Reason |
|----------|--------|
| **Calculate prices in frontend** | Prices will be wrong, bypasses business logic |
| **Skip the calculator step** | Leads without estimates have lower quality |
| **Omit the `website` field** | Loses bot protection |
| **Ignore rate limits** | Your IP may be blocked |
| **Send test data to production** | Pollutes real CRM data |

### Security Checklist

- [ ] Domain added to `ALLOWED_ORIGINS`
- [ ] Honeypot field implemented and hidden
- [ ] Rate limit errors handled in UI
- [ ] HTTPS used for all API calls
- [ ] No API keys/secrets exposed in frontend

---

## 8. Troubleshooting

### 400 Bad Request — Validation Error

**Symptoms:** Response body contains Russian error message

**Common Causes:**
```json
// Weight is zero or negative
{ "weight": 0, "volume": 2.5, "deliveryType": "air" }

// Missing required field
{ "weight": 100, "volume": 2.5 }  // deliveryType missing

// Invalid delivery type
{ "weight": 100, "volume": 2.5, "deliveryType": "ship" }
```

**Fix:** Check all required fields and validation rules

---

### 429 Too Many Requests — Rate Limit

**Symptoms:** Status `429`, body may contain rate limit info

**Limits:**
- `/api/public/calculate`: 30 requests per minute
- `/api/leads`: 5 requests per minute

**Fix:** Implement client-side rate limiting or caching

---

### CORS Error — Origin Not Allowed

**Symptoms:** Browser console shows:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**Cause:** Your domain is not in `ALLOWED_ORIGINS`

**Fix:** Contact myLogistics administrator with your domain

---

### Lead Not Visible in CRM

**Possible Causes:**

1. **Honeypot triggered** — Check if `website` field was accidentally filled
2. **Wrong environment** — Test lead in staging, checking production CRM
3. **Filter applied** — CRM may have status/source filters active

**Debug Steps:**
1. Check response — did you get a `leadId`?
2. If no `leadId` — honeypot blocked it
3. If `leadId` present — check CRM filters or contact admin

---

### Invalid Source Handling

**If you pass invalid `X-Source`:**
```bash
X-Source: invalid_source
```

**Behavior:** Lead is created with `source: "website_calculator"` (fallback)

**Fix:** Use one of: `website_calculator`, `prolife_site`, `external_site`

---

### 500 Internal Server Error

**Symptoms:** Status `500`, response: `{ "error": "calculate_failed" }`

**Cause:** Server-side error

**Fix:** 
1. Retry the request
2. If persists, contact myLogistics administrator with:
   - Timestamp
   - Request body (sanitized)
   - Endpoint URL

---

## Appendix A: Delivery Type Reference

| Type | Speed | Use Case |
|------|-------|----------|
| `air` | 4-6 days | Fast, expensive, smaller cargo |
| `road` | 10-15 days | Cost-effective, larger volumes |
| `express` | 2-4 days | Premium speed, urgent shipments |

### Pricing Formula (Reference Only)

```
weightCost = weight × rate.perKg
volumeCost = volume × rate.perCbm
price = max(weightCost, volumeCost, $50 minimum)

Rates:
- air:     $8.50/kg, $1200/m³
- road:    $2.50/kg, $350/m³
- express: $12.00/kg, $1800/m³
```

> ⚠️ **Always use the API response** — these rates are for reference only and may change.

---

## Appendix B: Complete Example Integration

### HTML Form

```html
<form id="calculator-form">
  <input type="number" name="weight" placeholder="Weight (kg)" required>
  <input type="number" name="volume" placeholder="Volume (m³)" required>
  <select name="deliveryType" required>
    <option value="air">Air</option>
    <option value="road">Road</option>
    <option value="express">Express</option>
  </select>
  <input type="text" name="originCity" placeholder="From">
  <input type="text" name="destinationCity" placeholder="To">
  <button type="submit">Get Estimate</button>
</form>

<div id="estimate-result" style="display:none;">
  <p>Price: <span id="price"></span></p>
  <p>Delivery: <span id="days"></span> days</p>
  <button id="show-contact">Request Quote</button>
</div>

<form id="lead-form" style="display:none;">
  <input type="text" name="name" placeholder="Your Name" required>
  <input type="tel" name="phone" placeholder="Phone" required>
  <input type="email" name="email" placeholder="Email">
  <input type="text" name="company" placeholder="Company">
  <!-- Honeypot field - hidden from users -->
  <input type="hidden" name="website" value="">
  <button type="submit">Submit Request</button>
</form>
```

### JavaScript Integration

```javascript
const API_BASE = 'https://mylogistics-staging.onrender.com';
const SOURCE = 'external_site';

let currentEstimate = null;

// Step 1: Calculator form
document.getElementById('calculator-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const response = await fetch(`${API_BASE}/api/public/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Source': SOURCE
    },
    body: JSON.stringify({
      weight: Number(formData.get('weight')),
      volume: Number(formData.get('volume')),
      deliveryType: formData.get('deliveryType'),
      originCity: formData.get('originCity'),
      destinationCity: formData.get('destinationCity')
    })
  });
  
  if (!response.ok) {
    alert('Failed to get estimate. Please try again.');
    return;
  }
  
  currentEstimate = await response.json();
  
  // Display result
  document.getElementById('price').textContent = 
    `$${currentEstimate.estimatedPrice} ${currentEstimate.estimatedCurrency}`;
  document.getElementById('days').textContent = 
    `${currentEstimate.estimatedDaysMin}-${currentEstimate.estimatedDaysMax}`;
  document.getElementById('estimate-result').style.display = 'block';
});

// Step 2: Show contact form
document.getElementById('show-contact').addEventListener('click', () => {
  document.getElementById('lead-form').style.display = 'block';
});

// Step 3: Submit lead
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const response = await fetch(`${API_BASE}/api/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Source': SOURCE
    },
    body: JSON.stringify({
      // Contact info
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      company: formData.get('company'),
      
      // Calculator data
      weight: currentEstimate.calculatorPayload.weight,
      volume: currentEstimate.calculatorPayload.volume,
      deliveryType: currentEstimate.calculatorPayload.deliveryType,
      originCity: currentEstimate.calculatorPayload.originCity,
      destinationCity: currentEstimate.calculatorPayload.destinationCity,
      cargoName: currentEstimate.calculatorPayload.cargoName,
      
      // Estimate
      estimatedPrice: currentEstimate.estimatedPrice,
      estimatedCurrency: currentEstimate.estimatedCurrency,
      estimatedDaysMin: currentEstimate.estimatedDaysMin,
      estimatedDaysMax: currentEstimate.estimatedDaysMax,
      
      // Honeypot
      website: formData.get('website') || ''
    })
  });
  
  if (!response.ok) {
    if (response.status === 429) {
      alert('Too many requests. Please wait a minute and try again.');
    } else {
      alert('Failed to submit. Please try again.');
    }
    return;
  }
  
  const result = await response.json();
  alert(`Thank you! Your request #${result.leadId} has been received.`);
  
  // Reset forms
  document.getElementById('calculator-form').reset();
  document.getElementById('lead-form').reset();
  document.getElementById('estimate-result').style.display = 'none';
  document.getElementById('lead-form').style.display = 'none';
});
```

---

**End of Documentation**

For questions or support, contact your myLogistics administrator.
