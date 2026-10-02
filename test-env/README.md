# Test environment

Vitest loads environment files only from this directory so unit tests never read runtime or developer secrets from the project root. Keep fixtures synthetic and commit only non-secret test values.
