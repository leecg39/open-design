# Search Composer Max Sources Clamp

## 관찰

- daemon research API는 provider 제한 때문에 `maxSources`를 최대 20으로 clamp하고 경고한다.
- web composer의 `/search` 파서는 양수이면 20을 초과해도 그대로 명령에 넣는다.
- 사용자가 `/search --max-sources 50 ...`을 입력하면 prompt에는 50이 보이지만 실제 검색은 20으로 제한된다.

## 제품 리스크

- 사용자는 50개 출처를 요청했다고 생각하지만 리포트에는 effective source cap 20이 남는다.
- agent가 실행 전후 조건 차이를 설명하지 못하면 A/B 비교 기준이 흐려진다.
- composer가 이미 많은 validation을 하므로 provider cap도 같은 표면에서 알려주는 편이 일관적이다.

## 개선 원칙

- 1 이상의 숫자는 계속 허용하되 정수로 floor한다.
- 20 초과 값은 composer 단계에서 20으로 clamp한다.
- clamp 이유는 daemon과 같은 의미의 parser warning으로 남긴다.

## A/B 검증 기준

- Before: `/search --max-sources 50 ...` 명령에 `--max-sources 50`이 들어간다.
- After: 같은 입력은 `--max-sources 20`으로 명령을 만들고 provider limit 경고를 남긴다.
