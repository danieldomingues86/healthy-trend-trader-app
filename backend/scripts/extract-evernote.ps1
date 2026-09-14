param([Parameter(Mandatory=$true)][string]$Source, [Parameter(Mandatory=$true)][string]$Destination)
$ErrorActionPreference = 'Stop'
$resolvedSource = (Resolve-Path -LiteralPath $Source).Path
$resolvedDestination = [IO.Path]::GetFullPath($Destination)
[IO.Directory]::CreateDirectory($resolvedDestination) | Out-Null
$settings = New-Object System.Xml.XmlReaderSettings
$settings.DtdProcessing = [System.Xml.DtdProcessing]::Ignore
$settings.XmlResolver = $null
$reader = [System.Xml.XmlReader]::Create($resolvedSource, $settings)
$document = New-Object System.Xml.XmlDocument
$document.XmlResolver = $null
try { $document.Load($reader) } finally { $reader.Dispose() }
$md5 = [Security.Cryptography.MD5]::Create()
$sha = [Security.Cryptography.SHA256]::Create()
function Flatten-Node($node, $names) {
  if ($node.NodeType -eq [Xml.XmlNodeType]::Text -or $node.NodeType -eq [Xml.XmlNodeType]::CDATA) { return $node.Value }
  if ($node.NodeType -ne [Xml.XmlNodeType]::Element -or $node.GetAttribute('style') -match 'display\s*:\s*none') { return '' }
  if ($node.Name -eq 'en-media') { return "`n[Anexo: $($names[$node.GetAttribute('hash')])]`n" }
  if ($node.Name -eq 'en-todo') { if ($node.GetAttribute('checked') -eq 'true') { return '[x] ' } else { return '[ ] ' } }
  if ($node.Name -eq 'br' -or $node.Name -eq 'hr') { return "`n" }
  $parts = foreach ($child in $node.ChildNodes) { Flatten-Node $child $names }
  $text = $parts -join ''
  if ($node.Name -eq 'li' -and $node.ParentNode.GetAttribute('style') -match '--en-todo\s*:\s*true') { $prefix = if ($node.GetAttribute('style') -match '--en-checked\s*:\s*true') { '[x] ' } else { '[ ] ' }; $text = $prefix + $text.Trim() }
  if ($node.Name -match '^(div|p|li|h[1-6]|tr|blockquote)$') { return "`n$text`n" }
  return $text
}
$notes = foreach ($note in $document.SelectNodes('/en-export/note')) {
  $resources = @(); $names = @{}
  foreach ($resource in $note.SelectNodes('resource')) {
    $bytes = [Convert]::FromBase64String($resource.SelectSingleNode('data').InnerText)
    $hash = [BitConverter]::ToString($md5.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
    $digest = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
    $mime = $resource.SelectSingleNode('mime').InnerText
    $fileNode = $resource.SelectSingleNode('resource-attributes/file-name')
    $fileName = if ($fileNode) { $fileNode.InnerText } else { "$hash.bin" }
    $resourcePath = Join-Path $resolvedDestination $digest
    if (-not [IO.File]::Exists($resourcePath)) { [IO.File]::WriteAllBytes($resourcePath, $bytes) }
    $names[$hash] = $fileName
    $resources += [pscustomobject]@{hash=$hash;sha256=$digest;name=$fileName;type=$mime;size=$bytes.Length;path=$resourcePath}
  }
  $enml = $note.SelectSingleNode('content').InnerText
  $enmlReader = [Xml.XmlReader]::Create((New-Object IO.StringReader($enml)), $settings)
  $enmlDocument = New-Object Xml.XmlDocument
  $enmlDocument.XmlResolver = $null
  try { $enmlDocument.Load($enmlReader) } finally { $enmlReader.Dispose() }
  $plain = (Flatten-Node $enmlDocument.DocumentElement $names) -replace '[\u00a0\u200a\u200b\u200c\u200d\ufeff]',' ' -replace '\r','' -replace '\n[ \t]*\n+',"`n`n"
  $checked = @($enmlDocument.SelectNodes('//li') | Where-Object {$_.GetAttribute('style') -match '--en-checked\s*:\s*true'} | ForEach-Object {$_.InnerText.Trim()})
  $todo = @($enmlDocument.SelectNodes('//li') | Where-Object {$_.ParentNode.GetAttribute('style') -match '--en-todo\s*:\s*true'} | ForEach-Object {[pscustomobject]@{label=$_.InnerText.Trim();checked=($_.GetAttribute('style') -match '--en-checked\s*:\s*true');explicitFalse=($_.GetAttribute('style') -match '--en-checked\s*:\s*false')}})
  foreach ($oldTodo in $enmlDocument.SelectNodes('//en-todo')) { $todo += [pscustomobject]@{label=$oldTodo.ParentNode.InnerText.Trim();checked=($oldTodo.GetAttribute('checked') -eq 'true');explicitFalse=($oldTodo.GetAttribute('checked') -eq 'false')} }
  $media = @($enmlDocument.SelectNodes('//en-media') | ForEach-Object {[pscustomobject]@{hash=$_.GetAttribute('hash');type=$_.GetAttribute('type');style=$_.GetAttribute('style')}})
  [pscustomobject]@{title=$note.SelectSingleNode('title').InnerText;created=$note.SelectSingleNode('created').InnerText;updated=$note.SelectSingleNode('updated').InnerText;tags=@($note.SelectNodes('tag') | ForEach-Object {$_.InnerText});text=$plain.Trim();enml=$enml;checked=$checked;todo=$todo;media=$media;resources=$resources}
}
$output = [pscustomobject]@{source=[IO.Path]::GetFileName($resolvedSource);notes=@($notes)} | ConvertTo-Json -Depth 12
[IO.File]::WriteAllText((Join-Path $resolvedDestination 'manifest.json'), $output, (New-Object Text.UTF8Encoding($false)))
$md5.Dispose(); $sha.Dispose()
Write-Output "Extracted $(@($notes).Count) notes."
