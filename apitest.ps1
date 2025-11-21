# Script to submit custom SQL queries to Jellyfin User Usage Stats plugin
# Usage: .\apitest.ps1 -Query "SELECT * FROM UserActivity WHERE ActivityType = 'Playback'"
#        .\apitest.ps1 -Query "SELECT * FROM UserActivity" -AuthFormat Authorization

param(
    [Parameter(Mandatory=$true)]
    [string]$Query,

    [Parameter(Mandatory=$false)]
    [string]$ServerUrl = "http://192.168.50.105:8096",

    [Parameter(Mandatory=$false)]
    [string]$ApiKey = "7736a069690a4fd2919278043ea1d07f",

    [Parameter(Mandatory=$false)]
    [bool]$ReplaceUserId = $true,

    [Parameter(Mandatory=$false)]
    [ValidateSet("X-Emby-Token", "Authorization", "MediaBrowser")]
    [string]$AuthFormat = "X-Emby-Token"
)

# Construct the endpoint URL
$endpoint = "$ServerUrl/user_usage_stats/submit_custom_query"

# Prepare the request body
$body = @{
    CustomQueryString = $Query
    ReplaceUserId     = $ReplaceUserId
} | ConvertTo-Json -Compress

# Set up headers - Jellyfin uses different auth formats depending on plugin
$headers = @{
    "accept"       = "application/json"
    "Content-Type" = "application/json"
}

# Add authentication header based on specified format
switch ($AuthFormat) {
    "X-Emby-Token" {
        $headers["X-Emby-Token"] = $ApiKey
    }
    "Authorization" {
        $headers["Authorization"] = $ApiKey
    }
    "MediaBrowser" {
        $headers["Authorization"] = "MediaBrowser Token=`"$ApiKey`""
    }
}

Write-Host "Using authentication format: $AuthFormat" -ForegroundColor Gray
Write-Host "ReplaceUserId: $ReplaceUserId" -ForegroundColor Gray

try {
    Write-Host "Submitting custom query to Jellyfin..." -ForegroundColor Cyan
    Write-Host "Server: $ServerUrl" -ForegroundColor Gray
    Write-Host "Query: $Query" -ForegroundColor Gray
    Write-Host ""

    # Make the POST request
    $response = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $body

    # Output the response
    Write-Host "Response received:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10 | Write-Host

    return $response
}
catch {
    Write-Host "Error occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red

    # Try to get detailed error message from response
    $statusCodeValue = $null
    if ($_.Exception.Response) {
        $statusCodeValue = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status Code: $statusCodeValue" -ForegroundColor Yellow

        # Try to read error response body
        try {
            $responseStream = $_.Exception.Response.GetResponseStream()
            if ($responseStream) {
                $streamReader = New-Object System.IO.StreamReader($responseStream)
                $responseBody = $streamReader.ReadToEnd()
                $streamReader.Close()
                $responseStream.Close()

                if ($responseBody) {
                    Write-Host ""
                    Write-Host "Server Error Response:" -ForegroundColor Yellow
                    try {
                        $errorJson = $responseBody | ConvertFrom-Json
                        $errorJson | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor Yellow
                    }
                    catch {
                        Write-Host $responseBody -ForegroundColor Yellow
                    }
                }
            }
        }
        catch {
            # Couldn't read response stream, try ErrorDetails instead
        }
    }

    # Also check ErrorDetails property
    if ($_.ErrorDetails) {
        Write-Host ""
        Write-Host "Error Details:" -ForegroundColor Red
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }

    # Specific error handling
    if ($statusCodeValue -eq 401) {
        Write-Host ""
        Write-Host "Authentication failed (401 Unauthorized). Try different auth formats:" -ForegroundColor Yellow
        Write-Host "  .\apitest.ps1 -Query `"...`" -AuthFormat X-Emby-Token" -ForegroundColor Cyan
        Write-Host "  .\apitest.ps1 -Query `"...`" -AuthFormat Authorization" -ForegroundColor Cyan
        Write-Host "  .\apitest.ps1 -Query `"...`" -AuthFormat MediaBrowser" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Current format: $AuthFormat" -ForegroundColor Gray
        Write-Host "API Key used: $($ApiKey.Substring(0, [Math]::Min(8, $ApiKey.Length)))..." -ForegroundColor Gray
    }
    elseif ($statusCodeValue -eq 400) {
        Write-Host ""
        Write-Host "Bad Request (400). Common issues:" -ForegroundColor Yellow
        Write-Host "1. SQL query syntax may be incorrect" -ForegroundColor Yellow
        Write-Host "2. Table name might not exist (check UserActivity vs PlaybackActivity)" -ForegroundColor Yellow
        Write-Host "3. Request body format might be wrong" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Request body sent:" -ForegroundColor Gray
        Write-Host $body -ForegroundColor Gray
    }

    exit 1
}

