import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../network/api_client.dart';
import '../network/comms_client.dart';
import '../network/comms_models.dart';
import '../network/comms_socket.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../utils/formatters.dart';
import 'empty_state.dart';

/// Live order or Ore Support thread. Empty list stays empty — no seeded bot replies.
class OreOrderChatPage extends StatefulWidget {
  const OreOrderChatPage({
    super.key,
    required this.client,
    required this.readAccessToken,
    required this.currentUserId,
    this.orderId = '',
    this.kind = OreCommsThreadKind.order,
    this.title = 'Order chat',
    this.subtitle,
    this.canSend = true,
  });

  final OreApiClient client;
  final Future<String?> Function() readAccessToken;
  final String orderId;
  final OreCommsThreadKind kind;
  final String currentUserId;
  final String title;
  final String? subtitle;
  final bool canSend;

  bool get isSupport => kind == OreCommsThreadKind.support;

  @override
  State<OreOrderChatPage> createState() => _OreOrderChatPageState();
}

class _OreOrderChatPageState extends State<OreOrderChatPage> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  late final OreCommsClient _comms;

  OreCommsThread? _thread;
  final List<OreCommsMessage> _messages = <OreCommsMessage>[];
  final Set<String> _seen = <String>{};

  OreCommsSocket? _socket;
  StreamSubscription<OreCommsMessage>? _messageSub;
  StreamSubscription<OreCommsConnection>? _stateSub;
  Timer? _poll;

  bool _loading = true;
  bool _sending = false;
  bool _loadingOlder = false;
  bool _hasOlder = true;
  bool _socketLive = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _comms = OreCommsClient(widget.client);
    _scroll.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_bootstrap()));
  }

  @override
  void dispose() {
    _poll?.cancel();
    _messageSub?.cancel();
    _stateSub?.cancel();
    unawaited(_socket?.dispose() ?? Future<void>.value());
    _scroll.dispose();
    _input.dispose();
    super.dispose();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final thread = widget.isSupport
          ? await _comms.openSupportThread()
          : await _comms.openThread(widget.orderId);
      final rows = await _comms.listMessages(thread.threadId);
      if (!mounted) return;
      _thread = thread;
      _replaceMessages(rows);
      _hasOlder = rows.length >= 50;
      _loading = false;
      _error = null;
      setState(() {});
      await _openSocket(thread.threadId);
      _startPoll();
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = OreCommsClient.describeError(error);
      });
    }
  }

  Future<void> _openSocket(String threadId) async {
    await _messageSub?.cancel();
    await _stateSub?.cancel();
    await _socket?.dispose();
    final socket = OreCommsSocket(
      baseUrl: widget.client.baseUrl,
      readAccessToken: widget.readAccessToken,
    );
    _socket = socket;
    _messageSub = socket.messages.listen(_ingest);
    _stateSub = socket.states.listen((state) {
      if (!mounted) return;
      final live = state == OreCommsConnection.subscribed;
      setState(() => _socketLive = live);
      if (!live) unawaited(_refreshLatest());
    });
    await socket.subscribe(threadId);
  }

  void _startPoll() {
    _poll?.cancel();
    _poll = Timer.periodic(const Duration(seconds: 8), (_) {
      if (!_socketLive) unawaited(_refreshLatest());
    });
  }

  Future<void> _refreshLatest() async {
    final thread = _thread;
    if (thread == null) return;
    try {
      final rows = await _comms.listMessages(thread.threadId);
      if (!mounted) return;
      var added = false;
      for (final row in rows) {
        added = _add(row) || added;
      }
      if (added) setState(() {});
    } catch (_) {
      // Keep the last successful page. Next poll or socket retry.
    }
  }

  Future<void> _loadOlder() async {
    final thread = _thread;
    if (thread == null || _loadingOlder || !_hasOlder || _messages.isEmpty) return;
    _loadingOlder = true;
    setState(() {});
    try {
      final rows = await _comms.listMessages(thread.threadId, before: _messages.first.id);
      if (!mounted) return;
      _hasOlder = rows.length >= 50;
      for (final row in rows) {
        _add(row);
      }
    } catch (_) {
      // Stay on what we already have.
    } finally {
      if (mounted) setState(() => _loadingOlder = false);
    }
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    if (_scroll.position.pixels <= 48) unawaited(_loadOlder());
  }

  void _ingest(OreCommsMessage message) {
    if (!mounted) return;
    if (_add(message)) setState(() {});
  }

  bool _add(OreCommsMessage message) {
    if (_seen.contains(message.id)) return false;
    _seen.add(message.id);
    final insertAt = _messages.indexWhere((row) => row.createdAt.isAfter(message.createdAt));
    if (insertAt < 0) {
      _messages.add(message);
    } else {
      _messages.insert(insertAt, message);
    }
    return true;
  }

  void _replaceMessages(List<OreCommsMessage> rows) {
    _messages
      ..clear()
      ..addAll(rows);
    _seen
      ..clear()
      ..addAll(rows.map((row) => row.id));
  }

  Future<void> _send() async {
    final thread = _thread;
    if (thread == null || _sending || !widget.canSend) return;
    final body = _input.text.trim();
    if (body.isEmpty) return;
    setState(() => _sending = true);
    try {
      final saved = await _comms.postMessage(thread.threadId, body);
      if (!mounted) return;
      _input.clear();
      _add(saved);
      setState(() => _sending = false);
      _jumpToEnd();
    } catch (error) {
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(OreCommsClient.describeError(error))),
      );
    }
  }

  void _jumpToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(tooltip: 'Arrow_back_ios_new', 
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.title, style: AppTypography.h3()),
            Text(
              _socketLive ? 'Live' : (widget.subtitle ?? (widget.isSupport ? 'Ore Support' : 'Order messages')),
              style: AppTypography.caption(),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _loading ? null : () => unawaited(_bootstrap()),
            icon: const Icon(Icons.refresh, size: 20),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(child: _body()),
          if (_thread != null && widget.canSend) _composer(),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.primary));
    }
    if (_error != null && _messages.isEmpty) {
      return OreEmptyState(
        icon: Icons.chat_bubble_outline,
        title: 'Chat could not open',
        subtitle: _error,
        ctaLabel: 'Try again',
        onCta: () => unawaited(_bootstrap()),
      );
    }
    if (_messages.isEmpty) {
      return OreEmptyState(
        icon: Icons.chat_bubble_outline,
        iconColor: AppColors.textMuted,
        title: 'No messages yet',
        subtitle: widget.isSupport
            ? 'Write to Ore Support. A teammate replies here — this is not a bot. Do not share payment PINs or passwords.'
            : 'Messages stay on this order. Do not share delivery PINs or payment codes.',
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      itemCount: _messages.length + (_loadingOlder ? 1 : 0),
      itemBuilder: (context, index) {
        if (_loadingOlder && index == 0) {
          return const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))),
          );
        }
        final message = _messages[_loadingOlder ? index - 1 : index];
        return _bubble(message);
      },
    );
  }

  Widget _bubble(OreCommsMessage message) {
    final mine = widget.currentUserId.isNotEmpty && message.senderUserId == widget.currentUserId;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: mine ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(mine ? 16 : 4),
              bottomRight: Radius.circular(mine ? 4 : 16),
            ),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!mine)
                Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(
                    message.roleLabel,
                    style: AppTypography.caption(AppColors.primary).copyWith(fontWeight: FontWeight.w800),
                  ),
                ),
              Text(
                message.body,
                style: AppTypography.body(mine ? Colors.white : AppColors.textPrimary),
              ),
              const SizedBox(height: 4),
              Text(
                Formatters.timeAgo(message.createdAt.toLocal()),
                style: AppTypography.caption(mine ? Colors.white70 : AppColors.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _composer() {
    return Material(
      color: Colors.white,
      elevation: 8,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _input,
                  minLines: 1,
                  maxLines: 4,
                  maxLength: OreCommsClient.messageMax,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => unawaited(_send()),
                  inputFormatters: [LengthLimitingTextInputFormatter(OreCommsClient.messageMax)],
                  decoration: InputDecoration(
                    hintText: widget.isSupport ? 'Message Ore Support' : 'Message about this order',
                    hintStyle: AppTypography.body(AppColors.textMuted),
                    counterText: '',
                    filled: true,
                    fillColor: AppColors.background,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: const BorderSide(color: AppColors.primary, width: 1.4),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              IconButton.filled(
                onPressed: _sending ? null : () => unawaited(_send()),
                style: IconButton.styleFrom(backgroundColor: AppColors.primary),
                icon: _sending
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.send_rounded, color: Colors.white),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
