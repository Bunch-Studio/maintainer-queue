# Security

Report vulnerabilities through GitHub's private vulnerability reporting on this repository (Security → Report a vulnerability). Do not open a public issue.

What the hosted service holds: GitHub identity via Supabase Auth, hashed agent tokens, task specs, and gate results. It never holds your credentials, model quota, or code. The GitHub App reads issues and contents and writes check runs; it has no push access.
