# Search Composer Domain Cross-Flag Dedupe

## 관찰

- `/search --include-domains openai.com,openai.com` 같은 한 flag 내부 duplicate는 composer가 제거하고 경고한다.
- 그러나 `/search --include-domains openai.com --include-domains openai.com,docs.openai.com`처럼 여러 flag에 걸친 duplicate는 최종 목록에 남을 수 있다.
- daemon은 최종 domain 목록을 dedupe하므로 composer prompt와 실제 요청이 달라질 수 있다.

## 제품 리스크

- prompt의 command example에 중복 domain이 남아 리서치 조건이 지저분해진다.
- agent가 조건을 설명할 때 실제 daemon 처리와 다른 입력 목록을 근거로 삼을 수 있다.

## 개선 원칙

- 각 flag parsing 이후 최종 include/exclude domain 목록도 dedupe한다.
- 제거가 발생하면 parser warning을 남긴다.
- 기존 overlap 제거 정책은 dedupe 이후 실행한다.

## A/B 검증 기준

- Before: 여러 include flag에 같은 domain을 넣으면 command에 duplicate가 남는다.
- After: command에는 unique domain만 남고 duplicate 제거 경고가 표시된다.
