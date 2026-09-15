import 'package:orange_ui/utils/const_res.dart';

class Urls {
  ///------------------------ Urls ------------------------///
  static const String aGetProfile = '${ConstRes.aBaseUrl}getProfile';
  static const String aFetchMyUserProfile =
      '${ConstRes.aBaseUrl}fetchMyUserProfile';
  static const String aRegister = '${ConstRes.aBaseUrl}register';
  static const String aFakeUserLogin = '${ConstRes.aBaseUrl}fakeUserLogin';
  static const String aGetInterests = '${ConstRes.aBaseUrl}getInterests';
  static const String aGetPackage = '${ConstRes.aBaseUrl}getPackage';
  static const String aUpdateProfile = '${ConstRes.aBaseUrl}updateProfile';
  static const String aGetUserNotification =
      '${ConstRes.aBaseUrl}getUserNotifications';
  static const String aOnOffAnonymous = '${ConstRes.aBaseUrl}onOffAnonymous';
  static const String aOnOffShowMeOnMap =
      '${ConstRes.aBaseUrl}onOffShowMeOnMap';
  static const String aOnOffNotification =
      '${ConstRes.aBaseUrl}onOffNotification';
  static const String aAddUserReport = '${ConstRes.aBaseUrl}addUserReport';
  static const String aGetAdminNotification =
      '${ConstRes.aBaseUrl}getAdminNotifications';
  static const String aApplyForLive = '${ConstRes.aBaseUrl}applyForLive';
  static const String aApplyForVerification =
      '${ConstRes.aBaseUrl}applyForVerification';
  static const String aPlaceRedeemRequest =
      '${ConstRes.aBaseUrl}placeRedeemRequest';
  static const String aGetSettingData = '${ConstRes.aBaseUrl}getSettingData';
  static const String aSearchUsers = '${ConstRes.aBaseUrl}searchUsers';
  static const String aSearchUsersForInterest =
      '${ConstRes.aBaseUrl}searchUsersForInterest';
  static const String aUpdateSavedProfile =
      '${ConstRes.aBaseUrl}updateSavedProfile';
  static const String aUpdateLikedProfile =
      '${ConstRes.aBaseUrl}updateLikedProfile';
  static const String aLikedProfile = '${ConstRes.aBaseUrl}likedProfile';
  static const String aDislikedProfile = '${ConstRes.aBaseUrl}dislikedProfile';
  static const String aUpdateBlockList =
      '${ConstRes.aBaseUrl}updateUserBlockList';
  static const String aFetchAllLiveStreamHistory =
      '${ConstRes.aBaseUrl}fetchAllLiveStreamHistory';
  static const String aMinusCoinsFromWallet =
      '${ConstRes.aBaseUrl}minusCoinsFromWallet';
  static const String aStorageFileGivePath =
      '${ConstRes.aBaseUrl}storeFileGivePath';
  static const String aAddCoinsToWallet =
      '${ConstRes.aBaseUrl}addCoinsToWallet';
  static const String aGetDiamondPacks = '${ConstRes.aBaseUrl}getDiamondPacks';
  static const String aDeleteMyAccount = '${ConstRes.aBaseUrl}deleteMyAccount';
  static const String aAddLiveStreamHistory =
      '${ConstRes.aBaseUrl}addLiveStreamHistory';
  static const String aFetchUsersByCoordinates =
      '${ConstRes.aBaseUrl}fetchUsersByCordinates';
  static const String aGetUserDetails = '${ConstRes.aBaseUrl}getUserDetails';
  static const String aFetchMyRedeemRequests =
      '${ConstRes.aBaseUrl}fetchMyRedeemRequests';
  static const String aGetExplorePageProfileList =
      '${ConstRes.aBaseUrl}getExplorePageProfileList';
  static const String aGetRandomProfile =
      '${ConstRes.aBaseUrl}getRandomProfile';
  static const String aLogoutUser = '${ConstRes.aBaseUrl}logOutUser';
  static const String aNotificationUrl =
      '${ConstRes.aBaseUrl}pushNotificationToSingleUser';
  static const String aFetchSavedProfiles =
      '${ConstRes.aBaseUrl}fetchSavedProfiles';
  static const String aFetchLikedProfiles =
      '${ConstRes.aBaseUrl}fetchLikedProfiles';
  static const String aFetchBlockedProfiles =
      '${ConstRes.aBaseUrl}fetchBlockedProfiles';
  static const String aFetchHomePageData =
      '${ConstRes.aBaseUrl}fetchHomePageData';
  static const String aAddPost = '${ConstRes.aBaseUrl}addPost';
  static const String aLikePost = '${ConstRes.aBaseUrl}likePost';
  static const String aDislikePost = '${ConstRes.aBaseUrl}dislikePost';
  static const String aAddComment = '${ConstRes.aBaseUrl}addComment';
  static const String aFetchComments = '${ConstRes.aBaseUrl}fetchComments';
  static const String aDeleteComment = '${ConstRes.aBaseUrl}deleteComment';
  static const String aReportPost = '${ConstRes.aBaseUrl}reportPost';
  static const String aDeleteMyPost = '${ConstRes.aBaseUrl}deleteMyPost';
  static const String aViewStory = '${ConstRes.aBaseUrl}viewStory';
  static const String aFetchStories = '${ConstRes.aBaseUrl}fetchStories';
  static const String aFetchMyStories = '${ConstRes.aBaseUrl}fetchMyStories';
  static const String aCreateStory = '${ConstRes.aBaseUrl}createStory';
  static const String aDeleteStory = '${ConstRes.aBaseUrl}deleteStory';
  static const String aFollowUser = '${ConstRes.aBaseUrl}followUser';
  static const String aUnfollowUser = '${ConstRes.aBaseUrl}unfollowUser';
  static const String aFetchPostByUser = '${ConstRes.aBaseUrl}fetchPostByUser';
  static const String aFetchPostByPostId =
      '${ConstRes.aBaseUrl}fetchPostByPostId';
  static const String aIncreasePostViewCount =
      '${ConstRes.aBaseUrl}increasePostViewCount';
  static const String aFetchPostsByHashtag =
      '${ConstRes.aBaseUrl}fetchPostsByHashtag';
  static const String aFetchFollowingList =
      '${ConstRes.aBaseUrl}fetchFollowingList';
  static const String aFetchFollowersList =
      '${ConstRes.aBaseUrl}fetchFollowersList';
  static const String aGenerateAgoraToken =
      '${ConstRes.aBaseUrl}generateAgoraToken';
  static const String aFilteredProfiles =
      '${ConstRes.aBaseUrl}filteredProfiles';
  static const String aFetchMyHiddenProfiles =
      '${ConstRes.aBaseUrl}fetchMyHiddenProfiles';
  static const String ipApi = "http://ip-api.com/json/";

