# Performance Guide — Ore Customer App

Performance targets (test on a Moto G Power / iPhone SE 3rd-gen, **profile** mode):

| Metric | Target |
|---|---|
| Time-to-first-frame (cold start) | < 2.5s |
| 95th-percentile frame build/raster time | < 16ms (60fps) — no red frames |
| Scroll jank on vendor list | zero shader-compilation jank after first scroll |
| Peak memory on vendor list scroll | < 180MB (after 60s soak) |
| APK size (armeabi-v7a) | < 35MB |
| App size (iOS universal) | < 60MB |

## What is already done

### Images
- All network images go through `CustomerImage`, which sets `cacheWidth` /
  `cacheHeight` at 2.5× the logical display size and uses
  `filterQuality: FilterQuality.medium`. A 4000×3000 JPEG fed into a
  60×60 avatar used to decode to ~48MB of GPU memory; now it decodes to
  ~150×150 pixels (~90KB) — a 500× reduction.

### Lists
- All long lists use `ListView.builder` / `SliverList` with
  `SliverChildBuilderDelegate`, which only builds visible children.
- `BouncingScrollPhysics` for native-feeling scroll without over-shading
  overhead.
- Home tab bar uses `IndexedStack`, not `PageView` — switching tabs does not
  re-run build() on hidden tabs.

### Widget rebuild discipline
- Riverpod `ref.watch(...)` scoped to individual leaf widgets (e.g. totals
  subtotal, cart badge), so a price change doesn't rebuild the entire
  scaffold.
- Heavy animations (`_riderPulse`, `_mapCtrl`) have their own
  `AnimationController`s and only rebuild the marker they touch via
  `AnimatedBuilder`.
- Static widgets (`const Text(...)`, `const Icon(...)`) aggressively used.
- No `Opacity` widgets wrapping large subtrees. `Container(color: ...)`
  uses alpha-blended paint which is cheaper than the `Opacity` layer.
- No `shrinkWrap: true` on lists that have unbounded parents — those force
  full layout at build time.

### Animations
- All `.animate()` entries use `Curves.easeOutBack / easeOutExpo / Motion.standard`,
  duration ≤ 400ms for micro-interactions.
- Page transitions use `FadeUpwardsPageTransitionsBuilder` + a Cupertino
  slide variant that only animates opacity + 5% translate (cheap layer).

### Network
- Dio connects with 10s timeouts; retries at the provider level, not at the
  request layer, to avoid build-up of in-flight requests.
- Socket.IO connection uses `wss://` only in production; the HTTP fallback
  polls every 10s and gets cancelled in `dispose()`.
- Order confirmation cancels its polling timer on dispose.
- Tracking screen properly disposes `_socket`, `_locationSub`,
  `_socketStateSub`, `_pollTimer`, and both `AnimationController`s.

### Platform
- R8 minify + shrinkResources enabled for Android release builds.
- `--obfuscate --split-debug-info` in release build command (see FLAVORS.md).
- Hardware acceleration explicitly enabled on the Android Activity.

## Worked examples of patterns we follow

```dart
// BAD — decodes full 4000×3000 image for an 80×80 thumbnail
Image.network(url);

// GOOD — decode at display size (2.5× for retina)
Image.network(url, cacheWidth: 200, cacheHeight: 200, filterQuality: FilterQuality.medium);
```

```dart
// BAD — builds all 1000 vendor cards upfront
ListView(children: vendors.map((v) => VendorCard(v)).toList());

// GOOD — builds only visible cards
ListView.builder(itemCount: vendors.length, itemBuilder: (_, i) => VendorCard(vendors[i]));
```

```dart
// BAD — animates opacity on a large subtree (creates an offscreen layer)
Opacity(opacity: _t, child: HugeChild());

// GOOD — animate color/alpha directly at paint time (no layer)
Container(color: AppColors.primary.withOpacity(_t.value), child: HugeChild());
```

## Profiling checklist before every release

1. Connect a real low-end Android device (Moto G Power, Redmi A-series).
2. `flutter run --profile --cache-sksl --dart-define=API_BASE_URL=...`.
3. Hot-restart once, then scroll the vendor list end-to-end twice to warm
   shaders. Press `M` in the console to write `flutter_01.sksl.json` and
   commit it to `assets/shaders/` on the release branch so first-run jank
   on production builds goes away.
4. Open DevTools → Performance: record 10s of vendor-scroll + tracking-map.
   Any red frame > 16ms needs investigation.
5. Open DevTools → Memory: take snapshots before/after scrolling. If the
   heap grows unbounded you have a controller/stream leak.
6. DevTools → Network: verify no requests loop infinitely; confirm images
   return HTTP 304 (cache hit) on second view.

## Known future perf wins (post-launch)

- Use `ListView.builder` with `itemExtent` for the vendor list once card
  heights are fully fixed (enables deterministic layout).
- Replace the Socket.IO `polling` transport (long-polling fallback) with
  pure websocket only after the backend stabilises (saves one long-poll
  socket per client).
- Deferred/isolated JSON parsing for the order-history payload if the list
  grows beyond ~200 orders (use `Isolate.run(() => parseOrders(raw))`).
- Add `RepaintBoundary` around the flutter_map widget if tracking-screen
  raster times show it repainting on every rider pulse.
- For WebP assets from the backend, negotiate `Accept: image/webp` (we
  already serve vendor thumbnails through the media service at 3 widths).
