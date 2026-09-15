import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:ore_core/ore_core.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../data/location/customer_location_repository.dart';
import '../providers/customer_location_provider.dart';
import '../providers/customer_address_provider.dart';

// ── Recent picks ──────────────────────────────────────────────────────────────

const _kRecentKey = 'customer_recent_locations_v2';
const _kMaxRecent = 5;

Future<List<OreAddress>> _loadRecentFromStorage() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList(_kRecentKey) ?? [];
    return raw
        .map((s) {
          final parts = s.split('|');
          if (parts.length < 4) return null;
          return OreAddress(
            label: parts[0],
            street: parts[1],
            lat: double.tryParse(parts[2]),
            lng: double.tryParse(parts[3]),
          );
        })
        .whereType<OreAddress>()
        .toList();
  } catch (_) {
    return [];
  }
}

Future<void> _saveRecent(OreAddress address) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final entry =
        '${address.label}|${address.street ?? ''}|${address.lat ?? ''}|${address.lng ?? ''}';
    final existing = prefs.getStringList(_kRecentKey) ?? [];
    final deduped = [
      entry,
      ...existing.where((e) => !e.startsWith('${address.label}|')),
    ];
    await prefs.setStringList(_kRecentKey, deduped.take(_kMaxRecent).toList());
  } catch (_) {}
}

// ── Main widget ───────────────────────────────────────────────────────────────

class CustomerAddressPicker extends ConsumerStatefulWidget {
  const CustomerAddressPicker({
    super.key,
    required this.title,
    this.initialPoint,
    this.initialLabel,
  });

  final String title;
  final Object? initialPoint;
  final String? initialLabel;

  @override
  ConsumerState<CustomerAddressPicker> createState() =>
      _CustomerAddressPickerState();
}

class _CustomerAddressPickerState extends ConsumerState<CustomerAddressPicker> {
  final _searchController = SearchController();
  String? _sessionToken;
  late final _Debounceable<List<PlaceSuggestion>?, String> _debouncedSearch;

  // State
  List<OreAddress> _recent = [];
  bool _gpsFetching = false;
  bool _showAdvanced = false;

  // Advanced inputs
  final _ghanaController = TextEditingController();
  final _w3wController = TextEditingController();
  bool _altResolving = false;
  String? _altError;

  @override
  void initState() {
    super.initState();
    _sessionToken = DateTime.now().millisecondsSinceEpoch.toString();
    _debouncedSearch = _debounce<List<PlaceSuggestion>?, String>(
      _fetchSuggestions,
    );
    _loadRecent();
  }

  Future<void> _loadRecent() async {
    final recent = await _loadRecentFromStorage();
    if (mounted) setState(() => _recent = recent);
  }

  Future<List<PlaceSuggestion>> _fetchSuggestions(String query) async {
    if (query.trim().length < 2) return [];

    try {
      final repo = ref.read(customerLocationRepositoryProvider);
      final results = await repo.searchPlaces(
        query.trim(),
        sessionToken: _sessionToken,
      );
      return results;
    } catch (e) {
      return [];
    }
  }

  Future<void> _pickSuggestion(PlaceSuggestion s) async {
    try {
      final repo = ref.read(customerLocationRepositoryProvider);
      final address = await repo.resolvePlaceId(
        s.placeId,
        s.mainText,
        sessionToken: _sessionToken,
      );
      _sessionToken = DateTime.now().millisecondsSinceEpoch.toString();
      await _saveRecent(address);
      if (mounted) Navigator.pop(context, address);
    } catch (e) {
      if (mounted) {
        OreToast.show(
          context,
          message: 'Could not resolve location. Try again.',
          type: ToastType.error,
        );
      }
    }
  }

  Future<void> _pickSavedAddress(OreAddress address) async {
    await _saveRecent(address);
    if (mounted) Navigator.pop(context, address);
  }