  ///------------------------ Params ------------------------///
  static const String apiKeyName = 'apikey';
  static const String fullName = 'fullname';
  static const String instagram = 'instagram';
  static const String genderPreferred = 'gender_preferred';
  static const String agePreferredMin = 'age_preferred_min';
  static const String agePreferredMax = 'age_preferred_max';
  static const String facebook = 'facebook';
  static const String youtube = 'youtube';
  static const String deviceToken = 'device_token';
  static const String deviceType = 'device_type';
  static const String loginType = 'login_type';
  static const String hiddenUserIds = 'hidden_user_ids';
  static const String appLanguage = 'app_language';
  static const String latitude = 'lattitude';
  static const String longitude = 'longitude';
  static const String deleteImagesId = 'deleteimageids[]';
  static const String images = 'image[]';
  static const String identity = 'identity';
  static const String interests = 'interests';
  static const String password = 'password';
  static const String post = 'POST';
  static const String userId = 'user_id';
  static const String live = 'live';
  static const String bio = 'bio';
  static const String age = 'age';
  static const String country = 'country';
  static const String state = 'state';
  static const String city = 'city';
  static const String distancePreference = 'distance_preference';
  static const String relationshipGoalId = 'relationship_goal_id';
  static const String religionKey = 'religion_key';
  static const String languageKeys = 'language_keys';
  static const String dob = 'dob';
  static const String isVerified = 'is_verified';
  static const String gender = 'gender';
  static const String type = 'type';
  static const String about = 'about';
  static const String aBubblyCamera = 'bubbly_camera';
  static const String aSettingData = 'settingData';
  static const String aState = 'state';
  static const String aCount = 'count';
  static const String aLimit = 'limit';
  static const String aReason = 'reason';
  static const String aDescription = 'description';
  static const String aAboutYou = 'about_you';
  static const String aSocialLink = 'social_links';
  static const String aIntroVideo = 'intro_video';
  static const String aLanguages = 'languages';
  static const String aPaymentGateway = 'payment_gateway';
  static const String aAccountDetails = 'account_details';
  static const String aStart = 'start';
  static const String aProfiles = 'profiles';
  static const String aBlockUser = 'blocked_users';
  static const String aDocumentType = 'document_type';
  static const String aSelfie = 'selfie';
  static const String aFile = 'file';
  static const String aDocument = 'document';
  static const String aAmount = 'amount';
  static const String aOne = '1';
  static const String aTwo = '2';
  static const String aKeyword = 'keyword';
  static const String aInterestId = 'interest_id';
  static const String aAmountCollected = 'amount_collected';
  static const String aStreamedFor = 'streamed_for';
  static const String aStartedAt = 'started_at';
  static const String aPrivacyPolicy = 'privacypolicy';
  static const String aTermsOfUse = 'termsOfUse';
  static const String aBlockedUsers = 'blocked_users';
  static const String lat = 'lat';
  static const String long = 'long';
  static const String aKm = 'km';
  static const String aEmail = 'email';
  static const String aUserInfo = 'userInfo';
  static const String aIsBroadcasting = 'isBroadcasting';
  static const String aChannelId = 'channelId';
  static const String aTopicName = 'Orange';
  static const String aDataUserId = 'data_user_id';
  static const String aConversationId = 'conversation_id';
  static const String aTitle = 'title';
  static const String aBody = 'body';
  static const String aContents = 'content[]';
  static const String aThumbnail = 'thumbnail[]';
  static const String aContentType = 'content_type';
  static const String aInterestIds = 'interest_ids';
  static const String aHashtags = 'hashtags';
  static const String aHashtag = 'hashtag';
  static const String aPostId = 'post_id';
  static const String aCommentId = 'comment_id';
  static const String aStoryId = 'story_id';
  static const String aDuration = 'duration';
  static const String content = 'content';
  static const String userName = 'username';
  static const String channelName = 'channelName';

  // Social Media
  static const String myUserId = 'my_user_id';
}
