# SCSS 全局樣式系統

本專案已完成從CSS到SCSS的遷移，建立了統一的全局樣式系統。

## 📁 檔案結構

```
frontend/src/
├── main.scss                  # 主樣式檔案（包含所有全局樣式）
└── styles/
    ├── _variables.scss        # 🎨 設計變數（顏色、間距、字型等）
    ├── _mixins.scss          # 🔧 混合宏和動畫
    ├── _utilities.scss       # 🛠️ 通用工具類
    ├── index.scss            # 📦 統一導入入口
    └── [legacy].css          # 既有CSS檔案（向後兼容）
```

## 🎯 核心功能

### 1. 設計變數 (_variables.scss)

統一的設計token系統，確保整個應用的視覺一致性：

#### 顏色系統
```scss
$color-primary: #0d6efd;
$color-success: #28a745;
$color-warning: #ffc107;
$color-danger: #dc3545;
$color-info: #17a2b8;
```

#### 間距系統
```scss
$spacing-1: 4px;    // 0.25rem
$spacing-2: 8px;    // 0.5rem
$spacing-3: 12px;   // 0.75rem
$spacing-4: 16px;   // 1rem
$spacing-6: 24px;   // 1.5rem
$spacing-8: 32px;   // 2rem
```

#### 字型系統
```scss
$font-size-xs: 11px;
$font-size-sm: 12px;
$font-size-base: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;
```

### 2. Mixins (_mixins.scss)

可重用的樣式模式，減少重複代碼：

#### 佈局 Mixins
```scss
@include flex-center;      // 水平垂直置中
@include flex-between;     // 兩端對齊
@include flex-column;      // 垂直排列
```

#### 響應式 Mixins
```scss
@include respond-to('md') {
  // 在 768px 以上生效
  padding: $spacing-6;
}
```

#### 視覺效果 Mixins
```scss
@include card;             // 卡片樣式
@include hover-lift;       // 懸停浮起效果
@include overlay;          // 遮罩層
@include smooth-scroll;    // 平滑滾動
```

#### 動畫 Mixins
```scss
@include fade-in;          // 淡入動畫
@include slide-in-right;   // 右側滑入
@include spinner;          // 旋轉動畫
```

### 3. 工具類 (_utilities.scss)

常用的原子類，可直接在HTML中使用：

#### 佈局工具類
```html
<div class="flex-center gap-4">
<div class="flex-between">
<div class="flex-column">
```

#### 間距工具類
```html
<div class="m-4 p-6">        <!-- margin: 16px, padding: 24px -->
<div class="mt-2 mb-4">      <!-- margin-top: 8px, margin-bottom: 16px -->
<div class="px-4 py-2">      <!-- padding-x: 16px, padding-y: 8px -->
```

#### 文字工具類
```html
<span class="text-primary font-bold text-lg">
<p class="text-center text-sm text-muted">
```

#### 視覺工具類
```html
<div class="rounded shadow-md border">
<div class="bg-light p-4 rounded-lg">
```

## 💻 使用方式

### 在組件SCSS中使用

```scss
// MyComponent.scss
@import '../../styles/variables';
@import '../../styles/mixins';

.my-component {
  // 使用變數
  padding: $spacing-4;
  background: $color-primary;
  border-radius: $border-radius;
  
  // 使用mixins
  @include flex-center;
  
  // 響應式
  @include respond-to('md') {
    padding: $spacing-6;
  }
  
  // 嵌套
  .my-component-header {
    font-weight: $font-weight-bold;
    margin-bottom: $spacing-3;
  }
  
  // 偽類
  &:hover {
    @include hover-lift;
  }
}
```

### 在HTML/TSX中使用工具類

```tsx
// 佈局
<div className="flex-center gap-4 p-4">
  <span className="text-primary font-bold">標題</span>
</div>

// 卡片
<div className="card-base p-4 rounded shadow-md">
  <h3 className="text-lg font-semibold mb-3">卡片標題</h3>
  <p className="text-sm text-muted">內容</p>
</div>

// 按鈕
<button className="btn btn-primary btn-icon">
  <i className="bi bi-check"></i>
  <span>確認</span>
</button>
```

## 🔄 遷移既有CSS到SCSS

### 步驟1：重命名檔案
```bash
mv MyComponent.css MyComponent.scss
```

### 步驟2：導入變數和mixins
```scss
@import '../../styles/variables';
@import '../../styles/mixins';
```

### 步驟3：替換硬編碼值