  Future<void> _useCurrentLocation() async {
    setState(() => _gpsFetching = true);
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        if (mounted) {
          OreToast.show(
            context,
            message: 'Location permission denied',
            type: ToastType.warning,
          );
        }
        return;
      }
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
      final address = OreAddress(
        label: 'Current location',
        street:
            '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}',
        lat: pos.latitude,
        lng: pos.longitude,
      );
      await _saveRecent(address);
      if (mounted) Navigator.pop(context, address);
    } catch (e) {
      if (mounted) {
        OreToast.show(
          context,
          message: 'Could not get current location. Try again.',
          type: ToastType.error,
        );
      }
    } finally {
      if (mounted) setState(() => _gpsFetching = false);
    }
  }

  Future<void> _resolveGhanaGps() async {
    final text = _ghanaController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _altResolving = true;
      _altError = null;
    });
    try {
      final repo = ref.read(customerLocationRepositoryProvider);
      final address = await repo.resolveGhanaGps(text);
      await _saveRecent(address);
      if (mounted) Navigator.pop(context, address);
    } catch (_) {
      if (mounted) {
        setState(
          () => _altError =
              'Could not find Ghana GPS code "$text". Check format e.g. GA-183-9324',
        );
      }
    } finally {
      if (mounted) setState(() => _altResolving = false);
    }
  }

  Future<void> _resolveWhat3Words() async {
    final text = _w3wController.text.trim().replaceAll(RegExp(r'^/+'), '');
    if (text.isEmpty) return;
    setState(() {
      _altResolving = true;
      _altError = null;
    });
    try {
      final repo = ref.read(customerLocationRepositoryProvider);
      final address = await repo.resolveWhat3Words(text);
      await _saveRecent(address);
      if (mounted) Navigator.pop(context, address);
    } catch (_) {
      if (mounted) {
        setState(
          () => _altError =
              'Could not resolve "///$text". Check spelling — three words separated by dots.',
        );
      }
    } finally {
      if (mounted) setState(() => _altResolving = false);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _ghanaController.dispose();
    _w3wController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final savedBook = ref.watch(customerAddressBookProvider);
    final savedAddresses = savedBook.addresses;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ── Drag handle ───────────────────────────────────────────────
          Container(
            margin: const EdgeInsets.only(top: 10, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // ── Header ────────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 12, 16),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    widget.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF111827),
                      height: 1.2,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close_rounded,
                      size: 18,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // ── Use current location (HERO CTA) ───────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _gpsFetching ? null : _useCurrentLocation,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shadowColor: AppColors.primary.withOpacity(0.3),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: _gpsFetching
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.my_location_rounded,
                              size: 18,
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Text(
                            'Use current location',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
              ),
            ).animate().fadeIn(duration: 200.ms).slideY(begin: -0.1),
          ),

          // ── Divider ───────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Expanded(
                  child: Divider(color: Colors.grey.shade200, thickness: 1),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    'OR SEARCH ADDRESS',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade500,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                Expanded(
                  child: Divider(color: Colors.grey.shade200, thickness: 1),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── Search bar with autocomplete ──────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            child: SearchAnchor(
              searchController: _searchController,
              isFullScreen: false,
              viewHintText: 'Search area, street, landmark...',
              viewConstraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.5,
              ),
              builder: (BuildContext context, SearchController controller) {
                return SearchBar(
                  controller: controller,
                  hintText: 'Search area, street, landmark...',
                  hintStyle: MaterialStateProperty.all(
                    const TextStyle(color: Color(0xFF9CA3AF), fontSize: 15),
                  ),
                  textStyle: MaterialStateProperty.all(
                    const TextStyle(fontSize: 15, color: Color(0xFF111827)),
                  ),
                  leading: const Padding(
                    padding: EdgeInsets.only(left: 8),
                    child: Icon(
                      Icons.search_rounded,
                      size: 20,
                      color: Color(0xFF9CA3AF),
                    ),
                  ),
                  trailing: [
                    if (_searchController.text.isNotEmpty)
                      IconButton(
                        icon: const Icon(
                          Icons.cancel_rounded,
                          size: 18,
                          color: Color(0xFF9CA3AF),
                        ),
                        onPressed: () {
                          controller.clear();
                        },
                      ),
                  ],
                  elevation: MaterialStateProperty.all(0),
                  backgroundColor: MaterialStateProperty.all(
                    const Color(0xFFF3F4F6),
                  ),
                  shape: MaterialStateProperty.all(
                    RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  padding: MaterialStateProperty.all(
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  onTap: () => controller.openView(),
                  onChanged: (_) {},
                );
              },
              suggestionsBuilder:
                  (BuildContext context, SearchController controller) async {
                    final query = controller.text.trim();

                    // If query is too short, show nothing
                    if (query.length < 2) {
                      return [];
                    }

                    // Debounced search call
                    final suggestions = await _debouncedSearch(query);

                    // Handle cancellation
                    if (suggestions == null) {
                      return [];
                    }

                    // No results
                    if (suggestions.isEmpty) {
                      return [
                        Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 20,
                            vertical: 32,
                          ),
                          child: Column(
                            children: [
                              Icon(
                                Icons.location_off_rounded,
                                size: 48,
                                color: Colors.grey.shade300,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No places found',
                                style: TextStyle(
                                  color: Colors.grey.shade700,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Try a different search term or use\ncurrent location',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  color: Colors.grey.shade500,
                                  fontSize: 14,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ];
                    }

                    // Return suggestion tiles
                    return suggestions.map((s) {
                      return Material(
                        color: Colors.white,
                        child: InkWell(
                          onTap: () {
                            controller.closeView(null);
                            _pickSuggestion(s);
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withValues(
                                      alpha: 0.1,
                                    ),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: const Icon(
                                    Icons.location_on_rounded,
                                    size: 18,
                                    color: AppColors.primary,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        s.mainText,
                                        style: const TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF111827),
                                        ),
                                      ),
                                      if (s.secondaryText.isNotEmpty)
                                        Text(
                                          s.secondaryText,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            color: Color(0xFF9CA3AF),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList();
                  },
            ),
          ),

          // ── Content (Saved & Recent) ──────────────────────────────────
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ── Saved addresses ───────────────────────────────────
                  if (savedAddresses.isNotEmpty) ...[
                    _SectionLabel('Saved addresses'),
                    const SizedBox(height: 8),
                    ...savedAddresses.map((saved) {
                      final isHome = saved.label.toLowerCase() == 'home';
                      final isWork = saved.label.toLowerCase() == 'work';
                      return _AddressTile(
                        icon: isHome
                            ? Icons.home_outlined
                            : isWork
                            ? Icons.work_outline_rounded
                            : Icons.bookmark_outline_rounded,
                        iconColor: AppColors.primary,
                        iconBg: AppColors.primary.withOpacity(0.1),
                        title: saved.label,
                        subtitle: saved.displayAddress,
                        onTap: () => _pickSavedAddress(saved.address),
                      );
                    }),
                    const SizedBox(height: 8),
                    _Divider(),
                    const SizedBox(height: 8),
                  ],

                  // ── Recent ────────────────────────────────────────────
                  if (_recent.isNotEmpty) ...[
                    _SectionLabel('Recent'),
                    const SizedBox(height: 8),
                    ..._recent.map((r) {
                      return _AddressTile(
                        icon: Icons.schedule_rounded,
                        iconColor: const Color(0xFF6B7280),
                        iconBg: Colors.grey.shade100,
                        title: r.label,
                        subtitle:
                            r.street?.isNotEmpty == true && r.street != r.label
                            ? r.street
                            : null,
                        onTap: () => _pickSavedAddress(r),
                      );
                    }),
                    const SizedBox(height: 8),
                    _Divider(),
                    const SizedBox(height: 8),
                  ],

                  // ── Advanced options ──────────────────────────────────
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: () => setState(() => _showAdvanced = !_showAdvanced),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _showAdvanced
                                ? Icons.expand_less_rounded
                                : Icons.expand_more_rounded,
                            size: 18,
                            color: const Color(0xFF6B7280),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            _showAdvanced
                                ? 'Hide advanced options'
                                : 'More ways to add location',
                            style: const TextStyle(
                              color: Color(0xFF6B7280),
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  if (_showAdvanced)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Ghana GPS
                          const _AdvancedLabel(
                            icon: '🇬🇭',
                            label: 'Ghana GPS',
                            hint: 'e.g. GA-183-9324',
                          ),
                          const SizedBox(height: 8),
                          _AdvancedInput(
                            controller: _ghanaController,
                            hint: 'Enter Ghana GPS code',
                            prefix: const Icon(
                              Icons.tag_rounded,
                              size: 16,
                              color: AppColors.primary,
                            ),
                            buttonLabel: 'Locate',
                            isLoading: _altResolving,
                            onSubmit: _resolveGhanaGps,
                          ),
                          const SizedBox(height: 16),

                          // what3words
                          const _AdvancedLabel(
                            icon: '///​',
                            label: 'what3words',
                            hint: 'e.g. filled.count.soap',
                          ),
                          const SizedBox(height: 8),
                          _AdvancedInput(
                            controller: _w3wController,
                            hint: 'word.word.word',
                            prefix: const Text(
                              '///',
                              style: TextStyle(
                                color: AppColors.primary,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            buttonLabel: 'Find',
                            isLoading: _altResolving,
                            onSubmit: _resolveWhat3Words,
                          ),

                          if (_altError != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 12),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: Colors.red.shade200,
                                  ),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(
                                      Icons.error_outline_rounded,
                                      size: 16,
                                      color: Colors.red,
                                    ),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        _altError!,
                                        style: TextStyle(
                                          color: Colors.red.shade700,
                                          fontSize: 13,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ).animate().fadeIn().slideY(begin: -0.1),
                        ],
                      ),
                    ).animate().fadeIn(duration: 200.ms).slideY(begin: -0.05),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Debounce helpers ──────────────────────────────────────────────────────────

typedef _Debounceable<S, T> = Future<S?> Function(T parameter);

/// Returns a debounced version of the given function.
/// The original function will be called only after no calls have been made
/// for the given Duration (400ms).
_Debounceable<S, T> _debounce<S, T>(_Debounceable<S?, T> function) {
  _DebounceTimer? debounceTimer;

  return (T parameter) async {
    if (debounceTimer != null && !debounceTimer!.isCompleted) {
      debounceTimer!.cancel();
    }
    debounceTimer = _DebounceTimer();
    try {
      await debounceTimer!.future;
    } catch (error) {
      // Debounce cancelled
      return null;
    }
    return function(parameter);
  };
}

/// A wrapper around Timer used for debouncing.
class _DebounceTimer {
  _DebounceTimer() {
    _timer = Timer(_duration, _onComplete);
  }

  late final Timer _timer;
  final Duration _duration = const Duration(milliseconds: 400);
  final Completer<void> _completer = Completer<void>();

  void _onComplete() {
    _completer.complete();
  }

  Future<void> get future => _completer.future;

  bool get isCompleted => _completer.isCompleted;

  void cancel() {
    _timer.cancel();
    _completer.completeError('Debounce cancelled');
  }
}

// ── Shared sub-widgets ────────────────────────────────────────────────────────

class _AddressTile extends StatelessWidget {
  const _AddressTile({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF111827),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 3),
                    Text(
                      subtitle!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF9CA3AF),
                        height: 1.3,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              size: 18,
              color: Color(0xFFD1D5DB),
            ),
          ],
        ),
      ),
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 20),
    child: Divider(height: 1, thickness: 1, color: Colors.grey.shade100),
  );
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
    child: Text(
      text.toUpperCase(),
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w700,
        color: Color(0xFF9CA3AF),
        letterSpacing: 1,
      ),
    ),
  );
}

class _AdvancedLabel extends StatelessWidget {
  const _AdvancedLabel({
    required this.icon,
    required this.label,
    required this.hint,
  });
  final String icon;
  final String label;
  final String hint;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(icon, style: const TextStyle(fontSize: 16)),
      const SizedBox(width: 8),
      Text(
        label,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: Color(0xFF374151),
        ),
      ),
      const SizedBox(width: 6),
      Text(
        hint,
        style: const TextStyle(fontSize: 12, color: Color(0xFF9CA3AF)),
      ),
    ],
  );
}

class _AdvancedInput extends StatelessWidget {
  const _AdvancedInput({
    required this.controller,
    required this.hint,
    required this.prefix,
    required this.buttonLabel,
    required this.isLoading,
    required this.onSubmit,
  });

  final TextEditingController controller;
  final String hint;
  final Widget prefix;
  final String buttonLabel;
  final bool isLoading;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF9FAFB),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Row(
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: prefix,
                ),
                Expanded(
                  child: TextField(
                    controller: controller,
                    onSubmitted: (_) => onSubmit(),
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF111827),
                    ),
                    decoration: InputDecoration(
                      hintText: hint,
                      hintStyle: const TextStyle(
                        color: Color(0xFF9CA3AF),
                        fontSize: 14,
                      ),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 10),
        SizedBox(
          height: 48,
          child: ElevatedButton(
            onPressed: isLoading ? null : onSubmit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              disabledBackgroundColor: Colors.grey.shade300,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 20),
            ),
            child: isLoading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Text(
                    buttonLabel,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                  ),
          ),
        ),
      ],
    );
  }
}
