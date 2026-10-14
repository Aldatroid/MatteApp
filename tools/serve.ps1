# Minimal statisk webbserver för lokal testning (endast localhost).
param([int]$Port = 8765, [string]$Root = (Join-Path $PSScriptRoot '..\webb'))
$Root = (Resolve-Path $Root).Path
$types = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript'; '.css' = 'text/css'; '.json' = 'application/json'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.webp' = 'image/webp'; '.jpg' = 'image/jpeg'; '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8'; '.webmanifest' = 'application/manifest+json'; '.wav' = 'audio/wav' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root on http://localhost:$Port/"
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  try {
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
    if ($rel -eq '') { $rel = 'index.html' }
    $path = [IO.Path]::GetFullPath((Join-Path $Root $rel))
    if ($path.StartsWith($Root) -and (Test-Path $path -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($path)
      $ext = [IO.Path]::GetExtension($path).ToLower()
      $ctx.Response.ContentType = if ($types[$ext]) { $types[$ext] } else { 'application/octet-stream' }
      $ctx.Response.Headers.Add('Cache-Control', 'no-store')
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else { $ctx.Response.StatusCode = 404 }
  } catch { Write-Host "ERROR $_" } finally { $ctx.Response.Close() }
}
