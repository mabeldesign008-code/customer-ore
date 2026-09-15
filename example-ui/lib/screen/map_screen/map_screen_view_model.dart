import 'dart:async';
import 'dart:math';
import 'dart:ui';

import 'package:custom_marker/marker_icon.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:google_maps_cluster_manager_2/google_maps_cluster_manager_2.dart'
    as cluster;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:orange_ui/api_provider/api_provider.dart';
import 'package:orange_ui/common/common_ui.dart';
import 'package:orange_ui/common/confirmation_dialog.dart';
import 'package:orange_ui/generated/l10n.dart';
import 'package:orange_ui/model/user/registration_user.dart';
import 'package:orange_ui/screen/map_screen/widgets/custom_marker.dart';
import 'package:orange_ui/screen/map_screen/widgets/user_pop_up.dart';
import 'package:orange_ui/service/session_manager.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:stacked/stacked.dart';

class MapScreenViewModel extends BaseViewModel {
  int selectedDistance = 1;
  List<int> distanceList = [1, 5, 10, 20, 50, 500];
  LatLng center = const LatLng(21.2408, 72.8806);
  List<UserData> userList = [];
  Set<Marker> marker = {};
  List<Place> items = [];
  late GoogleMapController mapController;
  late cluster.ClusterManager manager;
  late Position? position;
  List<Widget> widgets = [];
  Map<String, GlobalKey> globalKey = <String, GlobalKey>{};
  UserData? myUserData = SessionManager.instance.getUser();

  void init() {
    selectedDistance = distanceList.first;
    manager = _initClusterManager();
    if (myUserData != null) {
      String? lat = myUserData?.latitude;
      String? lon = myUserData?.longitude;
      if (lat != null && lon != null) {
        position = Position(
            longitude: double.parse(lon),
            latitude: double.parse(lat),
            timestamp: DateTime.now(),
            accuracy: 0.0,
            altitude: 0.0,
            altitudeAccuracy: 0.0,
            heading: 0.0,
            headingAccuracy: 0.0,
            speed: 0.0,
            speedAccuracy: 0.0);
      }
    }
    notifyListeners();
  }

  cluster.ClusterManager _initClusterManager() {
    return cluster.ClusterManager<Place>(
      items,
      _updateMarkers,
      markerBuilder: _markerBuilder,
      stopClusteringZoom: 17.0,
    );
  }

  void _updateMarkers(Set<Marker> markers) {
    marker = markers;
    notifyListeners();
  }

  void onMapCreated(GoogleMapController controller) async {
    mapController = controller;

    position = await getUserCurrentLocation();
    double? lat = position?.latitude;
    double? long = position?.longitude;
    if (lat != null && long != null) {
      getUserByCoordinatesApiCall(
          latitude: lat, longitude: long, km: selectedDistance);

      center = LatLng(lat, long);
      await controller.animateCamera(CameraUpdate.newCameraPosition(
          CameraPosition(target: center, zoom: 15.09)));
      mapController.animateCamera(CameraUpdate.newLatLng(center));
    }
  }

  void onDistanceChange(int value) async {
    CommonUI.lottieLoader();
    position = await getUserCurrentLocation();
    Get.back();
    double? lat = position?.latitude;
    double? long = position?.longitude;
    if (lat != null && long != null) {
      selectedDistance = value;
      getUserByCoordinatesApiCall(
          latitude: lat, longitude: long, km: selectedDistance);
      mapController.animateCamera(CameraUpdate.newCameraPosition(CameraPosition(
          target: LatLng(lat, long), zoom: getZoomLevel(value.toDouble()))));
    }
  }

  Future<void> getUserByCoordinatesApiCall(
      {required double latitude,
      required double longitude,
      required int km}) async {
    final response = await ApiProvider()
        .getUserByLatLong(latitude: latitude, longitude: longitude, km: km);

    userList = response.data ?? [];

    // Clear previous state
    items = [];
    widgets = [];

    for (int i = 0; i < userList.length; i++) {
      final user = userList[i];
      final imageUrl = user.profileImage;
      final key = imageUrl.isEmpty ? (user.fullname ?? '$i') : imageUrl;
      final globalKey = GlobalKey();

      // Store the key
      this.globalKey[key] = globalKey;

      // Create CustomMarker widget
      widgets.add(CustomMarker(
          imageUrl: imageUrl,
          globalKey: globalKey,
          name: CommonUI.fullName(user.fullname)));

      // Create Place item
      final lat = double.tryParse(user.latitude ?? '') ?? 0.0;
      final lng = double.tryParse(user.longitude ?? '') ?? 0.0;

      items.add(Place(userData: user, latLng: LatLng(lat, lng)));
    }

    manager.setItems(items);
    notifyListeners();
  }

