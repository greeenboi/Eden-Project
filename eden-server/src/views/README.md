# Views Folder Structure

All HTML/JSX views have been moved to `src/views/` for better organization.

## Structure

```
src/
├── views/
│   ├── index.ts         # Barrel export for all views
│   ├── index.tsx        # Home page view
│   └── admin.tsx        # Admin UI view
```

## Routes

- **`/`** - API root (JSON response)
- **`/home`** - Home page with UI (IndexView)
- **`/admin`** - Admin panel (AdminView + client-side admin.ts)
- **`/scalar`** - API documentation
- **`/health`** - Health check endpoint

## Views

### IndexView (`src/views/index.tsx`)
Simple landing page with links to:
- API Documentation
- Admin Panel
- Health Check
- Available endpoints

### AdminView (`src/views/admin.tsx`)
Complete admin interface with:
- Create Artist form
- Upload Track workflow
- View Artists list
- Tab-based navigation

## Tab Switching Fix

**Issue:** Tabs weren't switching because inline styles `display: none` overrode CSS classes.

**Solution:**
1. Added CSS rules in `src/style.css`:
   ```css
   .tab-content {
     display: none;
   }
   .tab-content.active {
     display: block;
   }
   ```

2. Updated `src/admin.ts` to use CSS classes instead of inline styles:
   ```typescript
   // Before (didn't work):
   htmlContent.style.display = 'block'
   
   // After (works):
   content.classList.add('active')
   ```

3. Set initial active state on first tab-content in `admin.tsx`:
   ```tsx
   <div id="create-artist" class="tab-content active">
   ```

## Usage

Import views in your route handlers:

```tsx
import { AdminView, IndexView } from './views'

// Home page
app.get('/home', (c) => {
  return c.render(<IndexView />)
})

// Admin page
app.get('/admin', (c) => {
  return c.render(
    <>
      <AdminView />
      <script type="module" src="/src/admin.ts" />
    </>
  )
})
```

## Benefits

✅ **Separation of Concerns** - Views are separate from routing logic
✅ **Maintainability** - Easier to find and edit UI components
✅ **Reusability** - Views can be imported and used anywhere
✅ **Type Safety** - Full TypeScript support with JSX
✅ **Tab Switching Fixed** - CSS-based display toggle works properly
