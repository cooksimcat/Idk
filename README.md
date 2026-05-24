# 🐾 나의 아바타 — 파일 구조 가이드

## 폴더 구조
```
petapp/
├── index.html       ← 메인 앱 (건드릴 필요 거의 없음)
├── config.js        ← 🎨 여기서 이미지 경로 & 테마 설정
└── assets/
    ├── ui/
    │   ├── box_bg.png          ← 박스 배경 이미지 (선택)
    │   └── box_border.png      ← 박스 테두리 이미지 (선택)
    ├── actions/
    │   ├── btn_sleep.png       ← 재우기 버튼 아이콘
    │   ├── btn_eat.png         ← 먹이기 버튼 아이콘
    │   ├── btn_wash.png        ← 씻기기 버튼 아이콘
    │   ├── sleep_scene.png     ← 잠자는 장면 이미지
    │   ├── food.png            ← 떨어지는 음식
    │   ├── shower.png          ← 샤워기 (캐릭터보다 크게)
    │   ├── curtain_open.png    ← 커튼 열린 상태
    │   └── curtain_close.png   ← 커튼 닫힌 상태
    └── avatar/                 ← 아바타 이미지 (앱 내에서 설정)
```

## config.js 설정 방법

### 박스 배경 이미지 바꾸기
```js
boxBgImage: 'assets/ui/box_bg.png',
```
- 권장 크기: **380×280px** (png, 투명 배경 가능)
- `null`로 두면 CSS 단색 배경 사용

### 박스 테두리 이미지 바꾸기
```js
boxBorderImage: 'assets/ui/box_border.png',
```
- 9-slice 방식으로 적용됨 (CSS `border-image`)
- `null`이면 기본 CSS 테두리 사용

### 액션 버튼 아이콘 바꾸기
```js
actionButtons: {
  sleep: { image: 'assets/actions/btn_sleep.png', label: '재우기' },
  eat:   { image: 'assets/actions/btn_eat.png',   label: '먹이기' },
  wash:  { image: 'assets/actions/btn_wash.png',  label: '씻기기' },
},
```
- 권장 크기: **56×56px** (투명 배경 png)
- `image: null`이면 emoji 사용

### 액션 연출 이미지
```js
actionScenes: {
  sleep: { image: 'assets/actions/sleep_scene.png' },
  eat:   { foodImage: 'assets/actions/food.png' },
  wash: {
    showerImage:      'assets/actions/shower.png',
    curtainOpenImage: 'assets/actions/curtain_open.png',
    curtainCloseImage:'assets/actions/curtain_close.png',
  },
},
```

### 테마 색상 바꾸기
```js
theme: {
  bg:        '#fdf6ee',  // 페이지 배경
  boxBg:     '#fff9f3',  // 박스 내부 색
  boxBorder: '#e8c9a0',  // 테두리 색
  accent:    '#f4845f',  // 포인트 색 (버튼 등)
  accent2:   '#7ec8c8',  // 스탯바 색
  ...
}
```

## 이미지 권장 사항
| 용도 | 권장 크기 | 형식 |
|------|-----------|------|
| 박스 배경 | 380×280 | PNG / JPG |
| 박스 테두리 | 380×280 | PNG (투명 배경) |
| 버튼 아이콘 | 56×56 | PNG (투명 배경) |
| 잠자는 장면 | 160×160 | PNG (투명 배경) |
| 음식 | 80×80 | PNG (투명 배경) |
| 샤워기/커튼 | 130×160 | PNG (투명 배경) |
| 아바타 | 120×120 권장 | PNG (투명 배경) |

## 배포 (GitHub Pages)
1. 레포에 폴더째로 push
2. Settings → Pages → Deploy from branch
3. `https://[username].github.io/[repo]/` 로 접근

## 로컬스토리지
- 아바타 이미지는 **Base64** 형식으로 저장 → 원본 파일 삭제되어도 유지됨
- 스탯, 이름, 첫 설정 완료 여부도 함께 저장
- 스토리지 키: `petAppData_v3`
