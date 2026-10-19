# Konverterar PNG till WebP (sparas bredvid PNG-filen) med Blender i bakgrundsläge, och visar hur mycket som sparades.
# Användning: powershell -File tools\webp.ps1 [-Path webb\assets] [-Quality 90] [-Lossless] [-Force]
#   -Quality   1-99 ger förlustbringande WebP med genomskinlighet (90 brukar inte synas). Standard 90.
#   -Lossless  förlustfri WebP, pixel för pixel lika PNG-filen (ungefär halva storleken).
#   -Force     konvertera även filer vars WebP redan är nyare än PNG-filen.
#   -Remove    ta bort PNG-filen när WebP-filen har skapats.
#   -Skip      filnamn som ska förbli PNG. Standard: appikonerna (icon-32.png osv.), som webbläsare och hemskärmar vill ha som PNG.
# Mappar som heter _source (källmaterial) hoppas över.
param(
  [string]$Path = (Join-Path $PSScriptRoot '..\webb\assets'),
  [ValidateRange(1, 99)][int]$Quality = 90,
  [switch]$Lossless,
  [switch]$Force,
  [switch]$Remove,
  [string[]]$Skip = @('icon-*.png'),
  [string]$Blender = $env:BLENDER
)
$ErrorActionPreference = 'Stop'
if (-not $Blender) {
  $Blender = Get-ChildItem "$env:ProgramFiles\Blender Foundation\*\blender.exe" -ErrorAction SilentlyContinue |
    Sort-Object { [version]($_.Directory.Name -replace '[^\d.]', '') } | Select-Object -Last 1 -ExpandProperty FullName
}
if (-not $Blender -or -not (Test-Path $Blender)) { throw 'Hittar inte Blender. Ange sökvägen med -Blender eller miljövariabeln BLENDER.' }

$all = if (Test-Path $Path -PathType Leaf) { @(Get-Item $Path) } else {
  Get-ChildItem $Path -Recurse -Filter *.png | Where-Object { $_.FullName -notmatch '[\\/]_source[\\/]' }
}
$all = @($all | Where-Object { $name = $_.Name; -not ($Skip | Where-Object { $name -like $_ }) })
$todo = @($all | Where-Object {
  $webp = [IO.Path]::ChangeExtension($_.FullName, '.webp')
  $Force -or -not (Test-Path $webp) -or (Get-Item $webp).LastWriteTime -lt $_.LastWriteTime
})
if ($todo.Count -eq 0) { Write-Host 'Alla WebP-filer är redan aktuella (använd -Force för att göra om dem).'; return }

$q = if ($Lossless) { 100 } else { $Quality }
Write-Host "Konverterar $($todo.Count) PNG-filer med $(if ($Lossless) { 'förlustfri WebP' } else { "kvalitet $q" })..."
# Skicka filerna i omgångar så att kommandoraden inte blir för lång
$errors = 0
for ($i = 0; $i -lt $todo.Count; $i += 40) {
  $batch = $todo[$i..([Math]::Min($i + 39, $todo.Count - 1))].FullName
  & $Blender -b --factory-startup -P (Join-Path $PSScriptRoot 'blender\webp.py') -- $q @batch 2>&1 |
    ForEach-Object { if ("$_" -match '^\[webp\] FEL') { Write-Host $_ -ForegroundColor Red; $errors++ } }
}

$root = (Resolve-Path $Path).Path; if (Test-Path $root -PathType Leaf) { $root = Split-Path $root }
$rows = foreach ($f in $todo) {
  $webp = [IO.Path]::ChangeExtension($f.FullName, '.webp')
  if (-not (Test-Path $webp) -or (Get-Item $webp).LastWriteTime -lt $f.LastWriteTime) { continue }  # misslyckades
  $w = (Get-Item $webp).Length
  [pscustomobject]@{
    Fil = $f.FullName.Substring($root.Length + 1)
    'PNG (KB)' = [Math]::Round($f.Length / 1KB)
    'WebP (KB)' = [Math]::Round($w / 1KB)
    Mindre = '{0:P0}' -f (1 - $w / $f.Length)
    _png = $f.Length; _webp = $w; _src = $f.FullName
  }
}
$rows | Sort-Object _png -Descending | Format-Table Fil, 'PNG (KB)', 'WebP (KB)', Mindre -AutoSize
$png = ($rows | Measure-Object _png -Sum).Sum; $webp = ($rows | Measure-Object _webp -Sum).Sum
if ($png) { Write-Host ('Totalt {0:N1} MB -> {1:N1} MB ({2:P0} mindre)' -f ($png / 1MB), ($webp / 1MB), (1 - $webp / $png)) }
if ($Remove) { $rows | ForEach-Object { Remove-Item -LiteralPath $_._src }; Write-Host "Tog bort $(@($rows).Count) PNG-filer." }
if ($errors) { Write-Host "$errors filer kunde inte konverteras." -ForegroundColor Red; exit 1 }
