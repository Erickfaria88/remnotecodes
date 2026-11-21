param(
  [Parameter(Mandatory)]
  [uri]$RepositoryUrl,
  [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
if ($RepositoryUrl.Scheme -ne 'https' -or $RepositoryUrl.Host -ne 'github.com' -or
    $RepositoryUrl.AbsolutePath -notmatch '^/[^/]+/[^/]+/?$' -or
    $RepositoryUrl.Query -or $RepositoryUrl.Fragment -or $RepositoryUrl.UserInfo) {
  throw 'Informe a URL HTTPS do repositório público do GitHub.'
}

$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (!$OutputPath) { $OutputPath = Join-Path $project 'ReadingTracker-RemNote.zip' }
$archive = [IO.Path]::GetFullPath($OutputPath)
$staging = Join-Path ([IO.Path]::GetTempPath()) ('reading-tracker-' + [guid]::NewGuid())

Push-Location $project
try {
  npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'A compilação falhou.' }

  [void][IO.Directory]::CreateDirectory($staging)
  # Explicitly package the public assets and current widget bundles only.
  $files = @(
    'index.html', 'index.js', 'index-sandbox.js',
    'reading-tracker.js', 'reading-tracker.css', 'reading-tracker-sandbox.js', 'reading-tracker-sandbox.css',
    'reading-dashboard.js', 'reading-dashboard.css', 'reading-dashboard-sandbox.js', 'reading-dashboard-sandbox.css',
    'document-progress.js', 'document-progress-sandbox.js', 'lesson-progress.js', 'lesson-progress-sandbox.js'
  )
  foreach ($file in $files) {
    Copy-Item -LiteralPath (Join-Path 'dist' $file) -Destination $staging
  }
  Copy-Item -LiteralPath 'README.md' -Destination $staging

  $manifest = Get-Content -LiteralPath 'public/manifest.json' -Raw | ConvertFrom-Json -AsHashtable
  $manifest.repoUrl = $RepositoryUrl.AbsoluteUri.TrimEnd('/')
  $manifest.unlisted = $true
  $manifestPath = Join-Path $staging 'manifest.json'
  [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 10))
  node -e "const fs=require('node:fs'); const sdk=require('./node_modules/@remnote/plugin-sdk/dist/lib'); const r=sdk.parseManifest(JSON.parse(fs.readFileSync(process.argv[1],'utf8'))); if(!r.success){console.error(r.errors);process.exitCode=1}" $manifestPath
  if ($LASTEXITCODE -ne 0) { throw 'O manifesto de publicação é inválido.' }

  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $archive -Force
  Write-Output $archive
} finally {
  Pop-Location
  if (Test-Path -LiteralPath $staging) {
    $resolved = (Resolve-Path -LiteralPath $staging).Path
    if ($resolved -eq $staging) { Remove-Item -LiteralPath $resolved -Recurse -Force }
  }
}
