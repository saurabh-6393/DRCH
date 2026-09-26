# Final Contract Consistency Check

**Version:** 1.0.0
**Date:** 2026-09-26
**Type:** Read-Only Audit — No Files Modified

---

## Purpose

Before GitHub preparation, verify that the two flagged discrepancies from the Final Read-Only Audit Report are actual implementation drift or reporting errors.

| # | Check | Contract Source | Audit Report Claim | Actual Implementation |
|---|-------|----------------|--------------------|-----------------------|
| 1 | Evidence Upload Size | 5 MB | 10 MB | **See CHECK 1** |
| 2 | bcrypt Cost Factor | 12 rounds | 10 rounds | **See CHECK 2** |

---

## CHECK 1 — Evidence Upload Size

### Frozen Contract Requirement

Multiple frozen documents specify a **5 MB** maximum:

| Document | Line | Text |
|----------|------|------|
| `Docs/phases.md` | 55 | "Implement backend-mediated media upload with **5MB** size validation…" |
| `Docs/phases.md` | 67 | "Backend rejects files larger than **5MB**…" |
| `Docs/security.md` | 45 | "File Size: Strictly limited to a maximum of **5MB**." |
| `Docs/phase5_final_contract.md` | 391 | "Incident Submission Latency: Total submission time with **5MB** image upload…" |
| `Docs/phase5_discovery_audit.md` | 167 | "Upload validation: Size (**5MB**), extension whitelist, magic bytes" |
| `Docs/phase5_discovery_audit.md` | 466 | "Form submission with **5MB** image" |

### Actual Implementation

**Backend — `backend/src/middleware/upload.ts`**

```typescript
// Line 6
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit
```

```typescript
// Line 25
'Invalid file format or extension. Only PNG, JPG, JPEG, and WEBP files under 5MB are allowed.'
```

```typescript
// Line 80
'File exceeds 5MB size limit. Please upload a smaller image.'
```

**Frontend — `frontend/src/features/incidents/IncidentReportForm.tsx`**

```typescript
// Line 28-30
// Client-side file size check (5MB)
if (selectedFile.size > 5 * 1024 * 1024) {
    setError('File size exceeds 5MB limit. Please choose a smaller image.');
}
```

```tsx
// Line 227
Photo Evidence (PNG, JPG, WEBP - Max 5MB)
```

### Verdict

| Item | Value |
|------|-------|
| Contract | 5 MB |
| Implementation | **5 MB** |
| Status | ✅ **CONTRACT CONSISTENT** |

The audit report (`final_readonly_audit_report.md` line 184) incorrectly stated "10 MB". This was a **reporting error**, not implementation drift.

---

## CHECK 2 — bcrypt Cost Factor

### Frozen Contract Requirement

| Document | Line | Text |
|----------|------|------|
| `Docs/phase5_discovery_audit.md` | 460 | "bcrypt hash time ≤ 500ms at **12 rounds**" |

### Actual Implementation

**`backend/src/modules/auth/auth.service.ts`**

```typescript
// Line 14
const BCRYPT_ROUNDS = 12;
```

```typescript
// Line 37
const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

### Verdict

| Item | Value |
|------|-------|
| Contract | 12 rounds |
| Implementation | **12 rounds** |
| Status | ✅ **CONTRACT CONSISTENT** |

The audit report (`final_readonly_audit_report.md` line 178) and validation report (`drch_validation_report.md` line 85) both incorrectly stated "10 rounds". This was a **reporting error**, not implementation drift.

---

## CHECK 3 — General Contract Drift Scan

Checked for any other obvious contradictions between the final audit report and frozen contracts:

| Area | Contract | Implementation | Status |
|------|----------|---------------|--------|
| Cookie `access_token` TTL | 15 minutes | 15 minutes | ✅ |
| Cookie `refresh_token` TTL | 7 days | 7 days | ✅ |
| RBAC roles | `responder`, `moderator`, `admin` | `responder`, `moderator`, `admin` | ✅ |
| Allowed image types | PNG, JPEG, WEBP | PNG, JPEG, WEBP | ✅ |
| Magic-byte validation | Required | Implemented | ✅ |
| Rate limiting (auth) | 5 req / 15 min | 5 req / 15 min | ✅ |
| Helmet CSP | Enforced | Enforced | ✅ |
| Audit logging | Immutable, redacted | Implemented | ✅ |
| Non-root Docker | Required | `nodeuser` UID 10001 | ✅ |

No additional contract drift found.

---

## Identified Reporting Errors

The following lines in previously generated reports contain factual errors (the **implementation is correct**; only the report text is wrong):

| File | Line | Error | Correct Value |
|------|------|-------|---------------|
| `Docs/final_readonly_audit_report.md` | 178 | States "bcrypt (10 rounds)" | Should be "bcrypt (12 rounds)" |
| `Docs/final_readonly_audit_report.md` | 184 | States "max file size (10 MB)" | Should be "max file size (5 MB)" |
| `Docs/drch_validation_report.md` | 85 | States "bcrypt (10 rounds)" | Should be "bcrypt (12 rounds)" |

These are documentation reporting errors only. The actual application code is contract-consistent.

---

## FINAL STATUS

```
REPORTING ERROR FOUND — IMPLEMENTATION IS CONSISTENT
```

The implementation matches all frozen contract requirements. The discrepancies originated from incorrect values written in two audit/validation report documents, not from actual code drift.

**Recommended action:** Correct the three reporting errors in `final_readonly_audit_report.md` and `drch_validation_report.md` before GitHub preparation.
