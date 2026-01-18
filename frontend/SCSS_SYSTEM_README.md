# SCSS Global Style System

This project has completed migration from CSS to SCSS, establishing a unified global style system.

## 📁 File Structure

```
frontend/src/
├── main.scss                  # Main style file (contains all global styles)
└── styles/
    ├── _variables.scss        # 🎨 Design variables (colors, spacing, typography, etc.)
    ├── _mixins.scss          # 🔧 Mixins and animations
    ├── _utilities.scss       # 🛠️ Common utility classes
    ├── index.scss            # 📦 Unified import entry point
    └── [legacy].css          # Legacy CSS files (backward compatible)
```

## 🎯 Core Features

### 1. Design Variables (_variables.scss)

Unified design token system ensuring visual consistency throughout the application:

#### Color System
```scss
$color-primary: #0d6efd;
$color-success: #28a745;
$color-warning: #ffc107;
$color-danger: #dc3545;
$color-info: #17a2b8;
```

#### Spacing System
```scss
$spacing-1: 4px;    // 0.25rem
$spacing-2: 8px;    // 0.5rem
$spacing-3: 12px;   // 0.75rem
$spacing-4: 16px;   // 1rem
$spacing-6: 24px;   // 1.5rem
$spacing-8: 32px;   // 2rem
```

#### Typography System
```scss
$font-size-xs: 11px;
$font-size-sm: 12px;
$font-size-base: 14px;
$font-size-md: 16px;
$font-size-lg: 18px;
```

### 2. Mixins (_mixins.scss)

Reusable style patterns to reduce code duplication:

#### Layout Mixins
```scss
@include flex-center;      // Center horizontally and vertically
@include flex-between;     // Space between
@include flex-column;      // Vertical layout
```

#### Responsive Mixins
```scss
@include respond-to('md') {
  // Applies on 768px and above
  padding: $spacing-6;
}
```

#### Visual Effect Mixins
```scss
@include card;             // Card style
@include hover-lift;       // Hover lift effect
@include overlay;          // Overlay layer
@include smooth-scroll;    // Smooth scrolling
```

#### Animation Mixins
```scss
@include fade-in;          // Fade-in animation
@include slide-in-right;   // Slide in from right
@include spinner;          // Rotation animation
```

### 3. Utility Classes (_utilities.scss)

Common atomic classes that can be used directly in HTML:

#### Layout Utility Classes
```html
<div class="flex-center gap-4">
<div class="flex-between">
<div class="flex-column">
```

#### Spacing Utility Classes
```html
<div class="m-4 p-6">        <!-- margin: 16px, padding: 24px -->
<div class="mt-2 mb-4">      <!-- margin-top: 8px, margin-bottom: 16px -->
<div class="px-4 py-2">      <!-- padding-x: 16px, padding-y: 8px -->
```

#### Text Utility Classes
```html
<span class="text-primary font-bold text-lg">
<p class="text-center text-sm text-muted">
```

#### Visual Utility Classes
```html
<div class="rounded shadow-md border">
<div class="bg-light p-4 rounded-lg">
```

## 💻 Usage

### Using in Component SCSS

```scss
// MyComponent.scss
@import '../../styles/variables';
@import '../../styles/mixins';

.my-component {
  // Use variables
  padding: $spacing-4;
  background: $color-primary;
  border-radius: $border-radius;
  
  // Use mixins
  @include flex-center;
  
  // Responsive
  @include respond-to('md') {
    padding: $spacing-6;
  }
  
  // Nesting
  .my-component-header {
    font-weight: $font-weight-bold;
    margin-bottom: $spacing-3;
  }
  
  // Pseudo-class
  &:hover {
    @include hover-lift;
  }
}
```

### Using Utility Classes in HTML/TSX

```tsx
// Layout
<div className="flex-center gap-4 p-4">
  <span className="text-primary font-bold">Title</span>
</div>

// Card
<div className="card-base p-4 rounded shadow-md">
  <h3 className="text-lg font-semibold mb-3">Card Title</h3>
  <p className="text-sm text-muted">Content</p>
</div>

// Button
<button className="btn btn-primary btn-icon">
  <i className="bi bi-check"></i>
  <span>Confirm</span>
</button>
```

