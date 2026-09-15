import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:share_plus/share_plus.dart';
import 'package:ore_core/ore_core.dart' hide AppColors;
import 'package:url_launcher/url_launcher.dart';

import '../../core/router/app_router.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';
import '../../data/order/vendor_order_repository.dart';
import '../../providers/auth/vendor_auth_provider.dart';
import '../../providers/vendor_data_provider.dart';
import '../../widgets/common/primary_button.dart';

class VendorOrderDetailScreen extends ConsumerStatefulWidget {
  const VendorOrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<VendorOrderDetailScreen> createState() => _VendorOrderDetailScreenState();
}

class _VendorOrderDetailScreenState extends ConsumerState<VendorOrderDetailScreen> {
  Timer? _poll;

  @override
  void initState() {
    super.initState();
    _poll = Timer.periodic(const Duration(seconds: 5), (_) {
      ref.invalidate(vendorOrderProvider(widget.orderId));
      final snapshot = ref.read(vendorSnapshotProvider).value;
      if (snapshot != null) ref.invalidate(vendorOrdersProvider(snapshot.vendor.id));
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(vendorOrderProvider(widget.orderId));
    return async.when(
      loading: () => const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Loading'))),
      error: (_, __) => Scaffold(
        appBar: AppBar(title: const Text('Order details')),
        body: Center(
          child: PrimaryButton(
            label: 'Retry',
            onPressed: () => ref.invalidate(vendorOrderProvider(widget.orderId)),
          ),
        ),
      ),
      data: (order) => _OrderDetail(order: order),
    );
  }
}

class _OrderDetail extends ConsumerWidget {
  const _OrderDetail({required this.order});

  final VendorOrder order;

  Future<void> _reportIssue(BuildContext context, WidgetRef ref) async {
    const categories = <String>['CUSTOMER_DID_NOT_SHOW', 'RIDER_ISSUE', 'WRONG_ITEMS', 'OTHER'];
    String selected = categories.first;
    final note = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          title: const Text('Report order issue'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField<String>(value: selected, items: categories.map((category) => DropdownMenuItem(value: category, child: Text(category))).toList(), onChanged: (value) => setDialogState(() => selected = value ?? categories.first)),
            TextField(controller: note, maxLines: 3, decoration: const InputDecoration(labelText: 'Notes (optional)')),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Submit')),
          ],
        ),
      ),
    );
    if (submit == true) {
      try {
        await ref.read(vendorOrderRepositoryProvider).reportIssue(order.orderId, selected, note: note.text);
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Issue reported')));
      } catch (_) {
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to report issue')));
      }
    }
    note.dispose();
  }

  Future<void> _recordMarketFulfillment(BuildContext context, WidgetRef ref) async {
    final quantities = order.items.map((item) => TextEditingController()).toList();
    final units = order.items.map((item) => TextEditingController(text: 'kg')).toList();
    final prices = order.items.map((item) => TextEditingController()).toList();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Market weighing and packing'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Text('Record the measured quantity. Optional actual price is stored for reconciliation; it does not change the charged order automatically.'),
            const SizedBox(height: 12),
            ...order.items.asMap().entries.map((entry) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${entry.value.qty}× ${entry.value.name}', style: AppTextStyles.subtitleMedium),
                    Row(children: [
                      Expanded(child: TextField(controller: quantities[entry.key], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Measured qty'))),
                      const SizedBox(width: 8),
                      SizedBox(width: 80, child: TextField(controller: units[entry.key], decoration: const InputDecoration(labelText: 'Unit'))),
                    ]),
                    TextField(controller: prices[entry.key], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: const InputDecoration(labelText: 'Actual price (GHS, optional)')),
                  ]),
                )),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Save measurements')),
        ],
      ),
    );
    if (submit == true) {
      final lines = <Map<String, dynamic>>[];
      for (var index = 0; index < order.items.length; index++) {
        final quantity = double.tryParse(quantities[index].text.trim());
        if (quantity == null || quantity <= 0) continue;
        final priceGhs = double.tryParse(prices[index].text.trim());
        lines.add(<String, dynamic>{
          'orderItemId': order.items[index].id,
          'actualQuantity': quantity,
          'unit': units[index].text.trim().isEmpty ? 'kg' : units[index].text.trim(),
          if (priceGhs != null && priceGhs >= 0) 'actualPricePesewas': (priceGhs * 100).round(),
        });
      }
      if (lines.isEmpty) {
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter at least one measured quantity')));
      } else {
        await _runAction(context, ref, () => ref.read(vendorOrderRepositoryProvider).recordMarketFulfillment(order.orderId, lines));
      }
    }
    for (final controller in [...quantities, ...units, ...prices]) {
      controller.dispose();
    }
  }

  Future<void> _recordLaundryCondition(BuildContext context, WidgetRef ref) async {
    final note = TextEditingController();
    final submit = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Laundry condition intake'),
        content: TextField(controller: note, maxLines: 4, decoration: const InputDecoration(labelText: 'Condition notes', hintText: 'Record stains, damage, or special handling')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(dialogContext, true), child: const Text('Save condition')),
        ],
      ),
    );
    if (submit == true && note.text.trim().isNotEmpty) {
      await _runAction(context, ref, () => ref.read(vendorOrderRepositoryProvider).recordLaundryCondition(order.orderId, <String, dynamic>{'note': note.text.trim()}));
    }
    note.dispose();
  }

  Future<void> _advanceLaundryStage(BuildContext context, WidgetRef ref) async {
    const stages = <String>['AWAITING_COLLECTION', 'COLLECTED', 'SORTING', 'WASHING', 'DRYING', 'QUALITY_CHECK', 'READY_FOR_RETURN', 'RETURNED'];
    final currentIndex = stages.indexOf(order.laundryStage ?? 'AWAITING_COLLECTION');
    if (currentIndex < 0 || currentIndex >= stages.length - 1) return;
    await _runAction(context, ref, () => ref.read(vendorOrderRepositoryProvider).updateLaundryStage(order.orderId, stages[currentIndex + 1]));
  }

  Future<void> _uploadLaundryConditionPhoto(BuildContext context, WidgetRef ref) async {
    final result = await FilePicker.platform.pickFiles(withData: true, type: FileType.image);
    final file = result?.files.single;
    if (file?.bytes == null) return;
    final lower = file!.name.toLowerCase();
    final contentType = lower.endsWith('.png') ? 'image/png' : lower.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
    try {
      await ref.read(vendorOrderRepositoryProvider).uploadLaundryConditionPhoto(orderId: order.orderId, bytes: file.bytes!, contentType: contentType);
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Condition photo uploaded securely')));
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to upload condition photo')));
    }
  }

  Future<void> _viewPrescription(BuildContext context, WidgetRef ref) async {
    try {
      final content = await ref.read(vendorOrderRepositoryProvider).getPrescription(order.orderId);
      if (!context.mounted) return;
      if (content.downloadUrl != null) {
        final uri = Uri.tryParse(content.downloadUrl!);
        if (uri != null && await canLaunchUrl(uri)) await launchUrl(uri, mode: LaunchMode.externalApplication);
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Prescription'),
          content: content.bytes != null && content.contentType.startsWith('image/')
              ? Image.memory(content.bytes!, fit: BoxFit.contain)
              : const Text('The prescription was retrieved securely. A PDF viewer is required for inline preview.'),
          actions: [
            if (content.bytes != null)
              TextButton(
                onPressed: () async {
                  await SharePlus.instance.share(ShareParams(files: [XFile.fromData(content.bytes!, name: 'prescription.${content.contentType == 'application/pdf' ? 'pdf' : 'jpg'}', mimeType: content.contentType)]));
                },
                child: const Text('Share file'),
              ),
            TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Close')),
          ],
        ),
      );
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to load prescription')));
    }
  }

  Future<void> _showIssues(BuildContext context, WidgetRef ref) async {
    try {
      final issues = await ref.read(vendorOrderRepositoryProvider).listIssues(order.orderId);
      if (!context.mounted) return;
      await showDialog<void>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Order issues'),
          content: issues.isEmpty
              ? const Text('No issues reported.')
              : SizedBox(
                  width: double.maxFinite,
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      for (final issue in issues)
                        ListTile(
                          title: Text(issue.category),
                          subtitle: Text(issue.note == null ? issue.status : '${issue.status} · ${issue.note}'),
                          trailing: issue.status != 'OPEN'
                              ? null
                              : IconButton(tooltip: 'Confirm', 
                                  icon: const Icon(LucideIcons.check),
                                  onPressed: () async {
                                    await ref.read(vendorOrderRepositoryProvider).acknowledgeIssue(order.orderId, issue.id);
                                    if (dialogContext.mounted) Navigator.pop(dialogContext);
                                  },
                                ),
                        ),
                    ],
                  ),
                ),
          actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Close'))],
        ),
      );
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to load order issues')));
    }
  }

  Future<void> _runAction(BuildContext context, WidgetRef ref, Future<VendorOrder> Function() action) async {
    try {
      await action();
      ref.invalidate(vendorOrderProvider(order.orderId));
      final snapshot = ref.read(vendorSnapshotProvider).value;
      if (snapshot != null) ref.invalidate(vendorOrdersProvider(snapshot.vendor.id));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order updated')));
      }
    } catch (_) {
      if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to update order')));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(vendorOrderRepositoryProvider);
    return OreVoicePresence(
      client: ref.read(vendorApiClientProvider),
      orderId: order.orderId,
      child: Scaffold(
      appBar: AppBar(title: Text(order.ref, style: AppTextStyles.heading3)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.08), borderRadius: BorderRadius.circular(18)),
            child: Row(children: [
              const Icon(LucideIcons.receiptText, color: AppColors.primary, size: 28),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(order.status, style: AppTextStyles.heading3.copyWith(color: AppColors.primary)),
                Text(
                  [
                    order.paymentMethod,
                    Formatters.formatDate(order.createdAt),
                    if (order.etaMinutes != null && order.etaMinutes! > 0) '~${order.etaMinutes} min',
                  ].join(' · '),
                  style: AppTextStyles.caption,
                ),
              ])),
              Text(Formatters.money(order.totalPesewas / 100), style: AppTextStyles.heading3),
            ]),
          ),
          const SizedBox(height: 20),
          Text('Items', style: AppTextStyles.heading3),
          const SizedBox(height: 8),
          ...order.items.map((item) {
            final options = item.selectedOptions.map((option) => option['optionName']?.toString()).whereType<String>().toList();
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: CircleAvatar(backgroundColor: AppColors.primary.withOpacity(0.1), child: Text('${item.qty}')),
              title: Text(item.name, style: AppTextStyles.subtitleMedium),
              subtitle: Text(options.isEmpty ? 'No variants selected' : options.join(' · '), style: AppTextStyles.caption),
              trailing: Text(Formatters.money(item.unitPricePesewas * item.qty / 100), style: AppTextStyles.subtitleMedium),
            );
          }),
          const Divider(),
          if (order.note?.isNotEmpty == true)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.info.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [const Icon(LucideIcons.messageSquare, color: AppColors.info), const SizedBox(width: 10), Expanded(child: Text(order.note!, style: AppTextStyles.bodyMedium))]),
            ),
          if (order.leaveAtDoor || (order.dropNote?.isNotEmpty ?? false) || order.scheduledFor != null)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(LucideIcons.clock, color: AppColors.warning),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    [
                      if (order.scheduledFor != null) 'Scheduled ${Formatters.formatDate(order.scheduledFor!)}',
                      if (order.leaveAtDoor) 'Leave at door',
                      if (order.dropNote?.isNotEmpty == true) order.dropNote!,
                    ].join(' · '),
                    style: AppTextStyles.bodyMedium,
                  ),
                ),
              ]),
            ),
          if (order.promotionDiscountPesewas > 0)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.success.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [const Icon(LucideIcons.tag, color: AppColors.success), const SizedBox(width: 10), Expanded(child: Text('${order.promotionTitle ?? 'Promotion'} · discount ${Formatters.money(order.promotionDiscountPesewas / 100)}', style: AppTextStyles.bodyMedium))]),
            ),
          if (order.tipPesewas > 0)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.info.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [const Icon(LucideIcons.bike, color: AppColors.info), const SizedBox(width: 10), Expanded(child: Text('Customer rider tip ${Formatters.money(order.tipPesewas / 100)} · paid to the rider, not the store', style: AppTextStyles.bodyMedium))]),
            ),
          if (order.peakPayPesewas > 0)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [const Icon(LucideIcons.zap, color: AppColors.warning), const SizedBox(width: 10), Expanded(child: Text('Peak pay ${Formatters.money(order.peakPayPesewas / 100)} · paid to the rider by Ore, not the store', style: AppTextStyles.bodyMedium))]),
            ),
          if (order.serviceCode == 'MK')
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(LucideIcons.package, color: AppColors.warning),
                const SizedBox(width: 10),
                Expanded(child: Text(order.marketFulfillment == null ? 'Record weighed quantities before packing' : 'Market measurements recorded', style: AppTextStyles.subtitleMedium)),
                if (order.marketFulfillment == null) IconButton(tooltip: 'View details', onPressed: () => _recordMarketFulfillment(context, ref), icon: const Icon(LucideIcons.clipboardList, color: AppColors.warning)),
              ]),
            ),
          if (order.serviceCode == 'LD')
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.info.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(LucideIcons.package, color: AppColors.info),
                  const SizedBox(width: 10),
                  Expanded(child: Text('Laundry stage: ${order.laundryStage ?? 'AWAITING_COLLECTION'}', style: AppTextStyles.subtitleMedium)),
                  IconButton(tooltip: 'Upload condition photo', onPressed: () => _uploadLaundryConditionPhoto(context, ref), icon: const Icon(LucideIcons.camera, color: AppColors.info)),
                  if (order.conditionJson == null) IconButton(tooltip: 'View details', onPressed: () => _recordLaundryCondition(context, ref), icon: const Icon(LucideIcons.clipboardList, color: AppColors.info)),
                ]),
                const SizedBox(height: 8),
                Text(order.conditionJson == null ? 'Condition intake has not been recorded.' : 'Condition intake recorded.', style: AppTextStyles.caption),
                if (order.laundryStage != 'RETURNED')
                  Align(alignment: Alignment.centerRight, child: OutlinedButton.icon(onPressed: () => _advanceLaundryStage(context, ref), icon: const Icon(LucideIcons.arrowRight, size: 16), label: const Text('Advance stage'))),
              ]),
            ),
          if (order.prescriptionRequired)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.warning.withOpacity(0.1), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(LucideIcons.fileWarning, color: AppColors.warning),
                const SizedBox(width: 10),
                Expanded(child: Text('Prescription status: ${order.prescriptionStatus}', style: AppTextStyles.subtitleMedium)),
                if (order.prescriptionStatus == 'SUBMITTED' || order.prescriptionStatus == 'APPROVED')
                  IconButton(
                    tooltip: 'View prescription',
                    onPressed: () => _viewPrescription(context, ref),
                    icon: const Icon(LucideIcons.eye, color: AppColors.primary),
                  ),
                if (order.prescriptionStatus == 'SUBMITTED') ...[
                  IconButton(
                    tooltip: 'Reject prescription',
                    onPressed: () => _runAction(context, ref, () => ref.read(vendorOrderRepositoryProvider).rejectPrescription(order.orderId, note: 'Prescription could not be approved')), 
                    icon: const Icon(LucideIcons.xCircle, color: AppColors.error),
                  ),
                  IconButton(
                    tooltip: 'Approve prescription',
                    onPressed: () => _runAction(context, ref, () => ref.read(vendorOrderRepositoryProvider).approvePrescription(order.orderId)),
                    icon: const Icon(LucideIcons.fileCheck, color: AppColors.success),
                  ),
                ],
              ]),
            ),
          if (order.customer != null) ...[
            Text('Customer', style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(LucideIcons.user),
              title: Text(order.customer!.name),
              subtitle: const Text('In-app call — regular line if weak'),
              trailing: IconButton(tooltip: 'Call', 
                icon: const Icon(LucideIcons.phone),
                onPressed: () => OreVoiceCallPage.open(
                  context,
                  client: ref.read(vendorApiClientProvider),
                  orderId: order.orderId,
                  target: OreVoiceTarget.customer,
                  peerLabel: order.customer!.name,
                  fallbackTel: order.customer!.phone,
                ),
              ),
            ),
          ],
          if (order.status == 'CANCELLED') ...[
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: AppColors.error.withOpacity(0.08), borderRadius: BorderRadius.circular(14)),
              child: Row(children: [
                const Icon(LucideIcons.xCircle, color: AppColors.error),
                const SizedBox(width: 10),
                Expanded(child: Text('This order was cancelled.', style: AppTextStyles.subtitleMedium)),
              ]),
            ),
          ],
          if (order.rider != null) ...[
            Text('Rider', style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(LucideIcons.bike),
              title: Text(order.rider!.name),
              subtitle: const Text('In-app call — regular line if weak'),
              trailing: IconButton(tooltip: 'Call', 
                icon: const Icon(LucideIcons.phone),
                onPressed: () => OreVoiceCallPage.open(
                  context,
                  client: ref.read(vendorApiClientProvider),
                  orderId: order.orderId,
                  target: OreVoiceTarget.rider,
                  peerLabel: order.rider!.name,
                  fallbackTel: order.rider!.phone,
                ),
              ),
            ),
          ] else if (const ['READY_FOR_PICKUP', 'WAITING_FOR_RIDER'].contains(order.status)) ...[
            Text('Rider', style: AppTextStyles.heading3),
            const SizedBox(height: 8),
            const ListTile(contentPadding: EdgeInsets.zero, leading: Icon(LucideIcons.bike), title: Text('No rider assigned'), subtitle: Text('Dispatch is finding a rider')),
          ],
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => context.push(VendorRoutes.orderChat.replaceFirst(':id', order.orderId)),
            icon: const Icon(LucideIcons.messageCircle),
            label: const Text('Message customer and rider'),
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: OutlinedButton.icon(onPressed: () => _reportIssue(context, ref), icon: const Icon(LucideIcons.circleAlert), label: const Text('Report issue'))),
            const SizedBox(width: 8),
            Expanded(child: OutlinedButton.icon(onPressed: () => _showIssues(context, ref), icon: const Icon(LucideIcons.list), label: const Text('View issues'))),
          ]),
          const SizedBox(height: 12),
          if (order.status == 'CONFIRMED')
            Row(children: [
              Expanded(child: OutlinedButton(onPressed: () => _runAction(context, ref, () => repo.reject(order.orderId)), child: const Text('Reject'))),
              const SizedBox(width: 10),
              Expanded(child: ElevatedButton(onPressed: () => _runAction(context, ref, () => repo.accept(order.orderId)), child: const Text('Accept'))),
            ])
          else if (order.status == 'ACCEPTED' || order.status == 'PREPARING')
            ElevatedButton(onPressed: () => _runAction(context, ref, () => repo.ready(order.orderId)), child: const Text('Mark ready for pickup')),
        ],
      ),
    ),
    );
  }
}
