import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:ore_core/ore_core.dart';

import '../../data/auth/rider_api_client_provider.dart';
import '../../data/dispatch/rider_block_repository.dart';

class RiderScheduleScreen extends ConsumerWidget {
  const RiderScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final blocks = ref.watch(riderBlocksProvider);
    return Scaffold(
      appBar: AppBar(
        title: Text('Schedule', style: AppTypography.h2()),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => ref.invalidate(riderBlocksProvider),
            icon: const Icon(LucideIcons.refreshCw),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openCreate(context, ref),
        icon: const Icon(LucideIcons.plus),
        label: const Text('Add dash'),
      ),
      body: blocks.when(
        loading: () => const Center(child: CircularProgressIndicator(semanticsLabel: 'Loading')),
        error: (_, __) => Center(
          child: OreButton(
            label: 'Retry',
            onPressed: () => ref.invalidate(riderBlocksProvider),
          ),
        ),
        data: (rows) => _ScheduleList(rows: rows),
      ),
    );
  }

  Future<void> _openCreate(BuildContext context, WidgetRef ref) async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => const _CreateBlockSheet(),
    );
    if (created == true) ref.invalidate(riderBlocksProvider);
  }
}

class _ScheduleList extends ConsumerWidget {
  const _ScheduleList({required this.rows});

  final List<RiderBlock> rows;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (rows.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 40),
          const Icon(LucideIcons.calendar, size: 40, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text('No scheduled dashes', style: AppTypography.h3(), textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(
            'You can still go online anytime. A scheduled dash just books a start and end so your session ends when you planned.',
            style: AppTypography.body(),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
      itemCount: rows.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) => _BlockTile(block: rows[index]),
    );
  }
}

class _BlockTile extends ConsumerWidget {
  const _BlockTile({required this.block});

  final RiderBlock block;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final local = MaterialLocalizations.of(context);
    final start = block.startsAt.toLocal();
    final end = block.endsAt.toLocal();
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8)],
      ),
      child: Row(children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: (block.isActive ? AppColors.success : AppColors.primary).withOpacity(0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(LucideIcons.calendar, color: block.isActive ? AppColors.success : AppColors.primary),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(
              '${local.formatMediumDate(start)} · ${local.formatTimeOfDay(TimeOfDay.fromDateTime(start))} – ${local.formatTimeOfDay(TimeOfDay.fromDateTime(end))}',
              style: AppTypography.body().copyWith(fontWeight: FontWeight.w700),
            ),
            Text(block.status, style: AppTypography.caption()),
          ]),
        ),
        if (block.canCancel)
          IconButton(
            tooltip: 'Cancel dash',
            onPressed: () => _cancel(context, ref),
            icon: const Icon(LucideIcons.x, color: AppColors.danger),
          ),
      ]),
    );
  }

  Future<void> _cancel(BuildContext context, WidgetRef ref) async {
    try {
      await ref.read(riderBlockRepositoryProvider).cancel(block.id);
      ref.invalidate(riderBlocksProvider);
    } on DioException catch (error) {
      if (!context.mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map ? (body['error'] as Map)['message']?.toString() : null;
      OreToast.show(context, message: message ?? 'Unable to cancel this dash.', type: ToastType.error);
    } catch (_) {
      if (context.mounted) OreToast.show(context, message: 'Unable to cancel this dash.', type: ToastType.error);
    }
  }
}

class _CreateBlockSheet extends ConsumerStatefulWidget {
  const _CreateBlockSheet();

  @override
  ConsumerState<_CreateBlockSheet> createState() => _CreateBlockSheetState();
}

class _CreateBlockSheetState extends ConsumerState<_CreateBlockSheet> {
  late DateTime _day;
  TimeOfDay _start = const TimeOfDay(hour: 14, minute: 0);
  TimeOfDay _end = const TimeOfDay(hour: 18, minute: 0);
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _day = DateTime(now.year, now.month, now.day);
    final snapped = _snap(TimeOfDay.fromDateTime(now.add(const Duration(minutes: 30))));
    _start = snapped;
    _end = TimeOfDay(hour: (snapped.hour + 4) % 24, minute: snapped.minute);
  }

  TimeOfDay _snap(TimeOfDay time) {
    final minute = time.minute < 15 ? 0 : time.minute < 45 ? 30 : 0;
    final hour = time.minute >= 45 ? (time.hour + 1) % 24 : time.hour;
    return TimeOfDay(hour: hour, minute: minute);
  }

  DateTime _combine(TimeOfDay time) => DateTime(_day.year, _day.month, _day.day, time.hour, time.minute);

  Future<void> _pickTime({required bool start}) async {
    final picked = await showTimePicker(context: context, initialTime: start ? _start : _end);
    if (picked == null) return;
    setState(() {
      if (start) {
        _start = _snap(picked);
      } else {
        _end = _snap(picked);
      }
    });
  }

  Future<void> _save() async {
    final startsAt = _combine(_start);
    var endsAt = _combine(_end);
    if (!endsAt.isAfter(startsAt)) endsAt = endsAt.add(const Duration(days: 1));
    setState(() => _saving = true);
    try {
      await ref.read(riderBlockRepositoryProvider).create(startsAt: startsAt, endsAt: endsAt);
      if (mounted) Navigator.pop(context, true);
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = body is Map && body['error'] is Map ? (body['error'] as Map)['message']?.toString() : null;
      OreToast.show(context, message: message ?? 'Unable to schedule this dash.', type: ToastType.error);
      setState(() => _saving = false);
    } catch (_) {
      if (!mounted) return;
      OreToast.show(context, message: 'Unable to schedule this dash.', type: ToastType.error);
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final days = List<DateTime>.generate(7, (index) {
      final now = DateTime.now();
      return DateTime(now.year, now.month, now.day).add(Duration(days: index));
    });
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Schedule a dash', style: AppTypography.h2()),
        const SizedBox(height: 6),
        Text('Books a start and end. It does not guarantee orders. You can still go online without one.', style: AppTypography.bodySm()),
        const SizedBox(height: 14),
        SizedBox(
          height: 40,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: days.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final day = days[index];
              final selected = day.year == _day.year && day.month == _day.month && day.day == _day.day;
              return ChoiceChip(
                label: Text(MaterialLocalizations.of(context).formatMediumDate(day)),
                selected: selected,
                onSelected: (_) => setState(() => _day = day),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => _pickTime(start: true),
              child: Text('Start ${_start.format(context)}'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: OutlinedButton(
              onPressed: () => _pickTime(start: false),
              child: Text('End ${_end.format(context)}'),
            ),
          ),
        ]),
        const SizedBox(height: 16),
        OreButton(
          label: 'Save dash',
          isLoading: _saving,
          onPressed: _saving ? null : _save,
        ),
      ]),
    );
  }
}
