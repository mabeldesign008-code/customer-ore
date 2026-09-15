import 'package:flutter/material.dart';

enum BottomLiftCorner {
  none,
  left,
  right,
  both,
}

class CustomBottomLiftShape extends CustomClipper<Path> {
  final BottomLiftCorner liftCorner;
  final double radius;
  final double lift;

  CustomBottomLiftShape({
    this.liftCorner = BottomLiftCorner.none,
    this.radius = 35.0,
    this.lift = 30.0,
  });

  @override
  Path getClip(Size size) {
    final path = Path();

    // Top-left
    path.moveTo(0, radius);
    path.quadraticBezierTo(0, 0, radius, 0);

    // Top-right
    path.lineTo(size.width - radius, 0);
    path.quadraticBezierTo(size.width, 0, size.width, radius);

    // Right side
    if (liftCorner == BottomLiftCorner.right ||
        liftCorner == BottomLiftCorner.both) {
      path.lineTo(size.width, size.height - lift - radius);
      path.quadraticBezierTo(size.width, size.height - lift,
          size.width - radius, size.height - lift);
    } else {
      path.lineTo(size.width, size.height - radius);
      path.quadraticBezierTo(
          size.width, size.height, size.width - radius, size.height);
    }

    // Bottom edge to left side
    if (liftCorner == BottomLiftCorner.left ||
        liftCorner == BottomLiftCorner.both) {
      path.lineTo(radius, size.height - lift);
      path.quadraticBezierTo(
          0, size.height - lift, 0, size.height - lift - radius);
    } else {
      path.lineTo(radius, size.height);
      path.quadraticBezierTo(0, size.height, 0, size.height - radius);
    }

    // Left side
    path.lineTo(0, radius);
    path.close();

    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => true;
}
