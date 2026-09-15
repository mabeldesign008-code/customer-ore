import 'package:flutter/material.dart';
import 'package:orange_ui/generated/l10n.dart';

import 'base_select_sheet.dart';
import 'countries_model.dart';
import 'select_country_controller.dart';

class SelectCitySheet extends StatelessWidget {
  final SelectCountryController controller;

  const SelectCitySheet({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return BaseSelectSheet<City>(
      title: S.of(context).city,
      items: controller.filteredCities,
      selectedItem: controller.selectedCity,
      getDisplayText: (city) => city.name,
      onSelect: (city) {
        controller.selectCity(city: city);
      },
      onSearch: controller.searchCity,
    );
  }
}