## 🔄 Migrating Existing CSS to SCSS

### Step 1: Rename Files
```bash
mv MyComponent.css MyComponent.scss
```

### Step 2: Import Variables and Mixins
```scss
@import '../../styles/variables';
@import '../../styles/mixins';
```

### Step 3: Replace Hard-coded Values

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

### Step 4: Use Nesting

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

### Step 5: Simplify with Mixins

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

## 📋 Quick Reference

### Common Variables

| Category | Variable | Value |
|------|------|-----|
| Primary | `$color-primary` | #0d6efd |
| Success | `$color-success` | #28a745 |
| Warning | `$color-warning` | #ffc107 |
| Danger | `$color-danger` | #dc3545 |
| Info | `$color-info` | #17a2b8 |
| Spacing-Small | `$spacing-2` | 8px |
| Spacing-Medium | `$spacing-4` | 16px |
| Spacing-Large | `$spacing-6` | 24px |
| Font-Small | `$font-size-sm` | 12px |
| Font-Base | `$font-size-base` | 14px |
| Font-Large | `$font-size-lg` | 18px |
| Border Radius | `$border-radius` | 8px |
| Shadow | `$shadow` | 0 1px 3px rgba(0,0,0,0.1) |

### Common Mixins

| Mixin | Purpose | Example |
|-------|------|------|
| `flex-center` | Center horizontally and vertically | `@include flex-center;` |
| `flex-between` | Space between | `@include flex-between;` |
| `card` | Card style | `@include card;` |
| `hover-lift` | Hover lift | `@include hover-lift;` |
| `overlay` | Overlay layer | `@include overlay;` |
| `respond-to('md')` | Responsive breakpoint | `@include respond-to('md') { ... }` |
| `fade-in` | Fade-in animation | `@include fade-in;` |
| `smooth-scroll` | Smooth scrolling | `@include smooth-scroll;` |

### Common Utility Classes

| Category | Utility Class | Effect |
|------|--------|------|
| Layout | `flex-center` | Center align |
| Layout | `flex-between` | Space between |
| Spacing | `m-4` / `p-4` | margin/padding: 16px |
| Spacing | `gap-4` | gap: 16px |
| Text | `text-primary` | Primary color text |
| Text | `font-bold` | Bold |
| Text | `text-lg` | Large text |
| Visual | `rounded` | Border radius |
| Visual | `shadow-md` | Medium shadow |
| Animation | `hover-lift` | Hover lift |

## 🎨 Design Principles

1. **Consistency**: Use unified design variables to ensure visual consistency
2. **Maintainability**: Centralized style management for easy modification and maintenance
3. **Reusability**: Reduce code duplication through mixins and utility classes
4. **Responsive**: Use responsive mixins to ensure multi-device adaptation
5. **Extensibility**: Modular structure facilitates adding new features

## 📚 Related Documentation

- [SCSS Migration Guide](./SCSS_MIGRATION_GUIDE.md) - Detailed migration steps and examples
- [Bootstrap Documentation](https://getbootstrap.com/) - Bootstrap 5 official documentation
- [SCSS Documentation](https://sass-lang.com/) - SCSS official documentation

## ⚠️ Important Notes

1. **Backward Compatible**: All existing CSS files are retained to ensure backward compatibility
2. **Gradual Migration**: No need to migrate all files at once, can be done gradually
3. **Testing**: Be sure to test visual consistency after migration
4. **Naming Convention**: SCSS partial files start with underscore (e.g., `_variables.scss`)
5. **Import Order**: variables → mixins → utilities → components

## 🚀 Getting Started

1. Styles are automatically loaded in `main.tsx`
2. Use utility classes directly in new components or import SCSS
3. Refer to migration guide when migrating existing components
4. Maintain consistent use of design variables

## 💡 Best Practices

1. **Prioritize Utility Classes**: Use utility classes instead of custom styles when possible
2. **Use Design Variables**: Avoid hard-coding colors and sizes
3. **Leverage Mixins**: Encapsulate repetitive style patterns into mixins
4. **Moderate Nesting**: Avoid excessive nesting (recommended max 3 levels)
5. **Semantic Naming**: Use meaningful class names

---

**Created**: 2025-12-30  
**Maintained by**: Development Team  
**Version**: 1.0.0
