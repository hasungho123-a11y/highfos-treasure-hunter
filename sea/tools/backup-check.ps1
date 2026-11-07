# 백업 파일을 임시 로컬 DB에 복원해 보고 운영 DB와 줄 수를 비교합니다. 운영 DB는 읽기만 하고, 임시 DB는 끝나면 지웁니다.
# 백업 뒤에 학생이 활동했으면 logs와 plays는 운영 쪽이 조금 더 많을 수 있습니다.
param([Parameter(Mandatory = $true)][string]$File)
$ErrorActionPreference = "Stop"
$sea = Split-Path $PSScriptRoot
$File = (Resolve-Path $File).Path
$temp = Join-Path $env:TEMP ("hs-restore-check-" + [guid]::NewGuid().ToString("N"))
$tables = "classes", "students", "quests", "logs", "plays", "owned", "orders", "answers"
# D1은 UNION을 다섯 개까지만 받아서, 한 줄에 칸을 나눠 셉니다.
$sql = "SELECT " + (($tables | ForEach-Object { "(SELECT COUNT(*) FROM $_) AS $_" }) -join ", ")
function Counts($raw) { $row = ($raw.Substring($raw.IndexOf("[")) | ConvertFrom-Json)[0].results[0]; if ($null -eq $row) { throw "줄 수를 읽지 못했어요" }; return $row }
$bad = $false
try {
  Set-Location $sea
  cmd /c "npx.cmd -y wrangler d1 execute highfos-sea-db --local --persist-to `"$temp`" -y --file `"$File`" > nul 2>&1"
  if ($LASTEXITCODE) { throw "파일을 DB에 넣지 못했어요" }
  $local = Counts (cmd /c "npx.cmd -y wrangler d1 execute highfos-sea-db --local --persist-to `"$temp`" --json --command `"$sql`" 2>nul" | Out-String)
  Set-Location $env:TEMP
  $remote = Counts (cmd /c "npx.cmd -y wrangler d1 execute highfos-sea-db --remote --json --command `"$sql`" 2>nul" | Out-String)
  foreach ($t in $tables) {
    $a = $local.$t; $b = $remote.$t
    $mark = if ($a -eq $b) { "같음" } elseif ($a -lt $b -and $t -in "logs", "plays", "answers") { "백업 뒤 늘어남" } else { $bad = $true; "다름" }
    Write-Output ("{0,-10} 백업 {1,6}  운영 {2,6}  {3}" -f $t, $a, $b, $mark)
  }
} catch {
  Write-Output "복원 검사 실패: $($_.Exception.Message)"; exit 1
} finally { Set-Location $sea; Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue }
if ($bad) { Write-Output "확인 필요: 줄 수가 다른 표가 있어요"; exit 1 }
Write-Output "복원 검사 통과"
