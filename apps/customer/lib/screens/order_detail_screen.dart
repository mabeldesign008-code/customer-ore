import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/ui/iconly_compat.dart';
import 'package:ore_core/ore_core.dart';

import '../core/ui/customer_image.dart';
import '../core/ui/toast_x.dart';
import '../data/order/customer_order_repository.dart';
import '../data/order/customer_request_repository.dart';
import '../providers/cart_provider.dart';
import '../providers/customer_auth_provider.dart';
import '../providers/orders_provider.dart';

class OrderDetailScreen extends ConsumerStatefulWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  ConsumerState<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends ConsumerState<OrderDetailScreen> {
  bool _loading = true;
  bool _submittingDecision = false;
  bool _otpLoading = false;
  bool _prescriptionLoading = false;
  bool _disputeLoading = false;
  bool _conditionPhotosLoading = false;
  bool _deliveryProofLoading = false;
  bool _cancelling = false;
  List<CustomerLaundryConditionPhoto>? _conditionPhotos;
  CustomerDeliveryProof? _deliveryProof;
  String? _otp;
  String? _otpError;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      await ref.read(ordersProvider.notifier).refreshOrder(widget.orderId);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = _message(error));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _message(Object error) {
    final value = error.toString().replaceFirst('Exception: ', '').trim();
    return value.isEmpty ? 'We could not load this order.' : value;
  }

  String _apiMessage(Object error) {
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map && body['error'] is Map) {
        final message = (body['error'] as Map)['message']?.toString()?.trim();
        if (message != null && message.isNotEmpty) return message;
      }
    }
    return _message(error);
  }

  Future<void> _showCancelSheet(OreOrder order) async {
    if (_cancelling || !order.status.canCustomerCancel) return;
    final reason = TextEditingController();
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SheetHandle(),
                const SizedBox(height: 8),
                Text('Cancel this order?', style: AppTypography.h3()),
                const SizedBox(height: 8),
                Text(
                  'You can cancel until the rider picks up the order. After pickup, cancel is not available in the app.',
                  style: AppTypography.bodySm(),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reason,
                  maxLines: 3,
                  maxLength: 200,
                  decoration: const InputDecoration(
                    labelText: 'Reason (optional)',
                    hintText: 'Tell Ore why you are cancelling',
                  ),
                ),
                const SizedBox(height: 12),
                OreButton(
                  label: 'Cancel order',
                  variant: OreButtonVariant.danger,
                  icon: Icons.close_rounded,
                  onPressed: () => Navigator.pop(sheetContext, true),
                ),
                const SizedBox(height: 8),
                OreButton(
                  label: 'Keep order',
                  variant: OreButtonVariant.secondary,
                  onPressed: () => Navigator.pop(sheetContext, false),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    final note = reason.text.trim();
    reason.dispose();
    if (confirmed != true || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await ref.read(ordersProvider.notifier).cancelOrder(
            order.id,
            reason: note.isEmpty ? null : note,
          );
      if (mounted) context.showToast('Order cancelled.', type: ToastType.success);
    } catch (error) {
      if (mounted) context.showToast(_apiMessage(error), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  Future<void> _pickPrescription(String orderId) async {
    if (_prescriptionLoading) return;
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: const ['jpg', 'jpeg', 'png', 'pdf'],
      withData: true,
    );
    if (picked == null || picked.files.isEmpty || !mounted) return;
    final file = picked.files.single;
    final bytes = file.bytes;
    if (bytes == null || bytes.isEmpty) {
      context.showToast('The selected prescription could not be read.', type: ToastType.error);
      return;
    }
    setState(() => _prescriptionLoading = true);
    try {
      await ref.read(customerOrderRepositoryProvider).uploadPrescription(
            orderId: orderId,
            bytes: bytes,
            contentType: _prescriptionContentType(file.extension),
          );
      await ref.read(ordersProvider.notifier).refreshOrder(orderId);
      if (mounted) context.showToast('Prescription uploaded for review.', type: ToastType.success);
    } catch (error) {
      if (mounted) context.showToast(_message(error), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _prescriptionLoading = false);
    }
  }

  String _prescriptionContentType(String? extension) {
    switch (extension?.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
      default:
        return 'application/pdf';
    }
  }

  Future<void> _revealOtp(String orderId) async {
    if (_otpLoading) return;
    setState(() {
      _otpLoading = true;
      _otpError = null;
    });
    try {
      final otp = await ref.read(customerOrderRepositoryProvider).getDeliveryOtp(orderId);
      if (mounted) setState(() => _otp = otp);
    } catch (error) {
      if (mounted) setState(() => _otpError = _message(error));
    } finally {
      if (mounted) setState(() => _otpLoading = false);
    }
  }

  Future<void> _showIssueSheet(String orderId) async {
    final note = TextEditingController();
    var category = 'OTHER';
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SheetHandle(),
                  const SizedBox(height: 8),
                  Text('Report an order issue', style: AppTypography.h3()),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: category,
                    decoration: const InputDecoration(labelText: 'Issue type'),
                    items: const [
                      DropdownMenuItem(value: 'MISSING_ITEM', child: Text('Missing item')),
                      DropdownMenuItem(value: 'WRONG_ITEM', child: Text('Wrong item')),
                      DropdownMenuItem(value: 'DAMAGED', child: Text('Damaged')),
                      DropdownMenuItem(value: 'QUALITY', child: Text('Quality concern')),
                      DropdownMenuItem(value: 'NEVER_DELIVERED', child: Text('Order not delivered')),
                      DropdownMenuItem(value: 'OVERCHARGED', child: Text('Overcharged')),
                      DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                    ],
                    onChanged: (value) => setSheetState(() => category = value ?? 'OTHER'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: note,
                    maxLines: 3,
                    maxLength: 300,
                    decoration: const InputDecoration(
                      labelText: 'What happened?',
                      hintText: 'Add details for Ore support',
                    ),
                  ),
                  const SizedBox(height: 12),
                  OreButton(
                    label: 'Submit issue',
                    icon: Icons.send_rounded,
                    onPressed: () => Navigator.pop(sheetContext, true),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    if (submitted != true || !mounted) {
      note.dispose();
      return;
    }
    try {
      await ref.read(customerOrderRepositoryProvider).reportIssue(
            orderId: orderId,
            category: category,
            note: note.text.trim().isEmpty ? null : note.text.trim(),
          );
      if (mounted) context.showToast('Issue sent to Ore support.', type: ToastType.success);
    } catch (error) {
      if (mounted) context.showToast(_message(error), type: ToastType.error);
    } finally {
      note.dispose();
    }
  }

  Future<void> _showDisputeSheet(String orderId) async {
    if (_disputeLoading) return;
    final description = TextEditingController();
    var reason = 'OTHER';
    final submitted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SheetHandle(),
                  const SizedBox(height: 8),
                  Text('Request a refund review', style: AppTypography.h3()),
                  const SizedBox(height: 6),
                  Text('Describe the delivered-order problem. Ore support will review the request.', style: AppTypography.bodySm()),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    value: reason,
                    decoration: const InputDecoration(labelText: 'Reason'),
                    items: const [
                      DropdownMenuItem(value: 'MISSING_ITEM', child: Text('Missing item')),
                      DropdownMenuItem(value: 'WRONG_ITEM', child: Text('Wrong item')),
                      DropdownMenuItem(value: 'DAMAGED', child: Text('Damaged')),
                      DropdownMenuItem(value: 'QUALITY', child: Text('Quality concern')),
                      DropdownMenuItem(value: 'NEVER_DELIVERED', child: Text('Never delivered')),
                      DropdownMenuItem(value: 'OVERCHARGED', child: Text('Overcharged')),
                      DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                    ],
                    onChanged: (value) => setSheetState(() => reason = value ?? 'OTHER'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: description,
                    maxLines: 4,
                    maxLength: 1000,
                    decoration: const InputDecoration(labelText: 'Description', hintText: 'At least three characters'),
                  ),
                  const SizedBox(height: 12),
                  OreButton(
                    label: 'Send refund request',
                    icon: Icons.send_rounded,
                    onPressed: () {
                      if (description.text.trim().length < 3) return;
                      Navigator.pop(sheetContext, true);
                    },
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
    if (submitted != true || !mounted) {
      description.dispose();
      return;
    }
    setState(() => _disputeLoading = true);
    try {
      await ref.read(customerDisputeRepositoryProvider).open(
            orderId: orderId,
            reason: reason,
            description: description.text.trim(),
          );
      ref.invalidate(customerDisputesProvider);
      if (mounted) context.showToast('Refund request sent to Ore support.', type: ToastType.success);
    } catch (error) {
      if (mounted) context.showToast(_message(error), type: ToastType.error);
    } finally {
      description.dispose();
      if (mounted) setState(() => _disputeLoading = false);
    }
  }

  Future<void> _reorder(String orderId) async {
    HapticFeedback.mediumImpact();
    try {
      final repo = ref.read(customerCartRepositoryProvider);
      final result = await repo.reorder(orderId);
      // Refresh local cart state so the cart tab reflects the new items.
      ref.invalidate(cartProvider);
      ref.invalidate(cartSubtotalProvider);
      if (!mounted) return;
      if (result.added == 0) {
        context.showToast('None of those items are available right now.', type: ToastType.warning);
        return;
      }
      final skipMsg = result.skipped.isEmpty ? '' : '\n${result.skipped.length} item(s) unavailable.';
      context.showToast(
        '${result.added} item(s) added to your cart.$skipMsg',
        type: ToastType.success,
      );
      context.push('/cart');
    } catch (e) {
      if (!mounted) return;
      context.showToast('Could not reorder. Try again.', type: ToastType.error);
    }
  }

  Future<void> _decideSubstitution(String orderId, bool approve) async {
    if (_submittingDecision) return;
    setState(() => _submittingDecision = true);
    try {
      await ref.read(customerRequestRepositoryProvider).decideErrandSubstitution(
            orderId: orderId,
            approve: approve,
          );
      await ref.read(ordersProvider.notifier).refreshOrder(orderId);
      if (mounted) {
        context.showToast(
          approve ? 'Substitution approved' : 'Substitution declined',
          type: ToastType.success,
        );
      }
    } catch (error) {
      if (mounted) context.showToast(_message(error), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _submittingDecision = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final order = ref.watch(orderByIdProvider(widget.orderId));
    if (order == null) {
      if (_loading) {
        return const Scaffold(
          body: Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        );
      }
      return Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              _header(context, 'Order details'),
              Expanded(
                child: OreEmptyState(
                  icon: Icons.cloud_off_rounded,
                  title: 'Order could not load',
                  subtitle: _error ?? 'It may have been removed or has not synced yet.',
                  ctaLabel: 'Try again',
                  onCta: _load,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            _header(context, 'Order ${order.id}'),
            if (_error != null)
              MaterialBanner(
                content: Text('Showing the last saved order. ${_error!}'),
                actions: [
                  TextButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                color: AppColors.primary,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(
                    parent: BouncingScrollPhysics(),
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  children: [
                    if (order.paymentPending)
                      _paymentPendingBanner(order),
                    if (order.prescriptionRequired && order.prescriptionStatus != 'APPROVED')
                      _prescriptionPanel(order),
                    if (order.errandDetails != null)
                      _errandPanel(order),
                    if (order.parcelDetails != null)
                      _parcelPanel(order),
                    if (order.laundryStage != null || order.marketFulfillment != null)
                      _fulfillmentPanel(order),
                    if (order.otpRequired)
                      _otpPanel(order),
                    _orderSummary(order),
                    const SizedBox(height: 16),
                    _info(Icons.storefront_rounded, order.vendorName),
                    _info(Icons.location_on_rounded, order.address.displayLabel),
                    _info(
                      Icons.credit_card_rounded,
                      '${order.paymentMethod.label} · ${order.isPaid ? 'Paid' : 'Pay on delivery'}',
                    ),
                    _moneyBreakdown(order),
                    if (order.leaveAtDoor)
                      _info(Icons.inventory_2_rounded, 'Leave at door'),
                    if (order.specialInstructions != null)
                      _info(Icons.chat_bubble_outline_rounded, order.specialInstructions!),
                    const SizedBox(height: 24),
                    OutlinedButton.icon(
                      onPressed: () => context.push(
                        '/chat?orderId=${Uri.encodeComponent(order.id)}&peerName=${Uri.encodeComponent(order.riderName ?? order.vendorName)}',
                      ),
                      icon: const Icon(Icons.chat_outlined),
                      label: const Text('Message'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(double.infinity, 52),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _showIssueSheet(order.id),
                            icon: const Icon(Icons.flag_outlined),
                            label: const Text('Report issue'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 52),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                          ),
                        ),
                        if (order.status == OrderStatus.delivered) ...[
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => _reorder(order.id),
                              icon: const Icon(IconlyBold.buy, size: 18),
                              label: const Text('Reorder'),
                              style: OutlinedButton.styleFrom(
                                minimumSize: const Size(double.infinity, 52),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OreButton(
                              label: 'Rate',
                              icon: Icons.star_rounded,
                              onPressed: () => context.push('/orders/${order.id}/rate'),
                            ),
                          ),
                        ] else if (order.status.isActive) ...[
                          const SizedBox(width: 12),
                          Expanded(
                            child: OreButton(
                              label: 'Track',
                              icon: Icons.location_on_rounded,
                              onPressed: () => context.push('/orders/${order.id}/tracking'),
                            ),
                          ),
                        ],
                      ],
                    ).animate().fadeIn(delay: 250.ms).slideY(begin: 0.12),
                    if (order.status == OrderStatus.delivered) ...[
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: _disputeLoading ? null : () => _showDisputeSheet(order.id),
                        icon: const Icon(Icons.account_balance_wallet_rounded),
                        label: Text(_disputeLoading ? 'Sending refund request…' : 'Request refund review'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(double.infinity, 52),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ],
                    if (order.status == OrderStatus.cancelled) ...[
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: AppColors.danger.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text('This order was cancelled.', style: AppTypography.bodySm()),
                      ),
                    ],
                    if (order.status.canCustomerCancel) ...[
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: _cancelling ? null : () => _showCancelSheet(order),
                        icon: const Icon(Icons.close_rounded, color: AppColors.danger),
                        label: Text(_cancelling ? 'Cancelling…' : 'Cancel order'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.danger,
                          minimumSize: const Size(double.infinity, 52),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _header(BuildContext context, String title) {
    final order = ref.read(orderByIdProvider(widget.orderId));
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
      child: Row(
        children: [
          IconButton(tooltip: 'Go back', 
            icon: const Icon(Icons.arrow_back_ios_new_rounded),
            onPressed: () => context.pop(),
          ),
          Expanded(child: Text(title, style: AppTypography.h3())),
          if (order != null)
            IconButton(
              tooltip: 'Track order',
              icon: const Icon(Icons.location_on_rounded),
              onPressed: () => context.push('/orders/${order.id}/tracking'),
            ),
        ],
      ),
    );
  }

  Widget _paymentPendingBanner(OreOrder order) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.accent.withOpacity(0.12),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.accent.withOpacity(0.35)),
        ),
        child: Row(
          children: [
            const Icon(Icons.schedule_rounded, color: AppColors.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Payment is awaiting confirmation. We will update this order when Ore receives the payment webhook.',
                style: AppTypography.bodySm(),
              ),
            ),
          ],
        ),
      );

  Widget _prescriptionPanel(OreOrder order) => OreCard(
        margin: const EdgeInsets.only(bottom: 16),
        color: AppColors.info.withOpacity(0.08),
        child: Row(
          children: [
            const Icon(Icons.description_outlined, color: AppColors.info),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Prescription required', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
                  Text(
                    order.prescriptionReviewNote ??
                        'Upload a clear PDF or image before the Vendor can accept this order.',
                    style: AppTypography.bodySm(),
                  ),
                  const SizedBox(height: 4),
                  Text(order.prescriptionStatus ?? 'PENDING_UPLOAD', style: AppTypography.caption(AppColors.info)),
                ],
              ),
            ),
            TextButton(
              onPressed: _prescriptionLoading ? null : () => _pickPrescription(order.id),
              child: Text(_prescriptionLoading ? 'Uploading…' : 'Upload'),
            ),
          ],
        ),
      );

  Widget _parcelPanel(OreOrder order) {
    final parcel = order.parcelDetails!;
    return OreCard(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.inventory_2_rounded, color: AppColors.primary),
              const SizedBox(width: 10),
              Expanded(child: Text('Parcel custody', style: AppTypography.h3())),
              Text(parcel.parcelStatus ?? 'Processing', style: AppTypography.caption(AppColors.primary)),
            ],
          ),
          const SizedBox(height: 10),
          Text('${parcel.category} · ${parcel.weightKg?.toStringAsFixed(1) ?? '—'} kg', style: AppTypography.body()),
          const SizedBox(height: 8),
          _parcelParty('From', parcel.pickupAddress, null),
          const SizedBox(height: 8),
          _parcelParty('To', parcel.recipientAddress, parcel.recipientName),
          if (parcel.returnReason != null && parcel.returnReason!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('Return reason: ${parcel.returnReason}', style: AppTypography.bodySm(AppColors.danger)),
          ],
          if (parcel.proofMode == 'PHOTO' || parcel.proofMode == 'PIN_AND_PHOTO') ...[
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _deliveryProofLoading ? null : () => _loadDeliveryProof(order.id),
              icon: const Icon(Icons.image_outlined, size: 17),
              label: Text(_deliveryProof == null
                  ? (_deliveryProofLoading ? 'Loading delivery proof…' : 'View delivery proof')
                  : 'Delivery proof available'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _parcelParty(String label, OreAddress? address, String? person) => Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 42, child: Text(label, style: AppTypography.caption())),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              [if (person != null && person.isNotEmpty) person, if (address != null) address.displayLabel]
                  .join(' · '),
              style: AppTypography.bodySm(),
            ),
          ),
        ],
      );

  Future<void> _loadConditionPhotos(String orderId) async {
    if (_conditionPhotosLoading) return;
    setState(() => _conditionPhotosLoading = true);
    try {
      final photos = await ref.read(customerOrderRepositoryProvider).getLaundryConditionPhotos(orderId);
      if (mounted) {
        setState(() => _conditionPhotos = photos);
        if (photos.isEmpty) {
          context.showToast('No laundry condition photos have been uploaded yet.', type: ToastType.info);
        } else {
          await _showConditionPhotos(photos);
        }
      }
    } catch (error) {
      if (mounted) context.showToast(_message(error), type: ToastType.error);
    } finally {
      if (mounted) setState(() => _conditionPhotosLoading = false);
    }
  }

  Future<void> _loadDeliveryProof(String orderId) async {
    if (_deliveryProofLoading) return;
    setState(() => _deliveryProofLoading = true);
    try {
      final proof = await ref.read(customerOrderRepositoryProvider).getDeliveryProof(orderId);
      if (mounted) {
        setState(() => _deliveryProof = proof);
        await _showDeliveryProof(proof);
      }
    } catch (error) {
      if (mounted) context.showToast(_message(error), type: ToastType.info);
    } finally {
      if (mounted) setState(() => _deliveryProofLoading = false);
    }
  }

  Future<void> _showDeliveryProof(CustomerDeliveryProof proof) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SafeArea(
        child: Container(
          height: MediaQuery.of(context).size.height * 0.7,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SheetHandle(),
              const SizedBox(height: 8),
              Text('Delivery proof', style: AppTypography.h3()),
              const SizedBox(height: 12),
              Expanded(
                child: proof.dataBase64 != null && proof.dataBase64!.isNotEmpty
                    ? Center(child: Image.memory(base64Decode(proof.dataBase64!), fit: BoxFit.contain))
                    : CustomerImage(
                        proof.downloadUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.hide_image_outlined, color: AppColors.textMuted, size: 54)),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showConditionPhotos(List<CustomerLaundryConditionPhoto> photos) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SafeArea(
        child: Container(
          height: MediaQuery.of(context).size.height * 0.7,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SheetHandle(),
              const SizedBox(height: 8),
              Text('Laundry condition photos', style: AppTypography.h3()),
              const SizedBox(height: 12),
              Expanded(
                child: GridView.builder(
                  itemCount: photos.length,
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                  ),
                  itemBuilder: (_, index) {
                    final photo = photos[index];
                    if (photo.dataBase64 != null && photo.dataBase64!.isNotEmpty) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.memory(base64Decode(photo.dataBase64!), fit: BoxFit.cover),
                      );
                    }
                    return ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: CustomerImage(
                        photo.downloadUrl,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: AppColors.background,
                          child: const Icon(Icons.hide_image_outlined, color: AppColors.textMuted),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _fulfillmentPanel(OreOrder order) {
    final market = order.marketFulfillment;
    final lines = market?['lines'];
    final lineCount = lines is List ? lines.length : 0;
    final title = order.laundryStage != null ? 'Laundry progress' : 'Market fulfillment';
    final detail = order.laundryStage != null
        ? order.laundryStage!
        : lineCount == 0
            ? 'Vendor fulfillment recorded'
            : '$lineCount measured item${lineCount == 1 ? '' : 's'} recorded';
    return OreCard(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(order.laundryStage != null ? Icons.checkroom_rounded : Icons.inventory_rounded, color: order.serviceType.color),
              const SizedBox(width: 10),
              Expanded(
                child: Text(title, style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(detail, style: AppTypography.bodySm()),
          if (order.laundryStage != null) ...[
            const SizedBox(height: 8),
            TextButton.icon(
              onPressed: _conditionPhotosLoading ? null : () => _loadConditionPhotos(order.id),
              icon: const Icon(Icons.image_outlined, size: 17),
              label: Text(
                _conditionPhotos == null
                    ? (_conditionPhotosLoading ? 'Loading condition photos…' : 'Load condition photos')
                    : '${_conditionPhotos!.length} condition photo${_conditionPhotos!.length == 1 ? '' : 's'} available',
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _otpPanel(OreOrder order) => OreCard(
        margin: const EdgeInsets.only(bottom: 16),
        color: AppColors.warning.withOpacity(0.08),
        child: Row(
          children: [
            const Icon(Icons.security_rounded, color: AppColors.warning),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Delivery PIN', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
                  Text(
                    _otp ?? _otpError ?? 'Share this PIN with the Rider at delivery.',
                    style: AppTypography.bodySm(),
                  ),
                ],
              ),
            ),
            if (_otp == null)
              TextButton(
                onPressed: _otpLoading ? null : () => _revealOtp(order.id),
                child: Text(_otpLoading ? 'Loading…' : 'Reveal'),
              ),
          ],
        ),
      );

  Widget _errandPanel(OreOrder order) {
    final errand = order.errandDetails!;
    final substitutionPending = errand.substitutionStatus?.toUpperCase() == 'PENDING';
    return Column(
      children: [
        OreCard(
          margin: const EdgeInsets.only(bottom: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.shopping_basket_outlined, color: AppColors.errand),
                  const SizedBox(width: 10),
                  Expanded(child: Text('Errand progress', style: AppTypography.h3())),
                  Text(errand.errandStatus ?? 'Processing', style: AppTypography.caption(AppColors.errand)),
                ],
              ),
              const SizedBox(height: 10),
              Text(errand.taskTitle, style: AppTypography.body()),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: Text('Budget\n${Formatters.money(errand.budget ?? 0)}', style: AppTypography.bodySm())),
                  Expanded(child: Text('Spent\n${Formatters.money(errand.spent ?? 0)}', style: AppTypography.bodySm())),
                  Expanded(child: Text('Receipts\n${errand.receiptCount}', style: AppTypography.bodySm())),
                  if ((errand.compensation ?? 0) > 0)
                    Expanded(child: Text('Credit due\n${Formatters.money(errand.compensation!)}', style: AppTypography.bodySm(AppColors.success))),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Unused budget: ${Formatters.money((errand.budget ?? 0) - (errand.spent ?? 0))}',
                style: AppTypography.bodySm(AppColors.textSecondary),
              ),
            ],
          ),
        ),
        if (substitutionPending)
          OreCard(
            margin: const EdgeInsets.only(bottom: 16),
            color: AppColors.accent.withOpacity(0.08),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Substitution approval needed', style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 6),
                Text(
                  'The rider proposed ${errand.substitutionItem ?? 'a replacement'} for ${Formatters.money(errand.substitutionPrice ?? 0)}.',
                  style: AppTypography.bodySm(),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: _submittingDecision ? null : () => _decideSubstitution(order.id, false),
                        child: const Text('Decline'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OreButton(
                        label: _submittingDecision ? 'Saving…' : 'Approve',
                        isLoading: _submittingDecision,
                        onPressed: () => _decideSubstitution(order.id, true),
                      ),
                    ),
                  ],
                ),
                if (errand.receiptCount > 0) ...[
                  const SizedBox(height: 12),
                  const Divider(height: 8),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () => _viewErrandReceipts(order.id),
                    icon: const Icon(Icons.receipt_long_rounded),
                    label: Text('View ${errand.receiptCount} receipt${errand.receiptCount == 1 ? '' : 's'}'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }

  Future<void> _viewErrandReceipts(String orderId) async {
    try {
      final photos = await ref.read(customerOrderRepositoryProvider).getErrandReceipts(orderId);
      if (!mounted) return;
      if (photos.isEmpty) {
        context.showToast('No receipts uploaded yet.', type: ToastType.info);
        return;
      }
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (_, scrollController) => Container(
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Errand receipts', style: AppTypography.h3()),
                const SizedBox(height: 4),
                Text('What the rider bought and paid for.', style: AppTypography.bodySm(AppColors.textMuted)),
                const SizedBox(height: 16),
                Expanded(
                  child: ListView.separated(
                    controller: scrollController,
                    itemCount: photos.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (_, i) {
                      final p = photos[i];
                      if (p.dataBase64 == null && p.downloadUrl == null) {
                        return const SizedBox.shrink();
                      }
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: p.downloadUrl != null
                            ? CustomerImage(p.downloadUrl, fit: BoxFit.cover, width: double.infinity)
                            : Image.memory(
                                base64Decode(p.dataBase64!),
                                fit: BoxFit.cover,
                                width: double.infinity,
                              ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      context.showToast('Could not load receipts.', type: ToastType.error);
    }
  }

  Widget _orderSummary(OreOrder order) => OreCard(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: order.serviceType.color.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(
                    order.serviceType.icon,
                    color: order.serviceType.color,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.vendorName,
                        style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        '${order.status.label} · ${Formatters.formatDate(order.placedAt)}',
                        style: AppTypography.bodySm(),
                      ),
                    ],
                  ),
                ),
                Text(
                  Formatters.money(order.total),
                  style: AppTypography.h2(AppColors.primary),
                ),
              ],
            ),
            const Divider(height: 28),
            if (order.items.isEmpty)
              Text('Request service', style: AppTypography.body())
            else
              ...order.items.asMap().entries.map(
                    (entry) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Text(
                            '${entry.value.quantity}×',
                            style: AppTypography.bodyLg(AppColors.primary).copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(width: 10),
                          Expanded(child: Text(entry.value.title, style: AppTypography.body())),
                          Text(
                            Formatters.money(entry.value.lineTotal),
                            style: AppTypography.bodyLg().copyWith(fontWeight: FontWeight.w700),
                          ),
                        ],
                      ),
                    ),
                  ),
          ],
        ),
      ).animate().fadeIn(duration: 350.ms).slideY(begin: 0.1);

  Widget _moneyBreakdown(OreOrder order) => Padding(
        padding: const EdgeInsets.only(top: 12),
        child: OreCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              _moneyRow('Catalogue subtotal', order.subtotal),
              _moneyRow('Delivery fee', order.deliveryFee),
              _moneyRow('Service fee', order.serviceFee),
              if (order.discount > 0)
                _moneyRow('Promotion', -order.discount, color: AppColors.success),
              if ((order.riderTip ?? 0) > 0)
                _moneyRow('Rider tip', order.riderTip!),
              const Divider(height: 20),
              _moneyRow('Total', order.total, emphasize: true),
            ],
          ),
        ),
      );

  Widget _moneyRow(String label, double amount, {Color? color, bool emphasize = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: AppTypography.bodySm()),
            Text(
              Formatters.money(amount),
              style: (emphasize ? AppTypography.bodyLg() : AppTypography.bodySm())
                  .copyWith(color: color, fontWeight: emphasize ? FontWeight.w800 : FontWeight.w600),
            ),
          ],
        ),
      );

  Widget _info(IconData icon, String text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(icon, size: 18, color: AppColors.textSecondary),
            const SizedBox(width: 10),
            Expanded(child: Text(text, style: AppTypography.body())),
          ],
        ),
      );
}
