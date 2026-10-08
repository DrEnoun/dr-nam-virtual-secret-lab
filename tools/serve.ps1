# Tiny local web server for Windows (no installation needed).
# Started by start-windows.bat. Serves this folder at http://localhost:8080/
param([int]$Port = 8080)

$root = Split-Path -Parent $PSScriptRoot
$types = @{
  '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.mjs'='text/javascript; charset=utf-8';
  '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.webmanifest'='application/manifest+json';
  '.png'='image/png'; '.jpg'='image/jpeg'; '.jpeg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon';
  '.woff2'='font/woff2'; '.wasm'='application/wasm'; '.data'='application/octet-stream';
  '.tflite'='application/octet-stream'; '.binarypb'='application/octet-stream'; '.txt'='text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch {
  Write-Host "Port $Port is busy. Close the other window or restart the computer, then try again." -ForegroundColor Red
  Read-Host "Press Enter to close"; exit 1
}
Write-Host "Dr. NAM Virtual Secret Lab is running at http://localhost:$Port/" -ForegroundColor Green
Write-Host "Keep this window open while you play. Close it to stop."
Start-Process "http://localhost:$Port/"

while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ($path -eq '' -or $path.EndsWith('/')) { $path += 'index.html' }
  $file = [IO.Path]::GetFullPath((Join-Path $root $path))
  $res = $ctx.Response
  if ($file.StartsWith($root) -and (Test-Path $file -PathType Leaf)) {
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $res.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' })
    $bytes = [IO.File]::ReadAllBytes($file)
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
  }
  $res.Close()
}
