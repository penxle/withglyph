import 'dart:async';
import 'dart:math';
import 'dart:ui' as ui;

import 'package:auto_route/auto_route.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:glyph/components/heading.dart';
import 'package:glyph/components/pressable.dart';
import 'package:glyph/icons/tabler.dart';
import 'package:glyph/shells/default.dart';
import 'package:glyph/themes/colors.dart';
import 'package:transparent_image/transparent_image.dart';

@RoutePage()
class CropScreen extends ConsumerStatefulWidget {
  const CropScreen({super.key});

  @override
  createState() => _CropScreenState();
}

class _CropScreenState extends ConsumerState<CropScreen> {
  var _transform = Matrix4.identity();

  final _regionKey = GlobalKey();

  double _scale = 1.0;
  double _scaleInProgress = 1.0;
  Offset _translate = Offset.zero;

  ui.Image? _image;

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final asset = await rootBundle.load('assets/images/sample.jpg');
      final bytes = asset.buffer.asUint8List();
      final image = await decodeImageFromList(bytes);

      setState(() {
        _image = image;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return DefaultShell(
      appBar: Heading(
        bottomBorder: false,
        backgroundColor: BrandColors.gray_900,
        leading: const HeadingAutoLeading(color: BrandColors.gray_0),
        actions: [
          Pressable(
            child: const Icon(Tabler.check, color: BrandColors.gray_0),
            onPressed: () async {
              await context.router.maybePop();
            },
          ),
        ],
      ),
      child: _image != null
          ? GestureDetector(child: CustomPaint(painter: _Painter(image: _image!)))
          : const Center(child: CircularProgressIndicator()),
    );
  }
}

class _Painter extends CustomPainter {
  const _Painter({required this.image});

  final ui.Image image;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (min(size.width, size.height) / 2) - 20;

    final width = image.width.toDouble();
    final height = image.height.toDouble();

    final widthScale = (radius * 2) / width;
    final heightScale = (radius * 2) / height;

    final scale = max(widthScale, heightScale);

    final effectiveWidth = width * scale;
    final effectiveHeight = height * scale;

    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Paint()..color = BrandColors.gray_900,
    );

    paintImage(
      canvas: canvas,
      rect: Rect.fromCenter(
        center: center,
        width: effectiveWidth,
        height: effectiveHeight,
      ),
      image: image,
      // fit: BoxFit.cover,
    );

    canvas
      ..drawPath(
        Path.combine(
          PathOperation.difference,
          Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height)),
          Path()..addOval(Rect.fromCircle(center: center, radius: radius)),
        ),
        Paint()..color = BrandColors.gray_900.withOpacity(0.75),
      )
      ..drawCircle(
        center,
        radius,
        Paint()
          ..color = BrandColors.gray_0
          ..style = ui.PaintingStyle.stroke
          ..strokeWidth = 2,
      );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return false;
  }
}
