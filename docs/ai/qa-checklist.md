# QA CHECKLIST — MYLOGISTICS

This checklist defines the verification steps that must be performed
before any Pull Request can be merged.

The goal is to ensure:

- system stability
- architecture safety
- backend integrity
- correct frontend behavior
- CI reliability


---------------------------------------------------------------------
GENERAL RULE

A change must NOT be merged unless this checklist passes.

If any step is not verified it must be marked:

UNVERIFIED


---------------------------------------------------------------------
BACKEND STARTUP CHECK

Verify that backend starts successfully.

Steps:

1. Run backend locally or via CI.
2. Confirm server starts without syntax errors.
3. Confirm no runtime exceptions appear during startup.
4. Confirm routes are registered.

Expected result:

Backend starts successfully.


---------------------------------------------------------------------
API ROUTE REGISTRATION

Verify that modified routes are properly registered.

Steps:

1. Start backend.
2. Call affected endpoints.
3. Confirm they respond correctly.
4. Confirm correct HTTP status codes.

Expected result:

All routes respond correctly.


---------------------------------------------------------------------
DATABASE CONSISTENCY

Verify database integrity.

Steps:

1. Run migrations if required.
2. Confirm tables exist.
3. Confirm schema matches expected structure.
4. Confirm queries work correctly.

Expected result:

Database state is valid and consistent.


---------------------------------------------------------------------
TRANSACTION SAFETY

If backend logic modifies multiple tables:

Verify that operations run inside a transaction.

Steps:

1. Inspect modified backend code.
2. Confirm db.transaction() is used when required.

Expected result:

No partial database updates possible.


---------------------------------------------------------------------
FRONTEND NETWORK CHECK

Verify frontend request behavior.

Steps:

1. Open browser DevTools.
2. Go to Network tab.
3. Perform the user action affected by the change.
4. Observe network calls.

Expected result:

No unexpected API calls.

No N+1 patterns.


---------------------------------------------------------------------
CARGO CARD RULE

Opening a cargo card must trigger exactly:

GET /api/pl/:id

Steps:

1. Open cargo card.
2. Inspect Network tab.

Expected result:

Exactly one request is sent.


---------------------------------------------------------------------
TAB REQUEST RULE

Tabs must NOT trigger additional API requests unless the backend requires it.

Steps:

1. Open cargo card.
2. Switch between tabs.
3. Inspect Network tab.

Expected result:

No unexpected additional requests.


---------------------------------------------------------------------
FRONTEND STATE RULE

Frontend must reload state from backend after mutations.

Steps:

1. Perform mutation action (create/update/delete).
2. Observe UI behavior.
3. Confirm UI reloads backend state.

Expected result:

Frontend reflects backend-confirmed state.


---------------------------------------------------------------------
UI STABILITY

Verify the UI remains stable.

Steps:

1. Perform affected user flows.
2. Confirm UI renders correctly.
3. Confirm no console errors.

Expected result:

No UI crashes or rendering errors.


---------------------------------------------------------------------
CI STATUS

Verify CI pipeline.

Steps:

1. Wait for CI to complete.
2. Confirm build passes.
3. Confirm tests pass.

Expected result:

CI is green.


---------------------------------------------------------------------
PREVIEW DEPLOYMENT

Verify Render preview deployment.

Steps:

1. Open preview URL.
2. Test modified functionality.
3. Confirm application loads correctly.

Expected result:

Preview works correctly.


---------------------------------------------------------------------
FINAL VERIFICATION REPORT

Before merging a PR the following must be documented:

Backend parse: OK / UNVERIFIED  
Backend startup: OK / UNVERIFIED  
API routes: OK / UNVERIFIED  
Database consistency: OK / UNVERIFIED  
Frontend network behavior: OK / UNVERIFIED  
Cargo card request rule: OK / UNVERIFIED  
Tabs request rule: OK / UNVERIFIED  
UI stability: OK / UNVERIFIED  
CI status: OK / UNVERIFIED  
Preview deployment: OK / UNVERIFIED


---------------------------------------------------------------------
FINAL RULE

If any critical check fails:

DO NOT MERGE THE PR.
