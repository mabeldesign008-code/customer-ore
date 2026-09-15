# Orange Flutter

# Date 23 March 2026

## Summary

- Update multiple Flutter dependencies and Firebase packages
- Implement password visibility toggle in `CustomTextField`
- Refactor chat logic to handle wallet balances, auto-pay, and message confirmation workflows
- Refactor blocked profile unblocking logic to handle API responses and state updates
- Bug Fixed and Improvement

#### Updated Files

- [project.pbxproj](ios/Runner.xcodeproj/project.pbxproj)
- [Podfile.lock](ios/Podfile.lock)
- [custom_text_field.dart](lib/common/custom_text_field.dart)
- [login_setup_view.dart](lib/common/login_setup_view.dart)
- [intl_ar.arb](lib/l10n/intl_ar.arb)
- [intl_da.arb](lib/l10n/intl_da.arb)
- [intl_de.arb](lib/l10n/intl_de.arb)
- [intl_el.arb](lib/l10n/intl_el.arb)
- [intl_en.arb](lib/l10n/intl_en.arb)
- [intl_es.arb](lib/l10n/intl_es.arb)
- [intl_fr.arb](lib/l10n/intl_fr.arb)
- [intl_hi.arb](lib/l10n/intl_hi.arb)
- [intl_id.arb](lib/l10n/intl_id.arb)
- [intl_it.arb](lib/l10n/intl_it.arb)
- [intl_ja.arb](lib/l10n/intl_ja.arb)
- [intl_ko.arb](lib/l10n/intl_ko.arb)
- [intl_nb.arb](lib/l10n/intl_nb.arb)
- [intl_nl.arb](lib/l10n/intl_nl.arb)
- [intl_pl.arb](lib/l10n/intl_pl.arb)
- [intl_pt.arb](lib/l10n/intl_pt.arb)
- [intl_ru.arb](lib/l10n/intl_ru.arb)
- [intl_th.arb](lib/l10n/intl_th.arb)
- [intl_tr.arb](lib/l10n/intl_tr.arb)
- [intl_vi.arb](lib/l10n/intl_vi.arb)
- [intl_zh.arb](lib/l10n/intl_zh.arb)
- [minus_coin_from_wallet.dart](lib/model/wallet/minus_coin_from_wallet.dart)
- [login_screen.dart](lib/screen/auth_screen/login_screen/login_screen.dart)
- [register_view.dart](lib/screen/auth_screen/registration/register_view.dart)
- [login_view.dart](lib/screen/auth_screen/widget/login_view.dart)
- [blocked_card.dart](lib/screen/blocked_profiles_screen/widget/blocked_card.dart)
- [blocked_profiles_screen.dart](lib/screen/blocked_profiles_screen/blocked_profiles_screen.dart)
- [blocked_profiles_screen_view_model.dart](lib/screen/blocked_profiles_screen/blocked_profiles_screen_view_model.dart)
- [image_video_send_sheet.dart](lib/screen/chat_screen/widgets/image_video_send_sheet.dart)
- [item_selection_dialog_android.dart](lib/screen/chat_screen/widgets/item_selection_dialog_android.dart)
- [chat_screen_view_model.dart](lib/screen/chat_screen/chat_screen_view_model.dart)
- [countries_model.dart](lib/screen/countries/countries_model.dart)
- [create_post_screen_view_model.dart](lib/screen/create_post_screen/create_post_screen_view_model.dart)
- [live_grid_screen_view_model.dart](lib/screen/live_grid_screen/live_grid_screen_view_model.dart)
- [firebase_notification_manager.dart](lib/service/firebase_notification_manager.dart)
- [pubspec.lock](pubspec.lock)
- [pubspec.yaml](pubspec.yaml)
- [README.md](README.md)
- [build.gradle](android/app/build.gradle)
- [gradle-wrapper.properties](android/gradle/wrapper/gradle-wrapper.properties)
- [build.gradle](android/build.gradle)
- [gradle.properties](android/gradle.properties)
- [settings.gradle](android/settings.gradle)

#### Added Files

- None

#### Deleted Files

- None

----------------------------------------------------------------------------------------------------

# Date: 5 January 2026

## Summary

- Update pubspec.yaml

#### Updated Files

- pubspec.yaml

#### Added Files

- None

#### Deleted Files

- None

----------------------------------------------------------------------------------------------------

# Date: 10 October 2025

## Summary

