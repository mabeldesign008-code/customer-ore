import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart' as gmaps;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_text_styles.dart';

class LocationPreview extends StatelessWidget {
  const LocationPreview({super.key, this.latitude, this.longitude});

  final double? latitude;
  final double? longitude;

  @override
  Widget build(BuildContext context) {
    final hasLocation = latitude != null && longitude != null;
    final point = hasLocation ? gmaps.LatLng(latitude!, longitude!) : null;
    return Container(
      height: 160,
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.border,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: hasLocation
            ? gmaps.GoogleMap(
                initialCameraPosition: gmaps.CameraPosition(target: point!, zoom: 16),
                markers: {
                  gmaps.Marker(
                    markerId: const gmaps.MarkerId('vendor-workplace'),
                    position: point,
                    infoWindow: const gmaps.InfoWindow(title: 'Workplace'),
                  ),
                },
                zoomControlsEnabled: false,
                myLocationButtonEnabled: false,
                liteModeEnabled: true,
              )
            : Stack(
                children: [
                  Container(color: AppColors.border),
                  const Center(child: Icon(LucideIcons.mapPin, color: AppColors.primary, size: 30)),
                  Positioned(
                    left: 9,
                    right: 9,
                    bottom: 9,
                    child: Container(
                      padding: const EdgeInsets.all(9),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.9),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text('Auto-detect your workplace to preview it on Google Maps', style: AppTextStyles.labelSmall.copyWith(color: AppColors.textPrimary)),
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