  double getZoomLevel(double radius) {
    double zoomLevel = 11;
    if (radius > 0) {
      double radiusElevated = radius + radius;
      zoomLevel = 16 - log(radiusElevated) / log(2);
    }
    zoomLevel = double.parse(zoomLevel.toStringAsFixed(2));
    return zoomLevel;
  }

  Future<Marker> Function(cluster.Cluster<Place>) get _markerBuilder =>
      (cluster) async {
        return Marker(
            markerId: MarkerId(cluster.getId()),
            position: cluster.location,
            onTap: () {
              for (var user in cluster.items) {
                cluster.isMultiple
                    ? mapController.animateCamera(CameraUpdate.zoomIn())
                    : Get.dialog(UserPopUp(user: user.userData),
                        barrierColor: Colors.transparent);
              }
            },
            icon: await _getMarkerBitmap(
                cluster.isMultiple ? 50 : 80, cluster.items.toList(),
                text: cluster.isMultiple ? cluster.count.toString() : null));
      };

  Future<BitmapDescriptor> _getMarkerBitmap(int size, List<Place> places,
      {String? text}) async {
    final PictureRecorder pictureRecorder = PictureRecorder();
    final Canvas canvas = Canvas(pictureRecorder);
    final Paint paint1 = Paint()..color = ColorRes.themeColor;
    final Paint paint2 = Paint()..color = Colors.white;
    canvas.drawCircle(Offset(size / 2, size / 2), size / 2.0, paint1);
    canvas.drawCircle(Offset(size / 2, size / 2), size / 2.2, paint2);
    canvas.drawCircle(Offset(size / 2, size / 2), size / 2.8, paint1);

    if (text != null) {
      TextPainter painter = TextPainter(textDirection: TextDirection.ltr);
      painter.text = TextSpan(
        text: text,
        style: TextStyle(
            fontSize: size / 3,
            color: Colors.white,
            fontWeight: FontWeight.normal),
      );
      painter.layout();
      painter.paint(canvas,
          Offset(size / 2 - painter.width / 2, size / 2 - painter.height / 2));
    }
    final img = await pictureRecorder.endRecording().toImage(size, size);
    final data = await img.toByteData(format: ImageByteFormat.png) as ByteData;
    if (size == 80) {
      return await MarkerIcon.widgetToIcon(globalKey[
          (places[0].userData?.images ?? []).isEmpty
              ? places[0].userData?.fullname
              : places[0].userData?.profileImage]!);
    }
    return BitmapDescriptor.bytes(data.buffer.asUint8List());
  }

  Future<Position?> getUserCurrentLocation() async {
    LocationPermission permission = await Geolocator.requestPermission();

    // If permission is denied, show confirmation dialog
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      Get.dialog(
        ConfirmationDialog(
          heading: S.current.allowLocationAccess,
          description: S.current.toSeeNearbyProfilesWeNeedAccessToYourLocation,
          dialogSize: 1.5,
          textButton: S.current.allow,
          onTap: () async {
            // Request permission again
            LocationPermission newPermission =
                await Geolocator.requestPermission();

            if (newPermission == LocationPermission.denied ||
                newPermission == LocationPermission.deniedForever) {
              openAppSettings();
            } else {
              Get.back(); // Close dialog
              final position = await Geolocator.getCurrentPosition();
              final lat = position.latitude;
              final lng = position.longitude;
              SessionManager.instance.setLatLng(value: LatLng(lat, lng));

              // Trigger nearby search and map update
              getUserByCoordinatesApiCall(
                  latitude: lat, longitude: lng, km: selectedDistance);
              center = LatLng(lat, lng);

              mapController.animateCamera(
                CameraUpdate.newCameraPosition(
                  CameraPosition(
                    target: LatLng(lat, lng),
                    zoom: getZoomLevel(selectedDistance.toDouble()),
                  ),
                ),
              );
            }
          },
        ),
      );
      return null;
    }

    // Permission granted, get and return position
    Position position = await Geolocator.getCurrentPosition();
    SessionManager.instance
        .setLatLng(value: LatLng(position.latitude, position.longitude));
    debugPrint('Current Position : $position');
    return position;
  }

  @override
  void dispose() {
    mapController.dispose();
    super.dispose();
  }
}

class Place with cluster.ClusterItem {
  final UserData? userData;
  final LatLng latLng;

  Place({
    required this.userData,
    required this.latLng,
  });

  @override
  LatLng get location => latLng;
}
