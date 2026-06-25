# 기여 가이드

## Git 워크플로우 (필수)

`main` 브랜치는 GitHub Branch protection으로 보호되어 있어 **직접 push가 거부됩니다**. 코드를 변경할 때는 항상 아래 절차를 따르세요.

1. 작업 시작 전 `main`을 최신화
   ```bash
   git checkout main
   git pull origin main
   ```
2. 새 브랜치 생성 (작업 내용을 알 수 있게 이름 짓기)
   ```bash
   git checkout -b feature/설명   # 기능 추가
   git checkout -b fix/설명       # 버그 수정
   ```
3. 평소처럼 작업 후 커밋
   ```bash
   git add .
   git commit -m "작업 내용 설명"
   ```
4. 브랜치를 push (절대 `main`에 직접 push 시도하지 말 것)
   ```bash
   git push -u origin <브랜치명>
   ```
5. PR 생성
   ```bash
   gh pr create --title "..." --body "..."
   ```
   또는 push 후 GitHub 저장소 페이지에 뜨는 **"Compare & pull request"** 버튼을 눌러도 됩니다.
6. 저장소 소유자(hoony989)의 리뷰 승인을 받은 뒤 main에 merge합니다

`main`에 직접 push를 시도하면 거부됩니다 — 항상 새 브랜치를 따고 PR을 통해서만 반영하세요.

## 머지 규칙 (중요)

`main` 머지에는 **저장소 소유자(@hoony989)의 리뷰 승인이 반드시 필요합니다.** (`.github/CODEOWNERS` + 브랜치 보호의 "Require review from Code Owners")

- 다른 협업자(write 권한)끼리 서로 PR을 approve해도 **머지되지 않습니다.** 코드오너 승인이 아니기 때문이에요.
- 즉, PR을 올린 뒤 **@hoony989의 승인을 기다려야** 머지 버튼이 열립니다.
- "Approve를 받았는데 왜 머지가 안 되지?" 싶으면, 그 승인이 owner의 것인지 확인하세요.
