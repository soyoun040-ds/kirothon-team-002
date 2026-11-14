#!/usr/bin/env bash
# CV 에이전트 설치 스크립트 (kiro 전용)
# 사용법: 설치할 저장소 폴더로 이동한 뒤 실행한다.
#   cd ~/my-demo-repo
#   bash /path/to/kirothon/scripts/install.sh

set -euo pipefail

SRC_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="$(pwd)"

if [ "$SRC_ROOT" = "$TARGET" ]; then
  echo "오류: CV 에이전트 저장소 안에서는 실행할 수 없습니다. 설치할 대상 저장소 폴더로 이동한 뒤 실행하세요." >&2
  exit 1
fi

for f in \
  "$SRC_ROOT/scripts/hooks/send-event.mjs" \
  "$SRC_ROOT/scripts/hooks/adapters/kiro/hooks.json"; do
  if [ ! -f "$f" ]; then
    echo "오류: 설치 원본을 찾을 수 없습니다: $f" >&2
    exit 1
  fi
done

echo "설치 대상: $TARGET"

# 1) 공통 전송 스크립트와 kiro 어댑터 복사
mkdir -p "$TARGET/scripts/hooks/adapters"
cp "$SRC_ROOT/scripts/hooks/send-event.mjs" "$TARGET/scripts/hooks/send-event.mjs"
rm -rf "$TARGET/scripts/hooks/adapters/kiro"
cp -R "$SRC_ROOT/scripts/hooks/adapters/kiro" "$TARGET/scripts/hooks/adapters/kiro"
echo "[1/4] scripts/hooks/send-event.mjs, scripts/hooks/adapters/kiro/ 복사 완료"

# 2) Kiro hook 설정 복사
mkdir -p "$TARGET/.kiro/hooks"
cp "$SRC_ROOT/scripts/hooks/adapters/kiro/hooks.json" "$TARGET/.kiro/hooks/cv-agent.json"
echo "[2/4] .kiro/hooks/cv-agent.json 설치 완료"

# 3) .cvagent/config.json 만들기
CONFIG="$TARGET/.cvagent/config.json"
if [ -f "$CONFIG" ]; then
  echo "[3/4] .cvagent/config.json 이 이미 있어 그대로 둡니다."
else
  DEFAULT_SERVER="http://localhost:3000"
  DEFAULT_NAME="$(basename "$TARGET")"

  SERVER_URL=""
  PROJECT_NAME=""
  read -r -p "서버 주소 [$DEFAULT_SERVER]: " SERVER_URL || true
  read -r -p "프로젝트 이름 [$DEFAULT_NAME]: " PROJECT_NAME || true
  # 방향키 같은 제어 문자([C, [D 등)가 섞여 들어오면 제거한다.
  SERVER_URL="$(printf '%s' "$SERVER_URL" | sed $'s/\x1b\\[[0-9;]*[A-Za-z]//g; s/\\[[A-D]//g' | tr -d '[:cntrl:]' | tr -d ' ')"
  PROJECT_NAME="$(printf '%s' "$PROJECT_NAME" | sed $'s/\x1b\\[[0-9;]*[A-Za-z]//g; s/\\[[A-D]//g' | tr -d '[:cntrl:]')"
  SERVER_URL="${SERVER_URL:-$DEFAULT_SERVER}"
  PROJECT_NAME="${PROJECT_NAME:-$DEFAULT_NAME}"
  case "$SERVER_URL" in
    http://*|https://*) ;;
    *)
      echo "경고: 서버 주소 '$SERVER_URL' 가 http:// 또는 https:// 로 시작하지 않아 기본값($DEFAULT_SERVER)을 씁니다."
      SERVER_URL="$DEFAULT_SERVER"
      ;;
  esac

  # JSON 문자열로 안전하게 쓰기 위해 \ 와 " 를 이스케이프한다.
  json_escape() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    printf '%s' "$s"
  }

  mkdir -p "$TARGET/.cvagent"
  printf '{\n  "server_url": "%s",\n  "project_name": "%s"\n}\n' \
    "$(json_escape "$SERVER_URL")" "$(json_escape "$PROJECT_NAME")" > "$CONFIG"
  echo "[3/4] .cvagent/config.json 생성 완료 (서버: $SERVER_URL, 프로젝트: $PROJECT_NAME)"
fi

# 4) .gitignore 에 .cvagent/ 추가
GITIGNORE="$TARGET/.gitignore"
if [ -f "$GITIGNORE" ] && grep -qxE '/?\.cvagent/?' "$GITIGNORE"; then
  echo "[4/4] .gitignore 에 .cvagent/ 가 이미 있습니다."
else
  # 마지막 줄 끝에 줄바꿈이 없으면 먼저 넣는다.
  if [ -s "$GITIGNORE" ] && [ -n "$(tail -c 1 "$GITIGNORE")" ]; then
    printf '\n' >> "$GITIGNORE"
  fi
  printf '.cvagent/\n' >> "$GITIGNORE"
  echo "[4/4] .gitignore 에 .cvagent/ 추가 완료"
fi

echo "설치가 끝났습니다."
