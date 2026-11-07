# 사용법: powershell -NoProfile -ExecutionPolicy Bypass -File tools\deploy.ps1 -Message "커밋 메시지" [-Migration migrations\파일.sql]
# 순서: 검사 → 운영 DB 백업 → 마이그레이션 → 배포 → 실서버 파일 비교 → 커밋과 푸시
# 저장소가 공개이므로 이 파일에 DB ID나 설정 코드를 적지 않고, 화면에도 찍지 않습니다.
param([Parameter(Mandatory = $true)][string]$Message, [string]$Migration = "", [switch]$NoBackup)
$ErrorActionPreference = "Continue"
$sea = Split-Path $PSScriptRoot
$repo = Split-Path $sea
Set-Location $sea
$u8 = [Text.Encoding]::UTF8
$g = (Get-Command git -ErrorAction SilentlyContinue).Source
if (-not $g) { $g = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" -ErrorAction SilentlyContinue | Sort-Object FullName | Select-Object -Last 1 -ExpandProperty FullName }
if (-not $g) { Write-Output "git을 찾지 못했어요"; exit 1 }

# 로컬 시험 세션은 지웁니다.
if (Test-Path ".wrangler\hs-local") { cmd /c "npx.cmd -y wrangler d1 execute highfos-sea-db --local --persist-to .wrangler\hs-local --command `"DELETE FROM sessions`" > nul 2>&1" }

foreach ($f in (Get-ChildItem public\*.js, src\*.js)) { node --check $f.FullName; if ($LASTEXITCODE) { Write-Output "문법 오류 $($f.Name)"; exit 1 } }
node tests/math-check.cjs > "$env:TEMP\mc.log"; if ($LASTEXITCODE) { Write-Output "문제 검사 실패"; Get-Content "$env:TEMP\mc.log" -TotalCount 12; exit 1 }
node tests/duel-check.mjs > "$env:TEMP\dc.log"; if ($LASTEXITCODE) { Write-Output "대결 검사 실패"; Get-Content "$env:TEMP\dc.log" -TotalCount 12; exit 1 }
Write-Output "문제 검사 통과"

if (-not $NoBackup) { & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\backup.ps1"; if ($LASTEXITCODE) { Write-Output "백업 실패, 배포 안 함"; exit 1 } }

$id = $null
for ($i = 0; $i -lt 4 -and -not $id; $i++) {
  try { $raw = cmd /c "npx.cmd -y wrangler d1 list --json 2>nul" | Out-String; $j = $raw.Substring($raw.IndexOf("[")) | ConvertFrom-Json; $c = ($j | Where-Object { $_.name -eq "highfos-sea-db" }).uuid; if ($c -match '^[0-9a-f-]{36}$') { $id = $c } } catch {}
  if (-not $id) { Start-Sleep 15 }
}
if (-not $id) { Write-Output "DB 조회 실패, 배포 안 함"; exit 1 }

$toml = (Resolve-Path "wrangler.toml").Path
$orig = [IO.File]::ReadAllText($toml)
if (-not $orig.Contains("REPLACE_WITH_DATABASE_ID")) { Write-Output "wrangler.toml이 원래 상태가 아니에요, 배포 안 함"; exit 1 }
$ok = $false
try {
  [IO.File]::WriteAllText($toml, $orig.Replace("REPLACE_WITH_DATABASE_ID", $id))
  # 운영 DB를 코드보다 먼저 바꿉니다.
  if ($Migration) {
    cmd /c "npx.cmd -y wrangler d1 execute highfos-sea-db --remote -y --file `"$Migration`" > nul 2>&1"
    if ($LASTEXITCODE) { throw "운영 DB 변경 실패" }
    Write-Output "운영 DB 변경 완료"
  }
  for ($i = 0; $i -lt 5 -and -not $ok; $i++) {
    cmd /c "npx.cmd -y wrangler deploy > `"$env:TEMP\dep.log`" 2>&1"
    if ($LASTEXITCODE -eq 0) { $ok = $true } else {
      $l = Get-Content "$env:TEMP\dep.log" -Raw
      if ($l -match "503|no healthy|malformed") { Start-Sleep 45 } else { Write-Output "배포 실패"; break }
    }
  }
} catch { Write-Output "중단: $($_.Exception.Message)" } finally { [IO.File]::WriteAllText($toml, $orig) }
if (-not $ok) { Write-Output "배포 안 됨"; exit 1 }
Write-Output "배포 완료"

Start-Sleep 25
$base = "https://highfos-sea.highfos.workers.dev"
$wc = New-Object Net.WebClient
$allSame = $true
foreach ($f in (Get-ChildItem public\*.js, public\*.css)) {
  $remote = $u8.GetString($wc.DownloadData("$base/$($f.Name)"))
  $same = $remote.Replace("`r", "") -ceq ([IO.File]::ReadAllText($f.FullName, $u8)).Replace("`r", "")
  if (-not $same) { $allSame = $false; Write-Output "다름: $($f.Name)" }
}
Write-Output "실서버 파일 일치: $allSame"
$me = Invoke-RestMethod "$base/api/me"
Write-Output "needSetup: $($me.needSetup)"

Set-Location $repo
& $g add sea/public sea/src sea/tests sea/tools sea/schema.sql sea/migrations sea/CLAUDE.md 2>$null
$diff = & $g diff --cached | Out-String
if ($diff -match [regex]::Escape($id)) { Write-Output "DB ID 포함, 커밋 중단"; exit 1 }
if (& $g diff --cached --name-only | Select-String "wrangler|\.dev\.vars") { Write-Output "설정 파일 변경 포함, 커밋 중단"; exit 1 }
& $g diff --cached --stat | Select-Object -Last 1
& $g commit -q -m $Message
cmd /c "`"$g`" push -q origin main 2>nul"
$pushed = $LASTEXITCODE
Write-Output "푸시 결과 $pushed"
& $g log --oneline -1
& $g status --short | Select-Object -First 8
if ($pushed) { exit 1 }
