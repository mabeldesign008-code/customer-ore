import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../providers/vendor_data_provider.dart';
import '../../widgets/common/primary_button.dart';

class OperatingHoursScreen extends ConsumerStatefulWidget {
  const OperatingHoursScreen({super.key});

  @override
  ConsumerState<OperatingHoursScreen> createState() => _OperatingHoursScreenState();
}

class _OperatingHoursScreenState extends ConsumerState<OperatingHoursScreen> {
  final _days = const <String>['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  final _labels = const <String, String>{'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday'};
  Map<String, List<Map<String, String>>> _schedule = <String, List<Map<String, String>>>{};
  Map<String, Map<String, dynamic>> _holidays = <String, Map<String, dynamic>>{};
  bool _initialized = false;
  bool _saving = false;

  void _initialize(Map<String, List<Map<String, String>>> hours, Map<String, Map<String, dynamic>> holidays) {
    if (_initialized) return;
    _initialized = true;
    _holidays = {for (final entry in holidays.entries) entry.key: Map<String, dynamic>.from(entry.value)};
    _schedule = {
      for (final day in _days)
        day: hours[day]?.map((slot) => <String, String>{'open': slot['open'] ?? '09:00', 'close': slot['close'] ?? '17:00'}).toList() ?? <Map<String, String>>[],
    };
  }

  Future<void> _save(String vendorId) async {
    setState(() => _saving = true);
    try {
      await ref.read(vendorCatalogRepositoryProvider).updateVendor(vendorId, <String, dynamic>{'hoursJson': _schedule, 'holidayHoursJson': _holidays});
      ref.invalidate(vendorSnapshotProvider);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Operating hours updated')));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update operating hours')));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(vendorSnapshotProvider);
    return snapshot.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(appBar: AppBar(title: const Text('Operating hours')), body: Center(child: PrimaryButton(label: 'Retry', onPressed: () => ref.invalidate(vendorSnapshotProvider)))),
      data: (value) {
        _initialize(value.vendor.hoursJson, value.vendor.holidayHoursJson);
        return Scaffold(
          backgroundColor: AppColors.background,
          appBar: AppBar(title: Text('Operating hours', style: AppTextStyles.heading3)),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Weekly schedule', style: AppTextStyles.heading2),
              const SizedBox(height: 8),
              Text('These hours are stored on the Catalog Vendor profile and determine openNow status.', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
              const SizedBox(height: 16),
              ..._days.map((day) => _dayCard(day)),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(child: Text('Special / holiday hours', style: AppTextStyles.heading2)),
                IconButton(tooltip: 'Action', onPressed: _addHoliday, icon: const Icon(LucideIcons.plusCircle, color: AppColors.primary)),
              ]),
              Text('Override the weekly schedule for a specific Ghana date.', style: AppTextStyles.bodyMedium.copyWith(color: AppColors.textSecondary)),
              const SizedBox(height: 8),
              ..._holidays.entries.map((entry) => ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(entry.key),
                subtitle: Text(entry.value['closed'] == true ? 'Closed' : '${entry.value['open'] ?? '09:00'} – ${entry.value['close'] ?? '17:00'}'),
                trailing: IconButton(tooltip: 'Action', onPressed: () => setState(() => _holidays.remove(entry.key)), icon: const Icon(LucideIcons.trash2, color: AppColors.error)),
              )),
              const SizedBox(height: 16),
              PrimaryButton(label: 'Save hours', loading: _saving, onPressed: _saving ? null : () => _save(value.vendor.id), icon: const Icon(LucideIcons.check, color: Colors.white)),
            ],
          ),
        );
      },
    );
  }

  Future<void> _addHoliday() async {
    final date = await showDatePicker(context: context, firstDate: DateTime.now(), lastDate: DateTime.now().add(const Duration(days: 730)), initialDate: DateTime.now());
    if (date == null || !mounted) return;
    final key = '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
    var closed = true;
    final open = TextEditingController(text: '09:00');
    final close = TextEditingController(text: '17:00');
    final save = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(builder: (dialogContext, setDialogState) => AlertDialog(
        title: Text('Hours for $key'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          SwitchListTile(value: closed, onChanged: (value) => setDialogState(() => closed = value), title: const Text('Closed all day'), contentPadding: EdgeInsets.zero),
          if (!closed) Row(children: [Expanded(child: TextField(controller: open, decoration: const InputDecoration(labelText: 'Open'))), const SizedBox(width: 8), Expanded(child: TextField(controller: close, decoration: const InputDecoration(labelText: 'Close')))]),
        ]),
        actions: [TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')), ElevatedButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Save'))],
      )),
    );
    if (save == true) setState(() => _holidays[key] = closed ? <String, dynamic>{'closed': true} : <String, dynamic>{'closed': false, 'open': open.text, 'close': close.text});
    open.dispose();
    close.dispose();
  }

  Widget _dayCard(String day) {
    final slots = _schedule[day] ?? <Map<String, String>>[];
    final open = slots.isNotEmpty;
    final slot = open ? slots.first : <String, String>{'open': '09:00', 'close': '17:00'};
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border)),
      child: Column(children: [
        Row(children: [
          Expanded(child: Text(_labels[day] ?? day, style: AppTextStyles.subtitleMedium)),
          Switch(value: open, onChanged: (value) => setState(() => _schedule[day] = value ? [slot] : <Map<String, String>>[])),
        ]),
        if (open)
          Row(children: [
            Expanded(child: TextFormField(initialValue: slot['open'], decoration: const InputDecoration(labelText: 'Open'), onChanged: (value) => slot['open'] = value)),
            const SizedBox(width: 10),
            Expanded(child: TextFormField(initialValue: slot['close'], decoration: const InputDecoration(labelText: 'Close'), onChanged: (value) => slot['close'] = value)),
          ]),
      ]),
    );
  }
}
