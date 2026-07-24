# Installer validation

The release workflow fails unless exactly one `NASbook Setup 0.9.0.exe` file exists after the NSIS build. The installer is produced only after lint, typecheck, tests and production build succeed.
