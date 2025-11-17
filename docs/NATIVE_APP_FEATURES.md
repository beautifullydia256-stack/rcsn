# Native App Features Implementation Guide

This document outlines all the native app features implemented in PwezaCore to make it feel and work like a native application.

## ✅ Implemented Features

### 1. Progressive Web App (PWA)
- **Manifest**: `/public/manifest.json` - App metadata, icons, shortcuts
- **Service Worker**: `/public/sw.js` - Offline support, caching, background sync
- **Install Prompt**: Automatic prompt to install the app
- **App Icons**: Multiple sizes for different devices

### 2. Offline Support
- **Offline Page**: `/app/offline/page.tsx` - Custom offline fallback
- **Offline Indicator**: Shows connection status at top of screen
- **Service Worker Caching**: Network-first strategy with cache fallback
- **Background Sync**: Syncs data when connection is restored

### 3. Native-like UI Components

#### Toast Notifications
```tsx
import { useToast } from '@/src/components/Toast';

function MyComponent() {
  const toast = useToast();
  
  toast.success('Operation successful!');
  toast.error('Something went wrong');
  toast.warning('Please check your input');
  toast.info('New update available');
}
```

#### Native Modal
```tsx
import NativeModal from '@/src/components/NativeModal';

<NativeModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Modal Title"
  size="md" // sm, md, lg, full
>
  <p>Modal content here</p>
</NativeModal>
```

#### Bottom Sheet (Mobile)
```tsx
import BottomSheet from '@/src/components/BottomSheet';

<BottomSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Bottom Sheet"
>
  <p>Content here</p>
</BottomSheet>
```

#### Skeleton Loaders
```tsx
import { Skeleton, CardSkeleton, StatsCardSkeleton, TableSkeleton } from '@/src/components/SkeletonLoader';

<Skeleton variant="text" lines={3} />
<CardSkeleton />
<StatsCardSkeleton />
<TableSkeleton rows={5} />
```

### 4. Touch Optimizations

#### Pull to Refresh
```tsx
import { usePullToRefresh } from '@/src/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/src/components/PullToRefreshIndicator';

function MyPage() {
  const { isPulling, pullProgress } = usePullToRefresh({
    onRefresh: async () => {
      // Refresh data
      await refetch();
    },
    threshold: 80,
  });

  return (
    <>
      <PullToRefreshIndicator isPulling={isPulling} pullProgress={pullProgress} />
      {/* Your content */}
    </>
  );
}
```

#### Swipe Gestures
```tsx
import { useSwipe } from '@/src/hooks/useSwipe';

useSwipe({
  onSwipeLeft: () => router.push('/next'),
  onSwipeRight: () => router.back(),
  onSwipeUp: () => console.log('Swipe up'),
  onSwipeDown: () => console.log('Swipe down'),
  threshold: 50,
});
```

### 5. Platform Detection
```tsx
import { isIOS, isAndroid, isMobile, isTablet, isDesktop, isStandalone, hapticFeedback } from '@/src/utils/platform';

if (isIOS()) {
  // iOS specific code
}

if (isMobile()) {
  // Mobile specific code
}

// Haptic feedback
hapticFeedback(10); // Short vibration
hapticFeedback([100, 50, 100]); // Pattern
```

### 6. Page Transitions
```tsx
import PageTransition from '@/src/components/PageTransition';

export default function MyPage() {
  return (
    <PageTransition>
      {/* Your page content */}
    </PageTransition>
  );
}
```

## CSS Utilities

### Safe Area Insets
```tsx
<div className="pt-safe-top pb-safe-bottom">
  {/* Content with safe area padding */}
</div>
```

### Touch Targets
All buttons and interactive elements automatically have minimum 44x44px touch targets.

## Service Worker Features

- **Caching Strategy**: Network-first with cache fallback
- **Offline Support**: Serves cached content when offline
- **Background Sync**: Syncs data when connection is restored
- **Push Notifications**: Ready for push notification support
- **Update Detection**: Automatically detects and applies updates

## Installation

Users can install the app:
- **iOS**: Share button → "Add to Home Screen"
- **Android**: Chrome menu → "Install app" or automatic prompt
- **Desktop**: Browser address bar → Install icon

## Best Practices

1. **Always use Toast for notifications** instead of `alert()`
2. **Use Skeleton loaders** instead of spinners for better UX
3. **Implement pull-to-refresh** on list pages
4. **Use BottomSheet on mobile** instead of modals
5. **Add haptic feedback** for important actions
6. **Test offline functionality** regularly
7. **Use safe area insets** for notched devices

## Testing

1. **PWA Installation**: Test on iOS Safari and Android Chrome
2. **Offline Mode**: Disable network and test functionality
3. **Touch Gestures**: Test swipe and pull-to-refresh
4. **Safe Areas**: Test on devices with notches
5. **Performance**: Use Lighthouse to test PWA score

## Browser Support

- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS & macOS)
- ✅ Firefox (Desktop)
- ⚠️ Safari iOS (limited PWA support)
- ⚠️ Older browsers (graceful degradation)