**Before (CSS):**
```css
.card {
  padding: 16px;
  background: #0d6efd;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**After (SCSS):**
```scss
.card {
  padding: $spacing-4;
  background: $color-primary;
  border-radius: $border-radius;
  box-shadow: $shadow;
}
```

### 步驟4：使用嵌套

**Before (CSS):**
```css
.card { }
.card .card-header { }
.card .card-body { }
.card:hover { }
```

**After (SCSS):**
```scss
.card {
  .card-header { }
  .card-body { }
  
  &:hover { }
}
```

### 步驟5：使用mixins簡化

**Before (CSS):**
```css
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
}
```

**After (SCSS):**
```scss
.overlay {
  @include fixed-full;
  @include flex-center;
  background: $bg-overlay;
}
```

## 📋 快速參考

### 常用變數

| 類別 | 變數 | 值 |
|------|------|-----|
| 主色 | `$color-primary` | #0d6efd |
| 成功 | `$color-success` | #28a745 |
| 警告 | `$color-warning` | #ffc107 |
| 危險 | `$color-danger` | #dc3545 |
| 資訊 | `$color-info` | #17a2b8 |
| 間距-小 | `$spacing-2` | 8px |
| 間距-中 | `$spacing-4` | 16px |
| 間距-大 | `$spacing-6` | 24px |
| 字型-小 | `$font-size-sm` | 12px |
| 字型-基準 | `$font-size-base` | 14px |
| 字型-大 | `$font-size-lg` | 18px |
| 圓角 | `$border-radius` | 8px |
| 陰影 | `$shadow` | 0 1px 3px rgba(0,0,0,0.1) |

### 常用Mixins

| Mixin | 用途 | 範例 |
|-------|------|------|
| `flex-center` | 水平垂直置中 | `@include flex-center;` |
| `flex-between` | 兩端對齊 | `@include flex-between;` |
| `card` | 卡片樣式 | `@include card;` |
| `hover-lift` | 懸停浮起 | `@include hover-lift;` |
| `overlay` | 遮罩層 | `@include overlay;` |
| `respond-to('md')` | 響應式斷點 | `@include respond-to('md') { ... }` |
| `fade-in` | 淡入動畫 | `@include fade-in;` |
| `smooth-scroll` | 平滑滾動 | `@include smooth-scroll;` |

### 常用工具類

| 類別 | 工具類 | 效果 |
|------|--------|------|
| 佈局 | `flex-center` | 置中對齊 |
| 佈局 | `flex-between` | 兩端對齊 |
| 間距 | `m-4` / `p-4` | margin/padding: 16px |
| 間距 | `gap-4` | gap: 16px |
| 文字 | `text-primary` | 主色文字 |
| 文字 | `font-bold` | 粗體 |
| 文字 | `text-lg` | 大字 |
| 視覺 | `rounded` | 圓角 |
| 視覺 | `shadow-md` | 中等陰影 |
| 動畫 | `hover-lift` | 懸停浮起 |

## 🎨 設計原則

1. **一致性**：使用統一的設計變數確保視覺一致
2. **可維護性**：集中管理樣式，易於修改和維護
3. **可重用性**：透過mixins和工具類減少重複代碼
4. **響應式**：使用響應式mixins確保多設備適配
5. **可擴展性**：模組化結構便於新增功能

## 📚 相關文檔

- [SCSS遷移指南](./SCSS_MIGRATION_GUIDE.md) - 詳細的遷移步驟和範例
- [Bootstrap文檔](https://getbootstrap.com/) - Bootstrap 5 官方文檔
- [SCSS文檔](https://sass-lang.com/) - SCSS官方文檔

## ⚠️ 注意事項

1. **向後兼容**：所有既有CSS檔案仍然保留，確保向後兼容
2. **逐步遷移**：不需要一次性遷移所有檔案，可以逐步進行
3. **測試**：遷移後務必測試視覺效果是否一致
4. **命名規範**：SCSS partial檔案以底線開頭（如 `_variables.scss`）
5. **導入順序**：variables → mixins → utilities → components

## 🚀 開始使用

1. 樣式已自動在 `main.tsx` 中載入
2. 在新組件中直接使用工具類或導入SCSS
3. 遷移既有組件時參考遷移指南
4. 保持統一的設計變數使用

## 💡 最佳實踐

1. **優先使用工具類**：能用工具類就不寫自定義樣式
2. **使用設計變數**：避免硬編碼顏色和尺寸
3. **善用mixins**：重複的樣式模式封裝成mixin
4. **嵌套適度**：避免過深的嵌套（建議不超過3層）
5. **語義化命名**：使用有意義的class名稱

---

**建立日期**: 2025-12-30  
**維護者**: Development Team  
**版本**: 1.0.0
