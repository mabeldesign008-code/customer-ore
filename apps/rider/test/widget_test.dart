import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ore_rider/main.dart';

void main() {
  testWidgets('App boots without crashing', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: OreRiderApp()));
    expect(find.byType(MaterialApp), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
  });
}
