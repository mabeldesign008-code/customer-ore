import 'package:flutter/material.dart';

import 'base_select_sheet.dart';
import 'countries_model.dart';
import 'select_country_controller.dart';

class SelectCountrySheet extends StatelessWidget {
  final SelectCountryController controller;

  const SelectCountrySheet({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return BaseSelectSheet<Country>(
      title: "Country",
      items: controller.filteredCountries,
      selectedItem: controller.selectedCountry,
      getDisplayText: (country) => country.countryName,
      onSelect: (country) {
        controller.selectCountry(country: country);
      },
      onSearch: controller.searchCountry,
    );
  }
}
