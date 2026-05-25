# 🐾 Virtual Pet App

## 폴더 구조

```
pet-app/
├── index.html          # 메인 HTML
├── style.css           # 스타일
├── app.js              # 메인 로직
├── assets/
│   ├── ui/             # 개발자가 준비하는 UI 이미지 (유저 변경 불가)
│   │   ├── box-frame.png     # 박스 틀 이미지 (투명 PNG 권장)
│   │   ├── shower.png        # 샤워기 이미지
│   │   ├── curtain-open.png  # 열린 커튼
│   │   ├── curtain-closed.png# 닫힌 커튼
│   │   └── sparkle.png       # 반짝 효과 (또는 sparkle.gif)
│   └── avatar/         # 유저가 설정 팝업에서 업로드하는 이미지 (base64로 저장)
│       # normal, cry, angry, happy, eating, sleeping, food
```

## assets/ui/ 이미지 교체 방법

`assets/ui/` 폴더 안의 파일명을 유지하면서 이미지를 교체하면 됩니다.

| 파일명 | 용도 | 권장 크기 |
|--------|------|-----------|
| `box-frame.png` | 박스 틀 오버레이 (투명 PNG) | 380×280px |
| `shower.png` | 샤워기 이미지 | 120×180px |
| `curtain-open.png` | 열린 샤워 커튼 | 160×220px |
| `curtain-closed.png` | 닫힌 샤워 커튼 | 160×220px |
| `sparkle.png` | 반짝 효과 (GIF도 가능) | 100×100px |

## 유저 설정 이미지 (업로드)

설정 팝업에서 유저가 직접 업로드하며, localStorage에 base64로 저장됩니다.

- 😐 **일반** - 기본 표정
- 😢 **우는** - 수치 30% 미만 시
- 😠 **화남** - 수치 15% 미만 시
- 😄 **웃음** - 수치 75% 이상 시
- 🍽️ **먹는 중** - 음식 먹을 때
- 💤 **자는 중** - 잠자기 화면에 표시
- 🍖 **음식** - 떨어지는 음식 이미지