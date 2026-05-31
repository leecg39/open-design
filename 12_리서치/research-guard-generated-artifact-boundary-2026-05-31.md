# Guard Generated Artifact Boundary

## 관찰

- `pnpm guard`는 `scripts/guard.ts`의 `collectResidualJavaScript(repoRoot)`로 저장소 전체 파일시스템을 직접 순회한다.
- `.gitignore`나 git tracked 상태와 무관하게 `.js`, `.mjs`, `.cjs` 파일을 검사한다.
- 현재 반복 실패 항목은 untracked 로컬 산출물인 `factolink-ir-deck/assets/runtime.js`다.
- `factolink-ir-deck/`에는 `index.html`, `style.css`, `assets/`, `verification/` 등이 있어 이전 작업에서 생성된 deck/export 산출물로 보인다.

## 제품/저장소 리스크

- guard allowlist에 `factolink-ir-deck/`를 추가하면 현재 로컬 guard는 통과할 수 있다.
- 하지만 특정 로컬 산출물 이름을 저장소 정책에 넣으면, 실제 신규 JavaScript가 root 산출물 폴더에 생겨도 guard가 놓칠 수 있다.
- 사용자 산출물을 임의로 이동하거나 삭제하면 기존 검증 이미지와 HTML 결과물을 잃을 수 있다.

## 판단

- 이 루프에서는 guard 정책을 완화하지 않는다.
- `factolink-ir-deck/`는 사용자/생성 산출물로 보고 보존한다.
- 이후 이 산출물을 계속 보관해야 한다면, 별도 사용자 확인을 거쳐 `.tmp/`, `generated/`, 또는 명시적인 artifact 저장 위치로 이동하는 것이 안전하다.

## 검증 메모

- `pnpm guard`의 다른 checks는 통과한다.
- 반복 실패 메시지는 `Residual project-owned JavaScript files found: factolink-ir-deck/assets/runtime.js` 하나로 고정되어 있다.
