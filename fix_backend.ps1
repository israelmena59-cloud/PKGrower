$path = "backend\index.js"
$c = Get-Content $path
$newContent = $c[0..277] + $c[395..($c.Count-1)]
$newContent | Set-Content $path -Encoding UTF8
Write-Host "Fixed."
