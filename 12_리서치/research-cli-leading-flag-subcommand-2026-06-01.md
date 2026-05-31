# Research CLI Leading Flag Subcommand Detection

## 관찰

- `od research`는 subcommand를 찾기 위해 첫 non-flag token을 사용한다.
- `od research --daemon-url http://127.0.0.1:7456 search --query ...`처럼 값이 있는 flag가 subcommand 앞에 오면 URL 값이 subcommand로 오인된다.
- 사용자는 다른 CLI에서 흔히 쓰는 "옵션 먼저, subcommand 나중" 순서를 자연스럽게 시도할 수 있다.

## 제품 리스크

- 올바른 정보가 들어간 명령이 `unknown subcommand`로 실패한다.
- UI가 안내한 research command를 사용자가 약간 재배열했을 때 복구성이 낮다.
- query 값이 `search`나 `help`일 때 subcommand로 오인되는 경계도 같이 존재한다.

## 개선 원칙

- subcommand 탐색 중 값이 필요한 known research flag의 다음 토큰은 건너뛴다.
- 실제 subcommand는 `search` 또는 `help` token만 인정한다.
- subcommand가 없으면 기존처럼 help/error 경로로 보낸다.

## A/B 검증 기준

- Before: leading `--daemon-url http://... search` 입력에서 subcommand가 URL로 잡힌다.
- After: subcommand는 `search`, subArgs는 daemon-url과 query flags를 유지한다.
