# Search Composer Time Range Date Warning

## 관찰

- daemon research API는 `timeRange`와 exact date filter가 함께 오면 `timeRange`를 무시하고 경고한다.
- web composer의 `/search` 파서는 현재 `--week --start-date ...` 같은 입력을 그대로 명령에 넣는다.
- 같은 요청이 composer prompt와 daemon 처리 결과에서 다르게 보일 수 있다.

## 제품 리스크

- 사용자는 recency filter와 exact date filter가 동시에 적용된다고 오해할 수 있다.
- agent가 실행한 명령과 daemon이 실제 적용한 검색 조건 사이에 설명 gap이 생긴다.
- 리서치 리포트의 Metadata와 composer prompt가 서로 달라질 수 있다.

## 개선 원칙

- exact date filter가 있으면 composer 단계에서 `timeRange`를 제거한다.
- 제거 이유는 `Research parser warning`으로 남긴다.
- daemon의 정책과 문구 의미를 맞춘다.

## A/B 검증 기준

- Before: `/search --week --start-date 2026-05-01 ...` 명령에 `--time-range week`와 `--start-date`가 함께 들어간다.
- After: 같은 입력은 `--start-date`만 명령에 넣고, timeRange 제거 경고를 남긴다.
