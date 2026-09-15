import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_slidable/flutter_slidable.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ore_core/ore_core.dart';
import '../core/ui/customer_image.dart';

import '../core/ui/toast_x.dart';

import '../data/catalog/customer_catalog_repository.dart';
import '../providers/customer_catalog_provider.dart';

/// Full-screen search with recent chips, category filter, and live results
/// from the live catalog service (vendors + products).
class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});
  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _c = TextEditingController();
  final _focus = FocusNode();
  ServiceType? _filter;
  List<String> _recent = const <String>[];

  @override
  void initState() {
    super.initState();
    _c.addListener(() => setState(() {}));
    _loadRecents();
    Future.delayed(const Duration(milliseconds: 200), () => _focus.requestFocus());
  }

  Future<void> _loadRecents() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getStringList('search_recents');
      if (saved != null && saved.isNotEmpty) setState(() => _recent = saved);
    } catch (_) {}
  }

  Future<void> _saveRecent(String term) async {
    if (term.trim().isEmpty) return;
    setState(() {
      _recent.remove(term);
      _recent.insert(0, term);
      if (_recent.length > 8) _recent.removeLast();
    });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setStringList('search_recents', _recent);
    } catch (_) {}
  }

  @override
  void dispose() {
    _c.dispose();
    _focus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _c.text.trim();
    final resultsAsync = ref.watch(customerSearchProvider(query));
    final results = resultsAsync.value ?? const <CustomerSearchResult>[];
    final filteredResults = _filter == null ? results : results.where((result) => result.serviceType == _filter).toList(growable: false);
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 20, 4),
            child: Row(children: [
              IconButton(tooltip: 'Action', 
                icon: const Icon(Icons.arrow_back_ios_new_rounded),
                onPressed: () => context.pop(),
              ),
              Expanded(
                child: Container(
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4))],
                  ),
                  child: Row(children: [
                    const Icon(Icons.search_rounded, color: AppColors.textMuted, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _c,
                        focusNode: _focus,
                        autofocus: true,
                        keyboardType: TextInputType.text,
                        textInputAction: TextInputAction.search,
                        enableInteractiveSelection: true,
                        decoration: InputDecoration(
                          hintText: 'Search food, groceries, vendors...',
                          border: InputBorder.none,
                          hintStyle: AppTypography.body(AppColors.textMuted),
                        ),
                      ),
                    ),
                    if (_c.text.isNotEmpty)
                      AnimatedPress(
                        onTap: () { _c.clear(); _focus.requestFocus(); },
                        child: const Icon(Icons.cancel_outlined, color: AppColors.textMuted, size: 18),
                      ),
                    const SizedBox(width: 8),
                    AnimatedPress(
                      onTap: () {
                        HapticFeedback.selectionClick();
                        context.showToast('Voice search is not connected in this build.', type: ToastType.info);
                      },
                      child: const Icon(Icons.mic_none_rounded, color: AppColors.primary, size: 20),
                    ),
                  ]),
                ),
              ),
            ]),
          ),
          // Filter chips
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              children: [
                _filterChip(null, 'All', Icons.search_rounded),
                _filterChip(ServiceType.food, 'Food', Icons.restaurant_rounded),
                _filterChip(ServiceType.groceries, 'Groceries', Icons.shopping_basket_outlined),
                _filterChip(ServiceType.pharmacy, 'Pharmacy', Icons.medication_rounded),
                _filterChip(ServiceType.shop, 'Shops', Icons.shopping_bag_outlined),
                _filterChip(ServiceType.market, 'Market', Icons.storefront_rounded),
                _filterChip(ServiceType.laundry, 'Laundry', Icons.checkroom_rounded),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _c.text.isEmpty
                ? _recentsView()
                : resultsAsync.isLoading
                    ? const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))
                    : resultsAsync.hasError
                        ? _searchError(resultsAsync.error)
                        : _resultsView(filteredResults),
          ),
        ]),
      ),
    );
  }

  Widget _filterChip(ServiceType? t, String label, IconData icon) {
    final sel = _filter == t;
    final c = t?.color ?? AppColors.primary;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: OreChip(
        label: label,
        icon: icon,
        selected: sel,
        color: c,
        onTap: () {
          Haptics.light();
          setState(() => _filter = sel ? null : t);
        },
      ),
    );
  }

  Widget _recentsView() {
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(children: [
          Text('Recent searches', style: AppTypography.h3()),
          const Spacer(),
          if (_recent.isNotEmpty)
            TextButton(
              onPressed: () => setState(() => _recent.clear()),
              child: Text('Clear', style: AppTypography.bodySm(AppColors.textMuted)),
            ),
        ]),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (var i = 0; i < _recent.length; i++)
              _recentChip(_recent[i], i),
          ],
        ),
        const SizedBox(height: 32),
        Text('Trending', style: AppTypography.h3()),
        const SizedBox(height: 12),
        for (var i = 0; i < ['Jollof Rice', 'Waakye', 'Banku', 'Chicken', 'Pizza', 'Burger'].length; i++)
          _trendingRow(['Jollof Rice', 'Waakye', 'Banku', 'Chicken', 'Pizza', 'Burger'][i], i),
      ],
    );
  }

  Widget _recentChip(String term, int i) {
    return AnimatedPress(
      onTap: () {
        _c.text = term;
        _c.selection = TextSelection.collapsed(offset: term.length);
        _saveRecent(term);
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.history_rounded, color: AppColors.textMuted, size: 15),
          const SizedBox(width: 6),
          Text(term, style: AppTypography.body().copyWith(fontWeight: FontWeight.w600)),
        ]),
      ),
    )
        .animate(delay: Duration(milliseconds: 40 * i))
        .fadeIn(duration: 300.ms)
        .scale(begin: const Offset(0.85, 0.85), curve: Curves.easeOutBack);
  }

  Widget _trendingRow(String label, int i) => AnimatedPress(
    onTap: () {
      HapticFeedback.selectionClick();
      _c.text = label;
      _saveRecent(label);
    },
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(children: [
        const Icon(Icons.trending_up_rounded, color: AppColors.primary, size: 18),
        const SizedBox(width: 12),
        Expanded(child: Text(label, style: AppTypography.bodyLg())),
        const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
      ]),
    ),
  ).animate(delay: Duration(milliseconds: 40 * i)).fadeIn().slideX(begin: 0.08);

  Widget _searchError(Object? error) => OreEmptyState(
        icon: Icons.wifi_off_rounded,
        title: 'Search unavailable',
        subtitle: error?.toString() ?? 'Check your connection and try again.',
        ctaLabel: 'Retry',
        onCta: () => ref.invalidate(customerSearchProvider(_c.text.trim())),
      );

  Widget _resultsView(List<CustomerSearchResult> results) {
    if (results.isEmpty) {
      return OreEmptyState(
        icon: Icons.search_off_rounded,
        title: 'No results',
        subtitle: 'Try a different search term or category',
        ctaLabel: 'Clear search',
        onCta: () => _c.clear(),
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
      itemCount: results.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (c, i) {
        final tile = _productTile(results[i]);
        return tile.animate(delay: Duration(milliseconds: 35 * i)).fadeIn(duration: 300.ms).slideY(begin: 0.1);
      },
    );
  }

  Widget _vendorTile(OreVendor v) {
    return AnimatedPress(
      onTap: () {
        _saveRecent(_c.text);
        context.push('/vendor/${v.id}');
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ]),
        child: Row(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CustomerImage(v.coverUrl ?? '', width: 64, height: 64, fit: BoxFit.cover, errorBuilder: (_,__,___) =>
              Container(width: 64, height: 64, color: v.serviceType.color.withOpacity(0.2), child: Icon(v.serviceType.icon, color: v.serviceType.color)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(v.name, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Text(v.category, style: AppTypography.bodySm()),
            const SizedBox(height: 4),
            Row(children: [
              Icon(Icons.star_rounded, size: 12, color: AppColors.accent),
              const SizedBox(width: 3),
              Text(v.rating.toStringAsFixed(1), style: AppTypography.caption(AppColors.textPrimary).copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(width: 8),
              Icon(Icons.schedule_rounded, size: 12, color: AppColors.textMuted),
              const SizedBox(width: 3),
              Text(v.etaLabel, style: AppTypography.caption()),
            ]),
          ])),
          Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
        ]),
      ),
    );
  }

  Widget _productTile(CustomerSearchResult result) {
    final p = result.product;
    return AnimatedPress(
      onTap: () {
        _saveRecent(_c.text);
        if (p.vendorId.isNotEmpty) context.push('/product/${p.vendorId}/${p.id}');
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 4)),
        ]),
        child: Row(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: CustomerImage(p.imageUrl ?? '', width: 64, height: 64, fit: BoxFit.cover, errorBuilder: (_,__,___) =>
              Container(width: 64, height: 64, color: AppColors.background, child: const Icon(Icons.restaurant_rounded, color: AppColors.textMuted)),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(p.name, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
            if (result.vendorName.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(result.vendorName, style: AppTypography.bodySm()),
            ],
            const SizedBox(height: 4),
            Text(Formatters.money(p.price), style: AppTypography.bodyLg(AppColors.primary).copyWith(fontWeight: FontWeight.w800)),
          ])),
          Icon(Icons.chevron_right_rounded, color: AppColors.textMuted, size: 18),
        ]),
      ),
    );
  }
}
