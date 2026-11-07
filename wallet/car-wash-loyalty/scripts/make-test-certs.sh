#!/usr/bin/env bash
# Makes a throwaway self-signed cert so you can build and inspect passes locally.
# iPhones will NOT accept passes signed with it. Use your real Pass Type ID cert for that.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs/test
openssl req -x509 -newkey rsa:2048 -nodes -days 30 \
  -subj "/CN=Pass Type ID: pass.com.example.carwash/OU=ABCDE12345" \
  -keyout certs/test/key.pem -out certs/test/cert.pem 2>/dev/null
cp certs/test/cert.pem certs/test/wwdr.pem
echo "Test cert written to certs/test/ (set apple.certPem/keyPem/wwdr to these paths)"
