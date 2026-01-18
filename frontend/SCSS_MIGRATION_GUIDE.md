/**
 * SCSS Migration Guide
 * 
 * This project has established a complete SCSS architecture, including global variables, mixins, and utility classes.
 * This document explains how to migrate existing CSS files to SCSS.
 */

## Established File Structure

```
frontend/src/
├── main.scss                  # Main style file (replaces main.css)
└── styles/
    ├── _variables.scss        # Design variables (colors, spacing, typography, etc.)
    ├── _mixins.scss          # Mixins and animations
    ├── _utilities.scss       # Common utility classes
    └── index.scss            # Unified import entry point
```

## Key Features

### 1. Design Variables (_variables.scss)

Unified design tokens, including:
- Color system (primary, secondary, semantic colors)
- Spacing system (0-12 levels)
- Typography system (sizes, weights, line-heights)
- Border radius, shadows, z-index, etc.

### 2. Mixins (_mixins.scss)

Reusable style patterns:
- Layout: flex-center, flex-between, flex-column
- Responsive: respond-to('md')
- Visual effects: card, overlay, hover-lift
- Animations: fade-in, slide-in-right, spinner

### 3. Utility Classes (_utilities.scss)

Common atomic classes:
- Layout: flex-center, flex-between
- Spacing: m-*, p-*, gap-*
- Text: text-*, font-*, leading-*
- Colors: text-*, bg-*
- Borders: border-*, rounded-*
- Shadows: shadow-*

## Usage

### Using SCSS in Components

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

### Using Utility Classes in HTML

```tsx
<div className="flex-center gap-4 p-4 rounded shadow-md">
  <span className="text-primary font-bold">Hello</span>
</div>
```

## Migration Steps

### Step 1: Rename Files
Rename `.css` to `.scss`

### Step 2: Import Variables and Mixins
Add at the beginning of the file:
```scss
@import '../../styles/variables';
@import '../../styles/mixins';
```

### Step 3: Replace Hard-coded Values

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

### Step 4: Use Nesting

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

### Step 5: Use Mixins

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

### Step 6: Responsive Design

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

## Design Variables Reference

### Common Colors
- `$color-primary`: #0d6efd
- `$color-success`: #28a745
- `$color-warning`: #ffc107
- `$color-danger`: #dc3545
- `$color-info`: #17a2b8

### Common Spacing
- `$spacing-1`: 4px
- `$spacing-2`: 8px
- `$spacing-3`: 12px
- `$spacing-4`: 16px
- `$spacing-6`: 24px
- `$spacing-8`: 32px

### Font Sizes
- `$font-size-xs`: 11px
- `$font-size-sm`: 12px
- `$font-size-base`: 14px
- `$font-size-md`: 16px
- `$font-size-lg`: 18px
- `$font-size-xl`: 20px

### Responsive Breakpoints
- `xs`: < 576px
- `sm`: >= 576px
- `md`: >= 768px
- `lg`: >= 992px
- `xl`: >= 1200px

## Common Mixins

```scss
@include flex-center;           // Center horizontally and vertically
@include flex-between;          // Space between
@include card;                  // Card style
@include hover-lift;            // Hover lift effect
@include overlay;               // Overlay layer
@include respond-to('md');      // Responsive breakpoint
@include fade-in;               // Fade-in animation
@include slide-in-right;        // Slide in from right
@include smooth-scroll;         // Smooth scrolling
```

## Recommended Migration Priority

1. **Component CSS** (by usage frequency)
   - ChatMessage.css
   - WorkflowStepper.css
   - LoadingOverlay.css
   - ToastMessage.css

2. **Layout CSS**
   - two-column-layout.css
   - responsive.css

3. **Theme CSS**
   - badges.css
   - card.css

## Important Notes

1. **Backward Compatible**: main.tsx still imports Bootstrap and existing CSS
2. **Gradual Migration**: No need to migrate everything at once
3. **Testing**: Ensure visual consistency after migration
4. **Naming**: SCSS partial files start with underscore (e.g., _variables.scss)
5. **Import Order**: variables → mixins → utilities → components

## Next Steps

1. Update main.tsx to import new main.scss
2. Gradually migrate component CSS to SCSS
3. Use utility classes to reduce duplicate styles
4. Unify design tokens to ensure consistency
