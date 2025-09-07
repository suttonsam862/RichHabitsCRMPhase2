# 🚨 UNIVERSAL UI LAWS - MANDATORY COMPLIANCE 

## THE LAW: NO WHITE BACKGROUNDS, EVER!

**These laws are MANDATORY and CANNOT be overridden. Every page must comply.**

---

## ✅ CORRECT WAY - Use AppLayout Component

```tsx
// ✅ ALWAYS DO THIS
import { AppLayout } from '@/components/layouts';

export default function YourPage() {
  return (
    <AppLayout 
      title="Your Page Title" 
      subtitle="Your page description"
      showBackButton={true}
      backHref="/parent-route"
    >
      {/* Your page content */}
    </AppLayout>
  );
}
```

## ❌ NEVER DO THIS - Manual Background Classes

```tsx
// ❌ FORBIDDEN - Conditional light/dark themes
<div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">

// ❌ FORBIDDEN - White backgrounds anywhere
<div className="bg-white">

// ❌ FORBIDDEN - Light text colors
<p className="text-gray-900">
```

---

## 🔒 ENFORCED CSS RULES

The `ui-laws.css` file automatically prevents:
- Any `bg-white` classes become `bg-gray-800`
- Any `text-gray-900` becomes `text-white`
- Cards automatically get dark styling
- Inputs automatically get dark styling

---

## 📋 PRE-FLIGHT CHECKLIST

Before creating ANY new page:

1. ✅ Use `AppLayout` component
2. ✅ Verify background is dark gradient
3. ✅ Check all text is readable (white/gray)
4. ✅ Test all interactive elements
5. ✅ Ensure no white anywhere

---

## 🚫 VIOLATIONS WILL BE REJECTED

Pages that don't follow these laws will cause:
- Visual inconsistency
- Poor user experience  
- Development delays
- Code review failures

---

## 💡 QUICK FIXES

If you find a white background:

1. **Replace this:**
   ```tsx
   <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
   ```

2. **With this:**
   ```tsx
   import { AppLayout } from '@/components/layouts';
   
   <AppLayout title="Page Title">
     {/* content */}
   </AppLayout>
   ```

---

## 🎯 THE GOAL

**One theme, one look, zero exceptions. Dark gradient backgrounds everywhere.**

These laws exist to prevent the endless cycle of fixing white backgrounds on every new page. Follow them religiously.