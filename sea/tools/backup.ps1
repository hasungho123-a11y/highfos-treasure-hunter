# 운영 DB를 SQL 파일로 내려받습니다. 운영 DB는 읽기만 합니다.
# 파일에는 학생 이름과 비밀번호 해시가 들어 있으니 저장소 밖에 두고 공개하지 않습니다.
param([string]$OutDir = (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "highfos-backups"))
New-Item -ItemType Directory -Force $OutDir | Out-Null
$file = Join-Path $OutDir ("sea-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".sql")
# wrangler.toml이 없는 곳에서 실행하면 DB를 이름으로 찾아, 설정 파일에 실제 ID를 넣지 않아도 됩니다.
Push-Location $env:TEMP
try {
  $done = $false
  for ($i = 0; $i -lt 3 -and -not $done; $i++) {
    cmd /c "npx.cmd -y wrangler d1 export highfos-sea-db --remote --output `"$file`" > nul 2>&1"
    if ($LASTEXITCODE -eq 0 -and (Test-Path $file)) { $done = $true } elseif ($i -lt 2) { Start-Sleep 20 }
  }
} finally { Pop-Location }
if (-not $done -or -not (Select-String -Path $file -Pattern "CREATE TABLE" -SimpleMatch -Quiet)) { Write-Output "백업 실패"; exit 1 }
Write-Output "백업 완료: $file ($([math]::Round((Get-Item $file).Length / 1KB)) KB)"
