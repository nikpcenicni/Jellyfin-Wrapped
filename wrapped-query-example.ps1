# Example script: Query User Usage Stats for Wrapped data
# This demonstrates how to query playback statistics for the Year in Review feature

param(
    [Parameter(Mandatory=$false)]
    [string]$ServerUrl = "http://192.168.50.105:8096",

    [Parameter(Mandatory=$false)]
    [string]$ApiKey = "7736a069690a4fd2919278043ea1d07f",

    [Parameter(Mandatory=$false)]
    [int]$Year = (Get-Date).Year
)

# Query to get top movies watched this year
# Filter out invalid durations (negative or > 1 day = 86400 seconds)
$topMoviesQuery = @"
SELECT
    ItemId,
    ItemName,
    ItemType,
    COUNT(*) as PlayCount,
    CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalPlayDuration
FROM PlaybackActivity
WHERE ItemType = 'Movie'
    AND DateCreated >= '$Year-01-01'
    AND DateCreated < '$($Year + 1)-01-01'
    AND PlayDuration > 0
    AND PlayDuration < 86400
GROUP BY ItemId, ItemName, ItemType
ORDER BY PlayCount DESC
LIMIT 10
"@

# Query to get top TV shows/episodes watched this year
# Filter out invalid durations (negative or > 1 day = 86400 seconds)
$topShowsQuery = @"
SELECT
    ItemId,
    ItemName,
    ItemType,
    COUNT(*) as PlayCount,
    CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalPlayDuration
FROM PlaybackActivity
WHERE ItemType IN ('Episode', 'Series')
    AND DateCreated >= '$Year-01-01'
    AND DateCreated < '$($Year + 1)-01-01'
    AND PlayDuration > 0
    AND PlayDuration < 86400
GROUP BY ItemId, ItemName, ItemType
ORDER BY PlayCount DESC
LIMIT 10
"@

# Query to get monthly viewing activity
$monthlyActivityQuery = @"
SELECT
    strftime('%Y-%m', DateCreated) as Month,
    COUNT(*) as PlayCount,
    CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds
FROM PlaybackActivity
WHERE DateCreated >= '$Year-01-01'
    AND DateCreated < '$($Year + 1)-01-01'
    AND PlayDuration > 0
    AND PlayDuration < 86400
GROUP BY Month
ORDER BY Month
"@

# Query to get total watch time
# Filter out invalid durations (negative or > 1 day = 86400 seconds)
$totalWatchTimeQuery = @"
SELECT
    COUNT(DISTINCT ItemId) as UniqueItems,
    COUNT(*) as TotalPlays,
    CAST(SUM(CAST(PlayDuration AS INTEGER)) AS INTEGER) as TotalSeconds,
    CAST(SUM(CAST(PlayDuration AS INTEGER)) / 60.0 AS INTEGER) as TotalMinutes,
    CAST(SUM(CAST(PlayDuration AS INTEGER)) / 3600.0 AS INTEGER) as TotalHours
FROM PlaybackActivity
WHERE DateCreated >= '$Year-01-01'
    AND DateCreated < '$($Year + 1)-01-01'
    AND PlayDuration > 0
    AND PlayDuration < 86400
"@

Write-Host "=== Jellyfin Wrapped - $Year Statistics ===" -ForegroundColor Cyan
Write-Host ""

# Execute queries using the apitest script
Write-Host "1. Top Movies:" -ForegroundColor Yellow
& .\apitest.ps1 -Query $topMoviesQuery -ServerUrl $ServerUrl -ApiKey $ApiKey
Write-Host ""

Write-Host "2. Top TV Shows/Episodes:" -ForegroundColor Yellow
& .\apitest.ps1 -Query $topShowsQuery -ServerUrl $ServerUrl -ApiKey $ApiKey
Write-Host ""

Write-Host "3. Monthly Activity:" -ForegroundColor Yellow
& .\apitest.ps1 -Query $monthlyActivityQuery -ServerUrl $ServerUrl -ApiKey $ApiKey
Write-Host ""

Write-Host "4. Total Watch Time:" -ForegroundColor Yellow
& .\apitest.ps1 -Query $totalWatchTimeQuery -ServerUrl $ServerUrl -ApiKey $ApiKey

