import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ore/screens/welcome_screen.dart';

void main() {
  testWidgets('App launches successfully', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp.router(
          routerConfig: GoRouter(
            routes: [
              GoRoute(path: '/', builder: (_, __) => const WelcomeScreen()),
              GoRoute(path: '/onboarding', builder: (_, __) => const SizedBox.shrink()),
            ],
          ),
        ),
      ),
    );
    expect(find.byType(WelcomeScreen), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
  });
}
