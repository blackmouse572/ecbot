#!/bin/bash

echo "## 🔒 SecurePR Scan Report" > summary.md
echo "" >> summary.md

echo "### 🔍 Trivy Results" >> summary.md
head -n 50 trivy-results.txt >> summary.md
echo "" >> summary.md

echo "### ⚙️ Semgrep Results" >> summary.md
head -n 50 semgrep-results.txt >> summary.md
