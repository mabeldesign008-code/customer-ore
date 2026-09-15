import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:orange_ui/screen/map_screen/map_screen_view_model.dart';
import 'package:orange_ui/screen/map_screen/widgets/map_top_bar_area.dart';
import 'package:orange_ui/utils/color_res.dart';
import 'package:stacked/stacked.dart';

class MapScreen extends StatelessWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ViewModelBuilder<MapScreenViewModel>.reactive(
      onViewModelReady: (model) => model.init(),
      viewModelBuilder: () => MapScreenViewModel(),
      builder: (context, model, child) {
        return Scaffold(
          backgroundColor: ColorRes.white,
          body: Stack(
            children: [
              Visibility(
                visible: true,
                child: SingleChildScrollView(scrollDirection: Axis.vertical, child: Column(children: model.widgets)),
              ),
              SizedBox(
                height: Get.height,
                width: Get.width,
                child: GoogleMap(
                  mapType: MapType.normal,
                  myLocationEnabled: false,
                  onMapCreated: (controller) {
                    model.mapController = controller;
                    model.onMapCreated(controller);
                    model.manager.setMapId(controller.mapId);
                  },
                  mapToolbarEnabled: false,
                  onCameraMove: model.manager.onCameraMove,
                  onCameraIdle: model.manager.updateMap,
                  markers: model.marker,
                  zoomControlsEnabled: false,
                  compassEnabled: false,
                  myLocationButtonEnabled: false,
                  indoorViewEnabled: true,
                  initialCameraPosition: CameraPosition(target: model.center, zoom: 15.4746),
                ),
              ),
              SizedBox(
                height: MediaQuery.of(context).size.height,
                width: MediaQuery.of(context).size.width,
                child: Column(
                  children: [
                    const SizedBox(height: 13),
                    MapTopBarArea(
                      distanceList: model.distanceList,
                      selectedDistance: model.selectedDistance,
                      onDistanceChange: model.onDistanceChange,
                    ),
                    const Spacer(),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
