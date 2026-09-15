import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'customer_auth_provider.dart';

/// Single source of truth for the "Ore Wallet" balance (both GHS and pesewas).
class WalletNotifier extends Notifier<double> {
  bool _loading = false;
  int _balancePesewas = 0;

  @override
  double build() {
    if (ref.watch(customerAuthProvider).isAuthenticated) unawaited(refresh());
    return 0;
  }

  bool get isLoading => _loading;
  int get balancePesewas => _balancePesewas;

  Future<void> refresh() async {
    if (_loading || !ref.read(customerAuthProvider).isAuthenticated) return;
    _loading = true;
    try {
      final statement = await ref.read(customerCreditRepositoryProvider).getStatement();
      _balancePesewas = statement.balancePesewas;
      state = _balancePesewas / 100;
    } finally {
      _loading = false;
    }
  }
}

final walletProvider = NotifierProvider<WalletNotifier, double>(WalletNotifier.new);
