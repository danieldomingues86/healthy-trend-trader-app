param([Parameter(Mandatory=$true)][string[]]$Manifest)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.FileAccessMode, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrResult, Windows.Media.Ocr, ContentType=WindowsRuntime] | Out-Null
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'} | Select-Object -First 1
function Await-Result($operation, $resultType) { $task = $asTask.MakeGenericMethod($resultType).Invoke($null,@($operation)); $task.Wait(); return $task.Result }
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (-not $engine) { throw 'No local OCR language is available.' }
foreach ($manifestPath in $Manifest) {
  $source = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $results = @{}
  foreach ($resource in $source.notes.resources | Where-Object {$_.type -like 'image/*'} | Sort-Object sha256 -Unique) {
    $stream = $null; $bitmap = $null
    try {
      $file = Await-Result ([Windows.Storage.StorageFile]::GetFileFromPathAsync($resource.path)) ([Windows.Storage.StorageFile])
      $stream = Await-Result ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
      $decoder = Await-Result ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
      $bitmap = Await-Result ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
      $recognized = Await-Result ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
      $lines = @($recognized.Lines | ForEach-Object {[pscustomobject]@{text=$_.Text;words=@($_.Words | ForEach-Object {[pscustomobject]@{text=$_.Text;x=$_.BoundingRect.X;y=$_.BoundingRect.Y;width=$_.BoundingRect.Width;height=$_.BoundingRect.Height}})}})
      $results[$resource.sha256] = [pscustomobject]@{text=$recognized.Text;lines=$lines;width=$bitmap.PixelWidth;height=$bitmap.PixelHeight;method='Windows.Media.Ocr (local)'}
    } catch { $results[$resource.sha256] = [pscustomobject]@{error=$_.Exception.Message;method='Windows.Media.Ocr (local)'} }
    finally { if($bitmap){$bitmap.Dispose()}; if($stream){$stream.Dispose()} }
  }
  $destination = Join-Path (Split-Path -Parent $manifestPath) 'ocr.json'
  [IO.File]::WriteAllText($destination, ($results | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding($false)))
  Write-Output "OCR completed: $($results.Count) images."
}
