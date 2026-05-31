# Search Composer Domain Overlap Warning

## 관찰

- daemon research API는 `includeDomains`와 `excludeDomains`가 겹치면 exclude 쪽 겹치는 항목을 제거하고 경고한다.
- web composer의 `/search` 파서는 현재 겹치는 domain을 그대로 명령에 넣는다.
- 같은 domain을 include와 exclude에 동시에 넣으면 실제 적용 조건을 사용자가 예측하기 어렵다.

## 제품 리스크

- agent prompt에는 서로 충돌하는 검색 조건이 남고, daemon 결과에서는 일부 조건이 제거된다.
- 리서치 리포트 Metadata와 사용자가 보낸 composer prompt가 다르게 보일 수 있다.
- 도메인 제한은 출처 품질과 직결되므로 조용한 충돌보다 명시적 정리가 낫다.

## 개선 원칙

- include domain을 우선한다.
- include와 겹치는 exclude domain은 composer 단계에서 제거한다.
- 제거 이유는 `Research parser warning`으로 남겨 daemon 정책과 맞춘다.

## A/B 검증 기준

- Before: `/search --include-domains openai.com --exclude-domains openai.com,reddit.com ...` 명령에 두 목록 모두 `openai.com`이 남는다.
- After: exclude 목록에는 `reddit.com`만 남고, overlap 제거 경고가 추가된다.
