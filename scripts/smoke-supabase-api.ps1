param([string]$BaseUrl = 'http://127.0.0.1:8086')

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')

function Test-Endpoint {
    param([string]$Method, [string]$Path, [int]$ExpectedStatus, [string]$Token = '')
    $headers = @{}
    if ($Token) { $headers['Authorization'] = "Bearer $Token" }
    $options = @{ Uri = "$base$Path"; Method = $Method; Headers = $headers; TimeoutSec = 10; UseBasicParsing = $true }
    if ($Method -eq 'POST') {
        $options['ContentType'] = 'application/json'
        $options['Body'] = '{"question":"Tình hình tháng này?"}'
    }
    $body = ''
    try {
        $response = Invoke-WebRequest @options
        $status = [int]$response.StatusCode
        $body = if ($response.Content -is [byte[]]) { [Text.Encoding]::UTF8.GetString($response.Content) } else { [string]$response.Content }
    } catch {
        if ($null -eq $_.Exception.Response) { throw "Cannot reach $Path : $($_.Exception.Message)" }
        $status = [int]$_.Exception.Response.StatusCode
    }
    if ($status -ne $ExpectedStatus) { throw "$Method $Path returned $status; expected $ExpectedStatus" }
    Write-Host "$Method $Path : $status"
    return $body
}

$health = Test-Endpoint 'GET' '/actuator/health' 200
if (($health | ConvertFrom-Json).status -ne 'UP') { throw 'Health status is not UP' }
$null = Test-Endpoint 'GET' '/api/v1/accounts' 401
$null = Test-Endpoint 'GET' '/api/v1/session' 401 'malformed.not.a.jwt'
$null = Test-Endpoint 'GET' '/api/v1/categories/suggestion?kind=EXPENSE&note=smoke' 401
$null = Test-Endpoint 'POST' '/api/v1/assistant/ask' 401

$token = [Environment]::GetEnvironmentVariable('FINSIGHT_SMOKE_BEARER_TOKEN', 'Process')
if ($token) {
    $null = Test-Endpoint 'GET' '/api/v1/session' 200 $token
    $null = Test-Endpoint 'GET' '/api/v1/accounts' 200 $token
    $null = Test-Endpoint 'GET' '/api/v1/categories' 200 $token
    $null = Test-Endpoint 'GET' '/api/v1/financial-health' 200 $token
    Write-Output 'Authenticated read-only smoke checks passed.'
} else {
    Write-Output 'Authenticated checks skipped: FINSIGHT_SMOKE_BEARER_TOKEN is unset.'
}