- Update [pubspec.yaml](pubspec.yaml)
- Fixed notification naming issue
- We have removed **Branch.io** from the project and implemented our **own deep linking solution**
  following the
  official [Deep Link](https://docs.retrytech.com/shortzz/shortzz_flutter#deeplink_setup).
  ### Why We Removed Branch.io
  Branch.io is significantly more expensive for our use case. By switching to our own deep linking
  system, it will impact buyers to save min. $499 every month. Which makes this move truly impactful
  helping new startups financially.
  ### Current Status
    - Branch.io SDK and configurations have been completely removed.
    - Our own deep linking system is now active and configured as per the official documentation.
    - We request all our existing buyers to make updates in source files (Flutter & Laravel both),
      Make
      database changes & follow the documentation listed above to move to independent Deeplink
      system.

#### Updated Files

- AndroidManifest.xml
- api_provider.dart
- AppDelegate.swift
- AppFrameworkInfo.plist
- auth_screen_view_model.dart
- build.gradle
- comment_sheet_view_model.dart
- const_res.dart
- dashboard_screen_view_model.dart
- explore_screen_view_model.dart
- feed_screen_view_model.dart
- firebase_notification_manager.dart
- full_image_view.dart
- image_view_page.dart
- Info.plist
- l10n.dart
- main.dart
- messages_ar.dart
- messages_da.dart
- messages_de.dart
- messages_el.dart
- messages_en.dart
- messages_es.dart
- messages_fr.dart
- messages_hi.dart
- messages_id.dart
- messages_it.dart
- messages_ja.dart
- messages_ko.dart
- messages_nb.dart
- messages_nl.dart
- messages_pl.dart
- messages_pt.dart
- messages_ru.dart
- messages_th.dart
- messages_tr.dart
- messages_vi.dart
- messages_zh.dart
- Podfile.lock
- post_bottom_bar.dart
- project.pbxproj
- pubspec.yaml
- README.md
- Runner.entitlements
- settings.gradle
- share_manager.dart
- subscription_manager.dart
- urls.dart
- user_detail_screen_view_model.dart

#### Added Files

- logger.dart
- share_manager.dart

----------------------------------------------------------------------------------------------------

# Date: 22 Aug 2025

## Summary

- Explore screen like dislike issue fixed

#### Updated Files

- api_provider.dart
- explore_screen_view_model.dart
- full_image_view.dart

#### Added Files

- None

#### Deleted Files

- None

----------------------------------------------------------------------------------------------------

# Date: 22 Aug 2025

## Summary

- Fixed issue with image deletion
- Resolved minor bugs
- Corrected first image display in image cards

#### Updated Files

- add_photos.dart
- build.gradle
- create_profile_screen_view_model.dart
- custom_image.dart
- edit_profile_screen.dart
- edit_profile_screen_view_model.dart
- explore_screen_view_model.dart
- full_image_view.dart
- image_list_area.dart
- on_boarding_screen.dart
- profile_detail_card.dart
- profile_images_area.dart
- profile_pic_area.dart
- settings.gradle
- your_profile_ready.dart
- base_select_sheet.dart
- bottom_legal_area.dart
- common_fun.dart
- common_ui.dart
- feed_screen.dart
- intl_ar.arb
- intl_da.arb
- intl_de.arb
- intl_el.arb
- intl_en.arb
- intl_es.arb
- intl_fr.arb
- intl_hi.arb
- intl_id.arb
- intl_it.arb
- intl_ja.arb
- intl_ko.arb
- intl_nb.arb
- intl_nl.arb
- intl_pl.arb
- intl_pt.arb
- intl_ru.arb
- intl_th.arb
- intl_tr.arb
- intl_vi.arb
- intl_zh.arb
- options_screen.dart
- options_screen_view_model.dart
- pubspec.yaml

#### Added Files

- None

#### Deleted Files

- None

----------------------------------------------------------------------------------------------------

# Date: 14 Aug 2025

## Summary

- Updated Flutter version warnings
- Updated in-app camera
- Removed CameraPlugin
- Added new UI and features
- Added Subscription

#### Updated Files

- .gitignore
- build.gradle
- const_res.dart
- gradle-wrapper.properties
- README.md
- settings.gradle
- asset_res.dart
- main.dart
- pubspec.yaml
- Runner.xcscheme
- verification_center_area.dart
- add_comment.dart
- admin_notificaiton_page.dart
- AndroidManifest.xml
- api_provider.dart
- app_res.dart
- asset_res.dart
- blocked_card.dart
- blocked_profiles_screen.dart
- blocked_profiles_screen_view_model.dart
- blocked_card.dart
- blocked_profiles_screen.dart
- blocked_profiles_screen_view_model.dart
- bottom_area.dart
- bottom_bottons.dart
- bottom_buttons.dart
- bottom_comment_field.dart
- bottom_diamond_shop.dart
- bottom_input_bar.dart
- bottom_legal_area.dart
- bottom_purchase_shit.dart
- bottom_selected_item_bar.dart
- bottom_text_field.dart
- bottom_text_field.dart
- [build.gradle](android/app/build.gradle)
- camera_preview_screen.dart
- camera_preview_screen_view_model.dart
- center_area_live_stream_history.dart
- center_area_livestream.dart
- center_area_livestream_dashboard.dart
- center_area_redeem_screen.dart
- center_area_submit_redeem_screen.dart
- chat_area.dart
- chat_screen.dart
- chat_screen_view_model.dart
- chat_top_bar_area.dart
- color_res.dart
- comment_card.dart
- comment_list_area.dart
- comment_list_area.dart
- comment_sheet.dart
- comment_sheet_view_model.dart
- common_fun.dart
- common_ui.dart
- confirmation_dialog.dart
- const_res.dart
- creat_post_page.dart
- create_post_screen.dart
- create_post_screen_view_model.dart
- create_post_top_bar_view.dart
- create_story_screen.dart
- create_story_screen_view_model.dart
- custom_box_shadow.dart
- custom_grid_view.dart
- custom_marker.dart
- dashboard_screen.dart
- dashboard_screen_view_model.dart
- dashboard_top_bar.dart
- detail_page.dart
- detectable_text_custom.dart
- doc_type_drop_down.dart
- detail_page.dart
- detectable_text_custom.dart
- doc_type_drop_down.dart
- drop_down_box.dart
- edit_profile_screen.dart
- edit_profile_screen_view_model.dart
- explore_screen.dart
- explore_screen_view_model.dart
- facebook_logo.png
- fade_animation.dart
- feed.dart
- feed_screen.dart
- feed_screen_view_model.dart
- feed_story_bar.dart
- fetch_comment.dart
- fetch_stories.dart
- fetch_user_coordinate.dart
- fetch_users.dart
- firebase_notification_manager.dart
- follow_following_screen.dart
- follow_following_screen_view_model.dart
- follow_user.dart
- font_res.dart
- full_image_view.dart
- full_image_view_shimmer.dart
- get_explore_screen.dart
- gradient_widget.dart
- gradle.properties
- gradle-wrapper.properties
- hashtag_screen.dart
- hashtag_screen_view_model.dart
- ic_eye.png
- ic_feed.png
- image_list_area.dart
- image_post.dart
- image_post_view.dart
- image_selection_area.dart
- image_video_send_sheet.dart
- image_view_page.dart
- Info.plist
- instagram_logo.png
- interest_widget.dart
- intl_ar.arb
- intl_da.arb
- intl_de.arb
- intl_el.arb
- intl_en.arb
- intl_es.arb
- intl_fr.arb
- intl_hi.arb
- intl_id.arb
- intl_it.arb
- intl_ja.arb
- intl_ko.arb
- intl_nb.arb
- intl_nl.arb
- intl_pl.arb
- intl_pt.arb
- intl_ru.arb
- intl_th.arb
- intl_tr.arb
- intl_vi.arb
- intl_zh.arb
- item_selection_dialog_android.dart
- l10n.dart
- language_section.dart
- languages_screen.dart
- languages_screen_view_model.dart
- like_card.dart
- like_profiles_screen.dart
- like_profiles_screen_view_model.dart
- live_grid_screen.dart
- live_grid_screen_view_model.dart
- live_grid_top_area.dart
- live_icon.dart
- live_stream.dart
- live_stream_application_screen.dart
- live_stream_application_screen_view_model.dart
- live_stream_end_dialog.dart
- live_stream_end_sheet.dart
- live_stream_history_screen.dart
- livestream_dashboard_screen.dart
- livestream_dashboard_screen_view_model.dart
- livestream_end_screen.dart
- livestream_end_screen_view_model.dart
- location_search.png
- main.dart
- map_screen.dart
- map_screen_view_model.dart
- map_top_bar_area.dart
- media_sheet.dart
- message_screen.dart
- message_screen_view_model.dart
- notification_screen.dart
- notification_screen_view_model.dart
- on_boarding_screen.dart
- options_center_area.dart
- options_screen.dart
- options_screen_view_model.dart
- person_streaming_screen.dart
- person_streaming_screen_view_model.dart
- person_top_bar_area.dart
- personal_notification.dart
- Podfile
- post_bottom_bar.dart
- post_card.dart
- post_page.dart
- post_screen.dart
- post_screen_view_model.dart
- post_top_area.dart
- profile_detail_card.dart
- profile_images_area.dart
- profile_pic_area.dart
- profile_pic_area.dart
- profile_screen.dart
- profile_screen_view_model.dart
- project.pbxproj
- pubspec.yaml
- random_search_top_bar_area.dart
- random_streaming_screen.dart
- random_streaming_screen_view_model.dart
- randoms_screen.dart
- randoms_screen_view_model.dart
- randoms_search_screen.dart
- randoms_search_screen_view_model.dart
- randon_stream_top_bar_area.dart
- README.md
- redeem_screen.dart
- redeem_screen_view_model.dart
- registration_user.dart
- report_card.dart
- report_sheet.dart
- restart_app.dart
- reverse_swipe_dialog.dart
- round_icon_button.dart
- saved_card.dart
- saved_profiles_screen.dart
- saved_profiles_screen_view_model.dart
- search_bar_area.dart
- search_screen.dart
- search_screen_view_model.dart
- search_user.dart
- search_user_by_id.dart
- setting_model.dart
- settings.gradle
- shimmer_screen.dart
- single_post_screen.dart
- social_icon.dart
- starting_profile_top_text.dart
- story_view.dart
- story_view_screen.dart
- story_view_screen_view_model.dart
- style_res.dart
- submit_redeem_screen.dart
- submit_redeem_screen_view_model.dart
- suggest_photo_tap_view.dart
- swipe_right_view.dart
- text_post.dart
- tick_mark.png
- top_bar.dart
- top_bar_area.dart
- top_story_line.dart
- urls.dart
- user_card.dart
- user_detail_screen.dart
- user_detail_screen_view_model.dart
- user_list.dart
- user_notification.dart
- user_pop_up.dart
- verification.dart
- verification_center_area.dart
- verification_screen.dart
- verification_screen_view_model.dart
- video_post.dart
- video_post_view.dart
- video_preview_screen.dart
- video_preview_screen_view_model.dart
- video_upload_dialog.dart
- webview_screen.dart
- youtube_logo.png
- webview_screen.dart
- webview_screen_view_model.dart

#### Added Files

- ic_back.png
- ic_calender.png
- ic_check.png
- ic_email.png
- ic_email1.png
- ic_explore.png
- ic_filter.png
- ic_hide.png
- ic_location_permission.png
- ic_lock.png
- ic_match.png
- ic_media1.png
- ic_message.png
- ic_preference.png
- ic_profile.png
- ic_profile_user.png
- ic_random.png
- ic_right_arrow.png
- ic_stop_hand.png
- empty_find_match.png
- ic_mask.png
- login_background.png
- custom_icon_button.dart
- image1.png
- on_boarding_screen.dart
- add_photos.dart
- auth_screen.dart
- auth_screen_view_model.dart
- base_select_sheet.dart
- border_icon_button.dart
- border_text_card.dart
- bottom_diamond_shop_model.dart
- bouncing_heart.dart
- choose_religion.dart
- circle_painter.dart
- cities.csv
- countries.csv
- countries_model.dart
- create_profile_screen.dart
- create_profile_screen_view_model.dart
- custom_banner_ads.dart
- custom_border.dart
- custom_bottom_shape.dart
- custom_drop_down.dart
- custom_icon_button.dart
- custom_image.dart
- custom_text_button.dart
- custom_text_field.dart
- datetime_extention.dart
- dominant_color.dart
- eligibility_status_card.dart
- empty_find_match.dart
- error_text_widget.dart
- eula_sheet.dart
- filter_profile_model.dart
- filter_sheet.dart
- find_match_profile.dart
- find_match_profile_view_model.dart
- find_matches.dart
- follow_state_section.dart
- forget_password_view.dart
- fullname_with_age.dart
- Gilroy-HeavyItalic.ttf
- gradient_border.dart
- gradient_icon.dart
- hidden_profile_screen.dart
- hidden_profile_screen_view_model.dart
- hide_more_info_button.dart
- int_extention.dart
- list_extension.dart
- location_sheet.dart
- login_screen.dart
- login_setup_view.dart
- login_view.dart
- my_selective_field.dart
- on_boarding_screen_view_model.dart
- place_detail.dart
- preference_screen.dart
- preference_screen_view_model.dart
- privacy_policy_text.dart
- register_view.dart
- relationship_goal.dart
- ripple_animation.dart
- screenshot_manager.dart
- select_city_sheet.dart
- select_country_controller.dart
- select_country_sheet.dart
- select_interest.dart
- select_languages.dart
- select_state_sheet.dart
- session_manager.dart
- splash_screen.dart
- splash_screen_view_model.dart
- states.csv
- string_extention.dart
- subscribe_card.dart
- subscription_button.dart
- subscription_manager.dart
- subscription_sheet.dart
- subscription_sheet_controller.dart
- text_fields_area.dart
- text_with_arrow_card.dart
- your_are_pro_member.dart
- your_matching_sheet.dart
- your_profile_ready.dart
- user_notification_model.dart
- ic_language.png

#### Deleted Files

Note : Delete CameraPlugin Folder

- auth_card.dart
- bottom_bar.dart
- bottom_diamond_shop_view_model.dart
- bottom_info_field.dart
- bottom_selection_list.dart
- buttons.dart
- custom_icon_button.dart
- eula_sheet.dart
- forgot_password.dart
- full_image_view.dart
- get_interest.dart
- get_profile.dart
- get_started_screen.dart
- get_started_screen_view_model.dart
- hobbies_clips.dart
- ic_blue_tick.png
- interest_list.dart
- item_selection_dialog_ios.dart
- login_dashboard_screen.dart
- login_dashboard_screen_view_model.dart
- login_pwd_screen.dart
- login_pwd_screen_view_model.dart
- on_off_anonymous.dart
- on_off_notification.dart
- on_off_show_me_map.dart
- password_card.dart
- pref_res.dart
- pref_service.dart
- register_card.dart
- register_screen.dart
- register_screen_view_model.dart
- screen1.dart
- screen2.dart
- screen3.dart
- screen4.dart
- select_hobbies_screen.dart
- select_hobbies_screen_view_model.dart
- select_photo_screen.dart
- select_photo_screen_view_model.dart
- starting_profile_screen.dart
- starting_profile_screen_view_model.dart
- text_field_controller.dart
- text_fields_area.dart
- text_fields_area.dart
- top_card_area.dart
- unblock_user_dialog.dart
- update_saved_profile.dart
- user_block_list.dart
- language_section.dart

----------------------------------------------------------------------------------------------------


----------------------------------------------------------------------------------------------------

# Date: 04 March 2025

## Summary

- Update Flutter Version warnings
- CoinIcon add AppRes file (You can change the coin icon)
- update `pubspec.yaml`
- Change library `flutter_app_badge` to [app_badge_plus](https://pub.dev/packages/app_badge_plus)

## Updated Files

- android/
  - app/
    - build.gradle
  - build.gradle
  - gradle.properties
  - settings.gradle
  - gradle/wrapper/
    - gradle-wrapper.properties
  - AndroidManifest.xml

- ios/
  - Info.plist

- lib/
  - screen1.dart
  - screen2.dart
  - auth_card.dart
  - blocked_card.dart
  - register_card.dart
  - verification_center_area.dart
  - edit_profile_screen.dart
  - profile_detail_card.dart
  - profile_images_area.dart
  - profile_pic_area.dart
  - livestream_end_screen.dart
  - person_streaming_screen_view_model.dart
  - random_stream_top_bar_area.dart
  - center_area_livestream.dart
  - live_grid_top_area.dart
  - randon_stream_top_bar_area.dart
  - explore_screen.dart
  - explore_screen_view_model.dart
  - chat_screen.dart
  - chat_screen_view_model.dart
  - chat_area.dart
  - chat_top_bar_area.dart
  - search_screen.dart
  - search_screen_view_model.dart
  - dashboard_screen_view_model.dart
  - detail_page.dart
  - saved_card.dart
  - video_post.dart
  - video_post_view.dart
  - video_preview_screen.dart
  - image_post.dart
  - image_post_view.dart
  - image_list_area.dart
  - image_selection_area.dart
  - full_image_view.dart
  - full_image_view_shimmer.dart
  - bottom_bar.dart
  - bottom_buttons.dart
  - bottom_diamond_shop.dart
  - bottom_purchase_sheet.dart
  - bottom_selection_list.dart
  - bottom_input_bar.dart
  - bottom_text_field.dart
  - drop_down_box.dart
  - doc_type_drop_down.dart
  - dashboard_top_bar.dart
  - top_bar.dart
  - top_story_line.dart
  - comment_list_area.dart
  - options_center_area.dart
  - password_card.dart
  - user_pop_up.dart
  - search_bar_area.dart
  - suggest_photo_tap_view.dart
  - swipe_right_view.dart
  - api_provider.dart
  - firebase_notification_manager.dart
  - create_post_screen_view_model.dart
  - create_story_screen_view_model.dart
  - live_stream_application_screen_view_model.dart
  - user_detail_screen_view_model.dart
  - app_res.dart
  - main.dart
  - pubspec.yaml
  - my_app.dart
  - settings.gradle

#### Added Files

- like_model.dart

#### Deleted Files

- MyApplication.kt

----------------------------------------------------------------------------------------------------

# Date: 11 November 2024

## Summary

- Fixed cluster bug in Google Maps
- Add functionality in the Edit Profile section for setting gender preference and age preference.
- UI bug fixes and Removed unused code
- Resolved issues with live streaming code

#### Updated Files

- api_provider.dart
- app_res.dart
- asset_res.dart
- bottom_buttons.dart
- bottom_diamond_shop.dart
- bottom_diamond_shop_view_model.dart
- bottom_purchase_shit.dart
- bottom_text_field.dart
- center_area_live_stream_history.dart
- center_area_livestream.dart
- center_area_livestream_dashboard.dart
- center_area_redeem_screen.dart
- center_area_submit_redeem_screen.dart
- chat_screen_view_model.dart
- color_res.dart
- comment_list_area.dart
- comment_sheet_view_model.dart
- common_ui.dart
- const_res.dart
- create_post_screen_view_model.dart
- create_story_screen.dart
- create_story_screen_view_model.dart
- custom_marker.dart
- edit_profile_screen.dart
- edit_profile_screen_view_model.dart
- firebase_notification_manager.dart
- follow_following_screen_view_model.dart
- full_image_view.dart
- hashtag_screen_view_model.dart
- ic_location_pin.png
- image_post_view.dart
- interest_list.dart
- intl_ar.arb
- intl_da.arb
- intl_de.arb
- intl_el.arb
- intl_en.arb
- intl_es.arb
- intl_fr.arb
- intl_hi.arb
- intl_id.arb
- intl_it.arb
- intl_ja.arb
- intl_ko.arb
- intl_nb.arb
- intl_nl.arb
- intl_pl.arb
- intl_pt.arb
- intl_ru.arb
- intl_th.arb
- intl_tr.arb
- intl_vi.arb
- intl_zh.arb
- live_grid_screen_view_model.dart
- live_stream_application_screen.dart
- live_stream_application_screen_view_model.dart
- livestream_dashboard_screen_view_model.dart
- login_dashboard_screen_view_model.dart
- map_screen.dart
- map_screen_view_model.dart
- options_screen.dart
- person_streaming_screen.dart
- person_streaming_screen_view_model.dart
- post_screen_view_model.dart
- pubspec.yaml
- random_streaming_screen.dart
- random_streaming_screen_view_model.dart
- redeem_screen.dart
- register_card.dart
- register_screen.dart
- registration_user.dart
- select_photo_screen_view_model.dart
- speaker_off.png
- speaker_on.png
- submit_redeem_screen_view_model.dart
- text_fields_area.dart
- urls.dart
- user_detail_screen_view_model.dart
- user_pop_up.dart

#### Added Files

- None

#### Deleted Files

- person_location_pin.png

----------------------------------------------------------------------------------------------------

# Date: 28 October 2024

## Summary

- Added video capture feature in chat
- Fixed swipe bug on the Explore screen
- General bug fixes and improvements

#### Updated Files

- [analysis_options.yaml](analysis_options.yaml)
- [AndroidManifest.xml](android/app/src/main/AndroidManifest.xml)
- [build.gradle](android/app/build.gradle)
- main.dart
- color_res.dart
- common_ui.dart
- bottom_bottons.dart
- confirmation_dialog.dart
- const_res.dart
- full_image_view.dart
- options_center_area.dart
- options_screen.dart
- options_screen_view_model.dart
- pref_service.dart
- profile_pic_area.dart
- registration_user.dart
- reverse_swipe_dialog.dart
- search_screen.dart
- search_screen_view_model.dart
- social_icon.dart
- user_detail_screen_view_model.dart
- center_area_livestream_dashboard.dart
- common_fun.dart
- dashboard_screen_view_model.dart
- feed_screen_view_model.dart
- like_profiles_screen_view_model.dart
- live_grid_screen.dart
- live_grid_screen_view_model.dart
- livestream_dashboard_screen.dart
- livestream_dashboard_screen_view_model.dart
- message_screen_view_model.dart
- profile_images_area.dart
- profile_pic_area.dart
- profile_screen.dart
- profile_screen_view_model.dart
- randoms_screen.dart
- randoms_screen_view_model.dart
- saved_profiles_screen_view_model.dart
- add_comment.dart
- asset_res.dart
- bottom_input_bar.dart
- chat_area.dart
- chat_screen.dart
- chat_screen_view_model.dart
- comment_sheet_view_model.dart
- detail_page.dart
- explore_screen_view_model.dart
- firebase_notification_manager.dart
- follow_following_screen.dart
- image_video_send_sheet.dart
- item_selection_dialog_android.dart
- like_card.dart
- like_profiles_screen.dart
- login_dashboard_screen_view_model.dart
- api_provider.dart
- intl_ar.arb
- intl_da.arb
- intl_de.arb
- intl_el.arb
- intl_es.arb
- intl_fr.arb
- intl_hi.arb
- intl_id.arb
- intl_it.arb
- intl_ja.arb
- intl_ko.arb
- intl_nb.arb
- intl_nl.arb
- intl_pl.arb
- intl_pt.arb
- intl_ru.arb
- intl_th.arb
- intl_tr.arb
- intl_vi.arb
- intl_zh.arb

#### Added Files

- None

#### Deleted Files

- None

----------------------------------------------------------------------------------------------------

# Date: 15 October 2024

## Summary

- `Explore Screen` UI Change
- Live Streaming bug fixed
- Bug Fixed and improve code
- `pubspec.yaml` update

#### Updated Files

- [Info.plist](ios/Runner/Info.plist)
- [const_res.dart](lib/utils/const_res.dart)
- [app_res.dart](lib/utils/app_res.dart)
- [asset_res.dart](lib/utils/asset_res.dart)
- [pubspec.yaml](pubspec.yaml)
- intl_ar.arb
- intl_da.arb
- intl_de.arb
- intl_el.arb
- intl_en.arb
- intl_es.arb
- intl_fr.arb
- intl_hi.arb
- intl_id.arb
- intl_it.arb
- intl_ja.arb
- intl_ko.arb
- intl_nb.arb
- intl_nl.arb
- intl_pl.arb
- intl_pt.arb
- intl_ru.arb
- intl_th.arb
- intl_tr.arb
- intl_vi.arb
- intl_zh.arb
- random_streaming_screen_view_model.dart
- bottom_info_field.dart
- login_pwd_screen_view_model.dart
- select_hobbies_screen_view_model.dart
- select_photo_screen.dart
- select_photo_screen_view_model.dart
- starting_profile_screen.dart
- starting_profile_screen_view_model.dart
- starting_profile_top_text.dart
- api_provider.dart
- bottom_bar.dart
- dashboard_screen_view_model.dart
- explore_screen_view_model
- swipe_right_view.dart
- pref_res.dart
- pref_service.dart
- swipe_right_view.dart
- profile_images_area.dart
- profile_pic_area.dart
- top_story_line.dart
- api_provider.dart
- bottom_bottons.dart
- chat_screen_view_model.dart
- comment_list_area.dart
- common_fun.dart
- detail_page.dart
- edit_profile_screen.dart
- explore_screen.dart
- explore_screen_view_model.dart
- firebase_notification_manager.dart
- full_image_view.dart
- get_started_screen_view_model.dart
- image_selection_area.dart
- login_dashboard_screen_view_model.dart
- options_screen_view_model.dart
- person_streaming_screen_view_model.dart
- person_top_bar_area.dart
- register_card.dart
- register_screen_view_model.dart
- registration_user.dart
- report_card.dart
- suggest_photo_tap_view.dart
- text_fields_area.dart
- top_bar.dart
- user_detail_screen.dart
- user_detail_screen_view_model.dart

#### Added Files

- ic_close.png
- ic_like.png
- ic_nope.png
- ic_reverse.png
- ic_left_tap.png
- ic_right_tap.png
- ic_swipe_right.png

#### Deleted Files

- None

----------------------------------------------------------------------------------------------------

# Date: 02 October 2024

## Summary

- Replace code `.withValues(alpha:` to `.withValues(alpha: `
- Update pubspec.yaml

#### Updated Files

- [AndroidManifest.xml](android/app/src/main/AndroidManifest.xml)
- [Info.plist](ios/Runner/Info.plist)
- [pubspec.yaml](pubspec.yaml)
- auth_card.dart
- blocked_card.dart
- bottom_area.dart
- bottom_bar.dart
- bottom_bottons.dart
- bottom_buttons.dart
- bottom_diamond_shop.dart
- bottom_purchase_shit.dart
- bottom_selection_list.dart
- bottom_text_field.dart
- bottom_text_field.dart
- camera_preview_screen.dart
- center_area_livestream.dart
- center_area_livestream_dashboard.dart
- center_area_redeem_screen.dart
- chat_area.dart
- comment_list_area.dart
- comment_list_area.dart
- common_ui.dart
- create_story_screen.dart
- custom_grid_view.dart
- dashboard_top_bar.dart
- detail_page.dart
- doc_type_drop_down.dart
- drop_down_box.dart
- full_image_view.dart
- full_image_view.dart
- full_image_view_shimmer.dart
- get_started_screen.dart
- hobbies_clips.dart
- image_list_area.dart
- image_post.dart
- image_post_view.dart
- image_selection_area.dart
- image_view_page.dart
- live_grid_top_area.dart
- live_stream_end_sheet.dart
- livestream_end_screen.dart
- login_dashboard_screen.dart
- map_top_bar_area.dart
- options_center_area.dart
- password_card.dart
- person_streaming_screen_view_model.dart
- person_top_bar_area.dart
- profile_detail_card.dart
- profile_images_area.dart
- profile_pic_area.dart
- profile_pic_area.dart
- random_search_top_bar_area.dart
- randon_stream_top_bar_area.dart
- register_card.dart
- report_card.dart
- saved_card.dart
- screen1.dart
- screen2.dart
- search_bar_area.dart
- story_view.dart
- story_view_screen.dart
- text_fields_area.dart
- top_bar.dart
- top_bar_area.dart
- top_story_line.dart
- user_detail_screen.dart
- user_pop_up.dart
- verification_center_area.dart
- video_post.dart
- video_post_view.dart
- video_preview_screen.dart

#### Added Files

None

#### Deleted Files

[//]: # (Delete the `retytech` folder :- android/app/src/main/kotlin)

- MainActivity.kt
- MainActivity.kt

----------------------------------------------------------------------------------------------------

# Date: 24 september 2024

## Summary

- Fixed Notification
- Remove `flutter_app_badger` Library
- Add `flutter_app_badge: ^2.0.2`

#### Updated Files

- [pubspec.yaml](pubspec.yaml)
- get_started_screen_view_model.dart
- login_dashboard_screen_view_model.dart
- login_pwd_screen_view_model.dart
- main.dart
- notification_screen_view_model.dart
- register_screen_view_model.dart
- dashboard_screen_view_model.dart

#### Added Files

- firebase_notification_manager.dart

#### Deleted Files

None

----------------------------------------------------------------------------------------------------

# Date: 20 september 2024

## Summary

- Update [pubspec.yaml](pubspec.yaml)
- Remove [figma_squircle: ^0.5.3](https://pub.dev/packages/figma_squircle)
- Deprecated function remove

#### Updated Files

- add_live_stream_history.dart
- admin_notification.dart
- apply_for_live.dart
- auth_card.dart
- blocked_card.dart
- bottom_area.dart
- bottom_bar.dart
- bottom_bottons.dart
- bottom_buttons.dart
- bottom_comment_field.dart
- bottom_diamond_shop.dart
- bottom_purchase_shit.dart
- bottom_selection_list.dart
- bottom_text_field.dart
- bottom_text_field.dart
- [build.gradle](android/app/build.gradle)
- [build.gradle](android/build.gradle)
- camera_preview_screen.dart
- center_area_livestream.dart
- center_area_livestream_dashboard.dart
- center_area_redeem_screen.dart
- chat_area.dart
- chat_screen_view_model.dart
- comment_card.dart
- comment_list_area.dart
- comment_list_area.dart
- comment_sheet.dart
- common_ui.dart
- creat_post_page.dart
- create_post_screen_view_model.dart
- create_post_top_bar_view.dart
- create_story_screen.dart
- custom_grid_view.dart
- dashboard_top_bar.dart
- delete_account.dart
- detail_page.dart
- doc_type_drop_down.dart
- drop_down_box.dart
- feed_screen.dart
- feed_screen_view_model.dart
- feed_story_bar.dart
- fetch_live_stream_history.dart
- follow_following_screen.dart
- full_image_view.dart
- full_image_view.dart
- full_image_view_shimmer.dart
- get_diamond_pack.dart
- get_package.dart
- get_started_screen_view_model.dart
- hobbies_clips.dart
- image_list_area.dart
- image_post.dart
- image_post_view.dart
- image_selection_area.dart
- image_view_page.dart
- [Info.plist](ios/Runner/Info.plist)
- interest_widget.dart
- like_profiles_screen_view_model.dart
- live_grid_top_area.dart
- live_stream_end_sheet.dart
- livestream_end_screen.dart
- map_screen_view_model.dart
- map_top_bar_area.dart
- media_sheet.dart
- minus_coin_from_wallet.dart
- options_center_area.dart
- password_card.dart
- person_streaming_screen_view_model.dart
- person_top_bar_area.dart
- place_redeem_request.dart
- post_top_area.dart
- profile_detail_card.dart
- profile_images_area.dart
- profile_pic_area.dart
- profile_pic_area.dart
- [pubspec.yaml](pubspec.yaml)
- random_search_top_bar_area.dart
- randon_stream_top_bar_area.dart
- register_card.dart
- report.dart
- report_card.dart
- [Runner.entitlements](ios/Runner/Runner.entitlements)
- saved_card.dart
- screen1.dart
- screen2.dart
- search_bar_area.dart
- settings.gradle
- store_file_give_path.dart
- story_view.dart
- story_view_screen.dart
- text_fields_area.dart
- top_bar.dart
- top_bar_area.dart
- top_story_line.dart
- user_detail_screen.dart
- user_pop_up.dart
- verification_center_area.dart
- video_post.dart
- video_post_view.dart
- video_preview_screen.dart

#### Added Files

None

#### Deleted Files

None

----------------------------------------------------------------------------------------------------

# Date: 27 June 2024

## Summary

- Create post Textfield na Post Limit length null ave to unlimited Length

#### Updated Files

- main.dart
- creat_post_page.dart
- create_story_screen.dart
- intl_ar.arb
- intl_da.arb
- intl_de.arb
- intl_el.arb
- intl_en.arb
- intl_es.arb
- intl_fr.arb
- intl_hi.arb
- intl_id.arb
- intl_it.arb
- intl_ja.arb
- intl_ko.arb
- intl_nb.arb
- intl_nl.arb
- intl_pl.arb
- intl_pt.arb
- intl_ru.arb
- intl_th.arb
- intl_tr.arb
- intl_vi.arb
- intl_zh.arb

#### Added Files

None

#### Deleted Files

None

----------------------------------------------------------------------------------------------------

# Date: 27 June 2024

## Summary

- Profile Place Holder error widget Issue Fixed

#### Updated Files

- common_ui.dart
- Podfile.lock
- pubspec.lock

#### Added Files

None

#### Deleted Files

None

----------------------------------------------------------------------------------------------------

# Date: 17 June 2024

## Summary

- Test Google Ads Fixed

#### Updated Files

- [build.gradle](android/app/build.gradle)
- [settings.gradle](android/settings.gradle)
- main.dart
- ads_service.dart
- explore_screen_view_model.dart
- google-services.json
- gradle-wrapper.properties
- live_grid_screen_view_model.dart
- livestream_dashboard_screen_view_model.dart
- message_screen_view_model.dart
- randoms_screen_view_model.dart
- search_screen_view_model.dart
- submit_redeem_screen_view_model.dart
- user_detail_screen_view_model.dart

#### Added Files

None

#### Deleted Files

None

----------------------------------------------------------------------------------------------------

# Date: 13 June 2024

## Summary

- Timer Cancel When One Minutes Complete (Live streaming issue)
- wakelock change To wakelock_plus Library Add
- Remove UnUsed Color Code
- Story read to border not change
- Agora Library Update
- Admin has set post description and image limit

#### Updated Files

- api_provider.dart
- gradle.properties
- build.gradle
- asset_res.dart
- pubspec.lock
- pubspec.yaml
- Podfile
- settings.gradle
- urls.dart
- user_detail_screen_view_model.dart
- random_streaming_screen.dart
- random_streaming_screen_view_model.dart
- live_grid_screen_view_model.dart
- live_stream.dart
- livestream_end_screen_view_model.dart
- messages_en.dart
- person_streaming_screen.dart
- person_streaming_screen_view_model.dart
- person_top_bar_area.dart
- admin_notificaiton_page.dart
- auth_card.dart
- blocked_card.dart
- blocked_profiles_screen.dart
- bottom_area.dart
- bottom_bar.dart
- bottom_bottons.dart
- bottom_buttons.dart
- bottom_comment_field.dart
- bottom_diamond_shop.dart
- bottom_info_field.dart
- bottom_input_bar.dart
- live_icon.dart
- create_story_screen.dart
- create_story_screen_view_model.dart
- dashboard_top_bar.dart
- feed_screen.dart
- feed_screen_view_model.dart
- feed_story_bar.dart
- full_image_view.dart
- hashtag_screen.dart
- hashtag_screen_view_model.dart
- bottom_legal_area.dart
- bottom_purchase_shit.dart
- bottom_selected_item_bar.dart
- media_sheet.dart
- options_center_area.dart
- post_card.dart
- post_screen.dart
- post_screen_view_model.dart
- profile_images_area.dart
- bottom_selection_list.dart
- bottom_text_field.dart
- buttons.dart
- camera_screen.dart
- center_area_live_stream_history.dart
- center_area_livestream.dart
- center_area_livestream_dashboard.dart
- center_area_redeem_screen.dart
- center_area_submit_redeem_screen.dart
- chat_area.dart
- chat_screen.dart
- chat_top_bar_area.dart
- color_res.dart
- comment_card.dart
- comment_list_area.dart
- comment_sheet.dart
- comment_sheet_view_model.dart
- confirmation_dialog.dart
- creat_post_page.dart
- create_post_screen_view_model.dart
- create_post_top_bar_view.dart
- detail_page.dart
- detectable_text_custom.dart
- doc_type_drop_down.dart
- drop_down_box.dart
- eula_sheet.dart
- follow_following_screen.dart
- forgot_password.dart
- gradient_widget.dart
- hobbies_clips.dart
- registration_user.dart
- image_list_area.dart
- image_selection_area.dart
- image_video_msg_sheet.dart
- interest_list.dart
- language_section.dart
- languages_screen.dart
- like_card.dart
- like_profiles_screen.dart
- live_grid_top_area.dart
- live_stream_end_dialog.dart
- live_stream_end_sheet.dart
- livestream_end_screen.dart
- main.dart
- map_screen_view_model.dart
- map_top_bar_area.dart
- message_screen.dart
- notification_screen.dart
- password_card.dart
- person_top_bar_area.dart
- personal_notification.dart
- post_bottom_bar.dart
- post_top_area.dart
- random_search_top_bar_area.dart
- randoms_search_screen.dart
- randon_stream_top_bar_area.dart
- register_card.dart
- report_card.dart
- reverse_swipe_dialog.dart
- saved_card.dart
- saved_profiles_screen.dart
- screen1.dart
- search_bar_area.dart
- single_post_screen.dart
- starting_profile_top_text.dart
- story_view_screen.dart
- style_res.dart
- text_fields_area.dart
- top_bar.dart
- top_bar_area.dart
- unblock_user_dialog.dart
- user_card.dart
- user_list.dart
- user_pop_up.dart
- story_view.dart
- story_view_screen_view_model.dart
- verification_center_area.dart
- video_post.dart
- video_upload_dialog.dart
- comment_list_area.dart
- comment_list_area.dart
- common_ui.dart
- const_res.dart
- create_story_screen.dart
- create_story_screen_view_model.dart
- custom_grid_view.dart
- follow_following_screen_view_model.dart
- image_post_view.dart
- like_profiles_screen_view_model.dart
- login_dashboard_screen_view_model.dart
- setting.dart
- video_preview_screen.dart
- intl_ar.arb
- intl_da.arb
- intl_de.arb
- intl_el.arb
- intl_en.arb
- intl_es.arb
- intl_fr.arb
- intl_hi.arb
- intl_id.arb
- intl_it.arb
- intl_ja.arb
- intl_ko.arb
- intl_nb.arb
- intl_nl.arb
- intl_pl.arb
- intl_pt.arb
- intl_ru.arb
- intl_th.arb
- intl_tr.arb
- intl_vi.arb
- intl_zh.arb

#### Added Files

- view_story.dart
- generate_token.dart

#### Deleted Files

- delete_dialog.dart
- blue_heart.png
- ic_heart.png
- ic_image.jpg
- image1.jpeg
- image2.jpeg
- image3.jpeg
- image4.jpeg
- light_pink_heart.png
- like.png
- marker_bg.png
- pink_heart.png

----------------------------------------------------------------------------------------------------

# Date: 01 May 2024

## Summary

- Add Social Media Part

#### Added Files

- ic_bin.png
- ic_pause.png
- logout.png
- ic_comment.png
- ic_eye.png
- ic_feed.png
- ic_horizontal_three_dot.png
- ic_play.png
- ic_post_share.png
- ic_fav.png
- ic_fill_fav.png
- ic_live.png
- ic_photo.png
- ic_post_icon.png
- ic_video.png
- ic_camera_flip.png
- ic_eye_black.png
- ic_media.png
- ic_post_placeholder.png
- image1.jpeg
- image2.jpeg
- image3.jpeg
- image4.jpeg
- ic_black_bg_shadow.png
- story_controller.dart
- story_image.dart
- story_video.dart
- story_view.dart
- story_view.dart
- utils.dart
- add_comment.dart
- add_post.dart
- delete_comment.dart
- delete_post.dart
- fetch_comment.dart
- fetch_post_by_user.dart
- like_post.dart
- fetch_stories.dart
- feed.dart
- user_notification.dart
- common_ui.dart
- detectable_text_custom.dart
- feed_story_bar.dart
- feed_screen.dart
- feed_screen_view_model.dart
- custom_marker.dart
- camera_preview_screen.dart
- camera_preview_screen_view_model.dart
- media_sheet.dart
- camera_screen.dart
- camera_screen_view_model.dart
- story_view_screen.dart
- story_view_screen_view_model.dart
- follow_following_screen.dart
- follow_following_screen_view_model.dart
- hashtag_screen.dart
- hashtag_screen_view_model.dart
- creat_post_page.dart
- post_page.dart
- create_post_top_bar_view.dart
- image_post_view.dart
- interest_widget.dart
- video_post_view.dart
- create_post_screen.dart
- create_post_screen_view_model.dart
- single_post_screen.dart
- text_fields_area.dart
- starting_profile_screen.dart
- starting_profile_screen_view_model.dart
- center_area_submit_redeem_screen.dart
- submit_redeem_screen.dart
- submit_redeem_screen_view_model.dart
- image_post.dart
- post_bottom_bar.dart
- post_card.dart
- text_post.dart
- video_post.dart
- post_top_area.dart
- post_screen.dart
- post_screen_view_model.dart
- live_stream_application_screen_view_model.dart
- pref_service.dart
- style_res.dart
- asset_res.dart
- const_res.dart
- pref_res.dart
- urls.dart
- image1.jpeg
- image2.jpeg
- image3.jpeg
- image4.jpeg
- ic_black_bg_shadow.png
- story_controller.dart
- story_image.dart
- story_video.dart
- story_view.dart
- story_view.dart
- utils.dart
- add_comment.dart
- add_post.dart
- delete_comment.dart
- delete_post.dart
- fetch_comment.dart
- fetch_post_by_user.dart
- like_post.dart
- fetch_stories.dart
- feed.dart
- user_notification.dart
- common_ui.dart
- detectable_text_custom.dart
- feed_story_bar.dart
- feed_screen.dart
- feed_screen_view_model.dart
- custom_marker.dart
- camera_preview_screen.dart
- camera_preview_screen_view_model.dart
- media_sheet.dart
- camera_screen.dart
- camera_screen_view_model.dart
- story_view_screen.dart
- story_view_screen_view_model.dart
- follow_following_screen.dart
- follow_following_screen_view_model.dart
- hashtag_screen.dart
- hashtag_screen_view_model.dart
- creat_post_page.dart
- post_page.dart
- create_post_top_bar_view.dart
- image_post_view.dart
- interest_widget.dart
- video_post_view.dart
- create_post_screen.dart
- create_post_screen_view_model.dart
- single_post_screen.dart
- text_fields_area.dart
- starting_profile_screen.dart
- starting_profile_screen_view_model.dart
- center_area_submit_redeem_screen.dart
- submit_redeem_screen.dart
- submit_redeem_screen_view_model.dart
- image_post.dart
- post_bottom_bar.dart
- post_card.dart
- text_post.dart
- video_post.dart
- post_top_area.dart
- post_screen.dart
- post_screen_view_model.dart
- live_stream_application_screen_view_model.dart
- pref_service.dart
- style_res.dart
- asset_res.dart
- const_res.dart
- pref_res.dart
- urls.dart

#### Removed Files

- arrow_down.png
- block_user.png
- join_lives.png
- purple_heart.png
- red_heart1.png
- red_heart2.png
- red_heart3.png
- red_heart4.png
- red_heart5.png
- red_heart6.png
- yellow_heart.png
- live1.png
- live2.png
- live3.png
- custom_marker.dart
- dashed_rect.dart
- loader.dart
- random_top_bar_area.dart
- profile_top_area.dart
- message_top_area.dart
- explore_top_area.dart
- chat_delete_dialog.dart
- add-image.png
- chat_iamge.png
- heart.png
- map.png
- map4.png
- marker1.png
- marker2.png
- marker3.png
- marker4.png
- marker5.png
- notification_image.png
- options_image2.png
- orange_banner.png
- p1.jpg
- p2.jpg
- p3.jpg
- premium_crown.png
- profile1.png
- profile2.png
- profile3.png
- profile4.png
- profile5.png
- profile6.png
- profile7.jpg
- profile8.jpg
- profile9.png
- profile10.png
- profile11.png
- profile12.png
- profile13.png
- profile14.png
- profile15.png
- profile16.png
- profile17.png
- profile18.png
- profile19.png
- profile20.png
- profile21.png
- profile22.png
- profile23.png
- profile24.png
- profile25.png
- profile26.png
- profile27.png
- profile28.png
- profile29.png
- profile30.png
- user_pick1.png

#### Updated Files

main.dart
registration_user.dart
setting.dart
api_provider.dart
dashboard_top_bar.dart
map_top_bar_area.dart
user_pop_up.dart
map_screen.dart
map_screen_view_model.dart
gradient_widget.dart
live_icon.dart
confirmation_dialog.dart
intl_en.arb
bottom_bar.dart
dashboard_screen.dart
dashboard_screen_view_model.dart
blocked_card.dart
blocked_profiles_screen.dart
chat_top_bar_area.dart
chat_screen_view_model.dart
bottom_comment_field.dart
comment_card.dart
comment_sheet.dart
comment_sheet_view_model.dart
chat_screen_view_model.dart
interest_list.dart
edit_profile_screen_view_model.dart
bottom_bottons.dart
full_image_view.dart
explore_screen.dart
explore_screen_view_model.dart
screen1.dart
center_area_livestream.dart
live_stream_history_screen.dart
add_coin_sheet.dart
center_area_livestream_dashboard.dart
livestream_dashboard_screen.dart
livestream_dashboard_screen_view_model.dart
password_card.dart
login_pwd_screen_view_model.dart
auth_card.dart
login_dashboard_screen_view_model.dart
livestream_end_screen.dart
user_card.dart
message_screen.dart
message_screen_view_model.dart
options_center_area.dart
options_screen.dart
options_screen_view_model.dart
profile_images_area.dart
profile_screen.dart
profile_screen_view_model.dart
profile_pic_area.dart
randoms_screen.dart
randoms_screen_view_model.dart
register_card.dart
register_screen_view_model.dart
profile_pic_area.dart
randoms_search_screen.dart
randoms_search_screen_view_model.dart
center_area_redeem_screen.dart
redeem_screen.dart
redeem_screen_view_model.dart
detail_page.dart
image_selection_area.dart
top_bar.dart
user_detail_screen.dart
user_detail_screen_view_model.dart
bottom_diamond_shop.dart
bottom_diamond_shop_view_model.dart
like_card.dart
random_streaming_screen.dart
random_streaming_screen_view_model.dart
options_center_area.dart
options_screen.dart
options_screen_view_model.dart
user_card.dart
message_screen_view_model.dart
saved_card.dart
saved_profiles_screen.dart
live_grid_screen_view_model.dart
user_list.dart
search_screen.dart
search_screen_view_model.dart
full_image_view.dart
select_photo_screen.dart
select_photo_screen_view_model.dart
select_hobbies_screen.dart
select_hobbies_screen_view_model.dart
admin_notificaiton_page.dart
personal_notification.dart
notification_screen.dart
bottom_diamond_shop.dart
bottom_purchase_shit.dart
person_streaming_screen_view_model.dart
story_view_screen.dart
story_view_screen_view_model.dart
detail_page.dart
user_detail_screen_view_model.dart
video_preview_screen_view_model.dart
webview_screen.dart   
report_card.dart
report_sheet.dart
report_sheet_view_model.dart
verification_screen.dart
verification_screen_view_model.dart
asset_res.dart
color_res.dart
const_res.dart
urls.dart
pubspec.yaml
Info.plist

#### Moved Files

- 33740-sad-empty-box.json
- blur_bg1.png
- eva_edit-fill.png
- get_started1_label.png
- get_started2_bg.png
- get_started3_bg.png
- get_started3_marker.png
- get_started4_bg.png
- get_started4_camera.png
- ic_image.jpg
- lf30_editor_pdbikagl.json
- login_bg.png
- map1.png
- map2.png
- map3.png
- theme_label_white.png
- world_map.png
- buttons.dart
- common_fun.dart
- common_ui.dart
- confirmation_dialog.dart
- custom_box_shadow.dart
- dashboard_top_bar.dart
- detectable_text_custom.dart
- drop_down_box.dart
- fade_animation.dart
- full_image_view_shimmer.dart
- gradient_widget.dart
- live_icon.dart
- profile_detail_card.dart
- social_icon.dart
- starting_profile_top_text.dart
- top_bar_area.dart
- top_story_line.dart
- video_upload_dialog.dart