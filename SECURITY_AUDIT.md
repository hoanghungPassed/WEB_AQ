# Security Audit Report

## 1. Executive Summary
The security audit of WEB_AQ revealed critical vulnerabilities in file handling and rate limiting that pose immediate risks to the system. While authentication relies on standard JWT practices, several structural anti-patterns create potential vectors for exploitation.

**Overall Risk Score:** HIGH

## 2. Findings

### [CRITICAL] Arbitrary File Upload & Path Traversal
- **File:** `src/app/api/upload/route.ts`
- **Description:** The upload API directly uses the provided `file.name` to construct the file path on the server without strict sanitization.
  ```typescript
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  ```
- **Impact:** An attacker can upload arbitrary files (e.g., HTML, JS, SVG) resulting in Cross-Site Scripting (XSS) when served statically. Additionally, if the client sends a manipulated filename like `../../../etc/passwd`, it might write outside the intended directory.
- **Remediation:** Whitelist allowed extensions. Generate a completely randomized filename (e.g., UUID) and strip all original path structures.

### [HIGH] Missing Rate Limiting on Authentication Endpoints
- **File:** `src/middleware/rateLimiter.ts` & `src/app/api/auth/login/route.ts`
- **Description:** The rate limiter is currently dummied out (`export const twoFARateLimiter = null as any;`) due to Edge compatibility issues.
- **Impact:** The system is vulnerable to brute-force attacks and credential stuffing on `/api/auth/login` and 2FA endpoints.
- **Remediation:** Implement Redis-based rate limiting (e.g., using `@upstash/ratelimit`) compatible with Next.js Serverless environments.

### [MEDIUM] Legacy Password Checking Vulnerability
- **File:** `src/app/api/auth/login/route.ts`
- **Description:** During the password check, the system gracefully falls back to checking plaintext passwords to migrate older users:
  ```typescript
  if (isHashed(user.password)) { ... } 
  else { passwordMatch = password === user.password; ... }
  ```
- **Impact:** While intended as a migration tool, if an attacker can manipulate their stored password hash to look like plaintext (via another injection flaw), they might bypass hashing entirely.
- **Remediation:** Run a one-time backend script to hash all plaintext passwords in the database and remove the plaintext check from the login flow completely.

### [LOW] In-Memory Caching on Serverless
- **File:** `src/app/api/admin/mails/route.ts`
- **Description:** Global variables (`let cachedBatches: string[] = []`) are used to cache database queries.
- **Impact:** In a serverless/Edge environment, memory is not shared across instances. This leads to inconsistent data and potential memory leaks over time.
- **Remediation:** Use external caching like Redis or Next.js `unstable_cache` / `fetch` cache.
