# Search Composer Domain Drop Warning

## 관찰

- daemon research API는 domain filter에 invalid, duplicate, excess entry가 있으면 경고한다.
- web composer의 `/search` 파서는 valid domain이 하나라도 있으면 같은 값 안의 invalid/duplicate entry를 조용히 버린다.
- 예: `--include-domains openai.com,localhost,openai.com`은 최종 명령에 `openai.com`만 남지만 이유가 표시되지 않는다.

## 제품 리스크

- 사용자가 의도한 source restriction 일부가 빠졌다는 사실을 놓칠 수 있다.
- 리서치 출처 범위는 결과 품질과 직접 연결되므로 조용한 손실보다 명시적 경고가 낫다.
- daemon과 composer의 validation 경험이 달라진다.

## 개선 원칙

- 정상 domain은 계속 사용한다.
- invalid, duplicate, 20개 초과 entry는 제거한다.
- 제거가 발생하면 `Research parser warning`으로 알려준다.

## A/B 검증 기준

- Before: mixed domain list에서 invalid/duplicate가 조용히 제거된다.
- After: 최종 명령은 정규화된 domain만 포함하고, 제거 경고가 prompt에 남는다.
