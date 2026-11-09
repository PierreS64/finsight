$ErrorActionPreference = 'Stop'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required to serve the web build.' }
& node (Join-Path $PSScriptRoot 'serve-web.mjs')
