/**
 * SCSS遷移指南
 * 
 * 本專案已建立完整的SCSS架構，包含全局變數、mixins和工具類。
 * 此文件說明如何將現有CSS檔案遷移到SCSS。
 */

## 已建立的檔案結構

```
frontend/src/
├── main.scss                  # 主樣式檔案（取代main.css）
└── styles/
    ├── _variables.scss        # 設計變數（顏色、間距、字型等）
    ├── _mixins.scss          # 混合宏和動畫
    ├── _utilities.scss       # 通用工具類
    └── index.scss            # 統一導入入口
```

## 主要功能

### 1. 設計變數 (_variables.scss)

統一的設計token，包含：
- 顏色系統（primary, secondary, semantic colors）
- 間距系統（0-12等級）
- 字型系統（sizes, weights, line-heights）
- 圓角、陰影、z-index等

### 2. Mixins (_mixins.scss)

可重用的樣式模式：
- 佈局：flex-center, flex-between, flex-column
- 響應式：respond-to('md')
- 視覺效果：card, overlay, hover-lift
- 動畫：fade-in, slide-in-right, spinner

### 3. 工具類 (_utilities.scss)

常用的原子類：
- 佈局：flex-center, flex-between
- 間距：m-*, p-*, gap-*
- 文字：text-*, font-*, leading-*
- 顏色：text-*, bg-*
- 邊框：border-*, rounded-*
- 陰影：shadow-*

## 使用方式

### 在組件中使用SCSS

```scss
// MyComponent.scss
@import '../../styles/variables';
@import '../../styles/mixins';

.my-component {
  padding: $spacing-4;
  background: $color-primary;
  border-radius: $border-radius;
  @include flex-center;
  
  @include respond-to('md') {
    padding: $spacing-6;
  }
  
  &:hover {
    @include hover-lift;
  }
}
```

### 在HTML中使用工具類

```tsx
<div className="flex-center gap-4 p-4 rounded shadow-md">
  <span className="text-primary font-bold">Hello</span>
</div>
```

## 遷移步驟

### 步驟1：重命名檔案
將 `.css` 改為 `.scss`

### 步驟2：導入變數和mixins
在檔案開頭添加：
```scss
@import '../../styles/variables';
@import '../../styles/mixins';
```

### 步驟3：替換硬編碼值

**Before:**
```css
.card {
  padding: 16px;
  background: #0d6efd;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**After:**
```scss
.card {
  padding: $spacing-4;
  background: $color-primary;
  border-radius: $border-radius;
  box-shadow: $shadow;
}
```

### 步驟4：使用嵌套

**Before:**
```css
.card {
  background: white;
}
.card .card-header {
  padding: 12px;
}
.card .card-body {
  padding: 16px;
}
```

**After:**
```scss
.card {
  background: $color-white;
  
  .card-header {
    padding: $spacing-3;
  }
  
  .card-body {
    padding: $spacing-4;
  }
}
```

### 步驟5：使用mixins

**Before:**
```css
.loading-overlay {
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

**After:**
```scss
.loading-overlay {
  @include fixed-full;
  @include flex-center;
  background: $bg-overlay;
}
```

### 步驟6：響應式設計

**Before:**
```css
.component {
  padding: 16px;
}

@media (min-width: 768px) {
  .component {
    padding: 24px;
  }
}
```

**After:**
```scss
.component {
  padding: $spacing-4;
  
  @include respond-to('md') {
    padding: $spacing-6;
  }
}
```

## 設計變數參考

### 常用顏色
- `$color-primary`: #0d6efd
- `$color-success`: #28a745
- `$color-warning`: #ffc107
- `$color-danger`: #dc3545
- `$color-info`: #17a2b8

### 常用間距
- `$spacing-1`: 4px
- `$spacing-2`: 8px
- `$spacing-3`: 12px
- `$spacing-4`: 16px
- `$spacing-6`: 24px
- `$spacing-8`: 32px

### 字型大小
- `$font-size-xs`: 11px
- `$font-size-sm`: 12px
- `$font-size-base`: 14px
- `$font-size-md`: 16px
- `$font-size-lg`: 18px
- `$font-size-xl`: 20px

### 響應式斷點
- `xs`: < 576px
- `sm`: >= 576px
- `md`: >= 768px
- `lg`: >= 992px
- `xl`: >= 1200px

## 常用Mixins

```scss
@include flex-center;           // 水平垂直置中
@include flex-between;          // 兩端對齊
@include card;                  // 卡片樣式
@include hover-lift;            // 懸停浮起效果
@include overlay;               // 遮罩層
@include respond-to('md');      // 響應式斷點
@include fade-in;               // 淡入動畫
@include slide-in-right;        // 右側滑入
@include smooth-scroll;         // 平滑滾動
```

## 建議優先遷移的檔案

1. **組件CSS** (依使用頻率)
   - ChatMessage.css
   - WorkflowStepper.css
   - LoadingOverlay.css
   - ToastMessage.css

2. **佈局CSS**
   - two-column-layout.css
   - responsive.css

3. **主題CSS**
   - badges.css
   - card.css

## 注意事項

1. **向後兼容**：main.tsx仍會導入Bootstrap和既有CSS
2. **逐步遷移**：不需要一次性全部遷移
3. **測試**：遷移後確保視覺效果一致
4. **命名**：SCSS部分檔案以底線開頭（如_variables.scss）表示是partial檔案
5. **導入順序**：variables → mixins → utilities → components

## 下一步

1. 更新 main.tsx 導入新的 main.scss
2. 逐步將組件CSS遷移到SCSS
3. 使用工具類減少重複樣式
4. 統一設計token確保一致性
