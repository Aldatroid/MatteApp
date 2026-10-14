# Bygger webb/index.html (fristående version) från mattelabbet.html
$dir = Split-Path $PSScriptRoot -Parent
$src = Get-Content -Raw -Encoding utf8 (Join-Path $dir "mattelabbet.html")
$head = @'
<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Mattelabbet">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#070f1b">
<link rel="apple-touch-icon" href="assets/icon-180.png">
<link rel="icon" type="image/png" sizes="32x32" href="assets/icon-32.png">
<link rel="manifest" href="assets/manifest.webmanifest">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>
'@
$out = $head + "`n" + $src.Replace('<div id="app">', "</head>`n<body>`n<div id=`"app`">") + "`n</body>`n</html>`n"
[IO.File]::WriteAllText((Join-Path $dir "webb/index.html"), $out, (New-Object Text.UTF8Encoding($false)))
"built " + (Get-Item (Join-Path $dir "webb/index.html")).Length
