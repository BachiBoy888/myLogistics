# QA CHECKLIST — MYLOGISTICS (FINAL)

This checklist is MANDATORY before merging any Pull Request.

Goal:
- system stability
- data integrity
- architecture safety
- correct product behavior

If any check is not verified:
→ mark as UNVERIFIED  
→ DO NOT MERGE

---

# FINAL VERIFICATION REPORT (REQUIRED)

Must be filled before merge:

Backend parse: OK / UNVERIFIED  
Backend startup: OK / UNVERIFIED  
API routes: OK / UNVERIFIED  
Database consistency: OK / UNVERIFIED  
Transaction safety: OK / UNVERIFIED  
Frontend network behavior: OK / UNVERIFIED  
Cargo card rule: OK / UNVERIFIED  
Tabs request rule: OK / UNVERIFIED  
Lead conversion: OK / UNVERIFIED  
Concurrency: OK / UNVERIFIED  
Data integrity: OK / UNVERIFIED  
CI status: OK / UNVERIFIED  
Preview deployment: OK / UNVERIFIED  

---

# SYSTEM CHECKS

## Backend Startup

- [ ] backend starts without errors
- [ ] no runtime exceptions
- [ ] routes are registered

---

## API Routes

- [ ] endpoints respond correctly
- [ ] correct HTTP status codes
- [ ] no silent failures

---

## Database Consistency

- [ ] migrations applied
- [ ] schema correct
- [ ] queries return expected data

---

## Transaction Safety

- [ ] multi-entity operations use transactions
- [ ] no partial updates possible

---

# FRONTEND RULES

## Network Behavior

- [ ] no unexpected API calls
- [ ] no N+1 patterns

---

## Cargo Card Rule

Opening cargo card MUST trigger:

GET /api/pl/:id

- [ ] exactly one request

---

## Tabs Rule

- [ ] no additional API calls on tab switch
- [ ] unless explicitly required

---

## State Consistency

- [ ] UI reloads state after mutation
- [ ] no optimistic fake state

---

## UI Stability

- [ ] no crashes
- [ ] no console errors

---

# DOMAIN CHECKS — LEAD CONVERSION (CRITICAL)

## Preview Endpoint

- [ ] returns 200 always
- [ ] returns lead data
- [ ] returns suggestions
- [ ] returns match arrays

---

## Already Converted

- [ ] isAlreadyConverted = true
- [ ] convertedPlId present

---

## Conversion Logic

### Mode = existing

- [ ] valid clientId → PL created
- [ ] invalid → 404
- [ ] missing → 400

### Mode = new

- [ ] new client created
- [ ] PL created
- [ ] lead updated

---

## Explicit Behavior

- [ ] no auto client linking
- [ ] no silent decisions

---

## Phone Matching

- [ ] normalization works
- [ ] formats match same client
- [ ] invalid phone handled safely

---

## Concurrency

- [ ] parallel requests handled
- [ ] no duplicate PLs
- [ ] second request returns 409

---

## Transaction Integrity

- [ ] no orphan clients
- [ ] no orphan PLs
- [ ] rollback on failure

---

## Data Consistency

- [ ] PL always has valid clientId
- [ ] lead cannot convert twice
- [ ] no inconsistent states

---

# REGRESSION CHECKS

- [ ] PL creation works
- [ ] consolidation logic intact
- [ ] documents unaffected
- [ ] kanban flow intact

---

# PERFORMANCE

- [ ] no full-table scans
- [ ] queries optimized
- [ ] response time acceptable

---

# CI & DEPLOYMENT

## CI

- [ ] build passes
- [ ] tests pass

## Preview

- [ ] app loads
- [ ] feature works
- [ ] no runtime errors

---

# FINAL RULE

If ANY critical check fails:

→ DO NOT MERGE

If ANY item is UNVERIFIED:

→ DO NOT CLAIM COMPLETION
