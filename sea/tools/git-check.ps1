# 배포 전에 GitHub 최신 상태를 확인합니다. 다른 컴퓨터에서 먼저 올린 코드가 있으면 옛날 코드로 실서버를 덮어쓰지 않도록 멈춥니다.
param([Parameter(Mandatory = $true)][string]$Git, [Parameter(Mandatory = $true)][string]$Repo)
& $Git -C $Repo fetch -q origin
if ($LASTEXITCODE) { Write-Output "GitHub에 연결하지 못했어요. 배포 안 함"; exit 1 }
$branch = & $Git -C $Repo rev-parse --abbrev-ref HEAD
if ($branch -ne "main") { Write-Output "지금 브랜치가 main이 아니에요($branch). 배포 안 함"; exit 1 }
$behind = [int](& $Git -C $Repo rev-list --count HEAD..origin/main)
if ($behind -gt 0) { Write-Output "GitHub에 이 컴퓨터에 없는 커밋이 ${behind}개 있어요. git pull을 먼저 하세요. 배포 안 함"; exit 1 }
Write-Output "GitHub 최신 상태 확인"
