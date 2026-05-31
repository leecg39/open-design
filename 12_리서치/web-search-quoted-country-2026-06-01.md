# Web search quoted country parsing

## 배경

`/search --country South Korea ...`는 multi-token country로 처리되지만, 사용자가 자연스럽게 `/search --country "South Korea" ...`처럼 따옴표를 쓰면 기존 공백 기반 파서가 `"South`만 invalid country 값으로 소비하고 `Korea"`를 canonical query에 남길 수 있었다.

## A/B 검증

- RED: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "multi-word /search country names"` 실패.
- 실패 내용: prompt가 `--country south-korea`를 포함하지 않았고 canonical query가 `Korea" AI design market`으로 오염됐다.
- 개선안: country 정규화 전에 양끝이 같은 `'` 또는 `"`인 wrapping quote를 제거한다.
- GREEN: 같은 테스트 통과. `/search --country "South Korea" AI design market`은 country `south korea`를 metadata로 보내고 query는 `AI design market`만 남긴다.

## 반영 기준

검색 명령은 사용자가 자연스럽게 쓰는 인용부호를 허용해야 한다. multi-word country 값이 query로 새면 검색 의도가 바뀌므로, composer 단계에서 안전하게 정규화한다.
