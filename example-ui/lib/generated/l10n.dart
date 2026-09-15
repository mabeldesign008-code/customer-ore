// GENERATED CODE - DO NOT MODIFY BY HAND
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'intl/messages_all.dart';

// **************************************************************************
// Generator: Flutter Intl IDE plugin
// Made by Localizely
// **************************************************************************

// ignore_for_file: non_constant_identifier_names, lines_longer_than_80_chars
// ignore_for_file: join_return_with_assignment, prefer_final_in_for_each
// ignore_for_file: avoid_redundant_argument_values, avoid_escaping_inner_quotes

class S {
  S();

  static S? _current;

  static S get current {
    assert(
      _current != null,
      'No instance of S was loaded. Try to initialize the S delegate before accessing S.current.',
    );
    return _current!;
  }

  static const AppLocalizationDelegate delegate = AppLocalizationDelegate();

  static Future<S> load(Locale locale) {
    final name = (locale.countryCode?.isEmpty ?? false)
        ? locale.languageCode
        : locale.toString();
    final localeName = Intl.canonicalizedLocale(name);
    return initializeMessages(localeName).then((_) {
      Intl.defaultLocale = localeName;
      final instance = S();
      S._current = instance;

      return instance;
    });
  }

  static S of(BuildContext context) {
    final instance = S.maybeOf(context);
    assert(
      instance != null,
      'No instance of S present in the widget tree. Did you add S.delegate in localizationsDelegates?',
    );
    return instance!;
  }

  static S? maybeOf(BuildContext context) {
    return Localizations.of<S>(context, S);
  }

  /// `Find: Call: Chat: Stream`
  String get getStarted1Subtitle {
    return Intl.message(
      'Find: Call: Chat: Stream',
      name: 'getStarted1Subtitle',
      desc: '',
      args: [],
    );
  }

  /// `Continue`
  String get continueText {
    return Intl.message('Continue', name: 'continueText', desc: '', args: []);
  }

  /// `Fitness`
  String get fitness {
    return Intl.message('Fitness', name: 'fitness', desc: '', args: []);
  }

  /// `Music`
  String get music {
    return Intl.message('Music', name: 'music', desc: '', args: []);
  }

  /// `Foodies`
  String get foodies {
    return Intl.message('Foodies', name: 'foodies', desc: '', args: []);
  }

  /// `Movies`
  String get movies {
    return Intl.message('Movies', name: 'movies', desc: '', args: []);
  }

  /// `Walking`
  String get walking {
    return Intl.message('Walking', name: 'walking', desc: '', args: []);
  }

  /// `Chef`
  String get chef {
    return Intl.message('Chef', name: 'chef', desc: '', args: []);
  }

  /// `Singing`
  String get singing {
    return Intl.message('Singing', name: 'singing', desc: '', args: []);
  }

  /// `Travel`
  String get travel {
    return Intl.message('Travel', name: 'travel', desc: '', args: []);
  }

  /// `Artist`
  String get artist {
    return Intl.message('Artist', name: 'artist', desc: '', args: []);
  }

  /// `Explore Profiles`
  String get exploreProfiles {
    return Intl.message(
      'Explore Profiles',
      name: 'exploreProfiles',
      desc: '',
      args: [],
    );
  }

  /// `Craft your profile based on \ndifferent interests and find \nlike minded people`
  String get getStarted2Subtitle {
    return Intl.message(
      'Craft your profile based on \ndifferent interests and find \nlike minded people',
      name: 'getStarted2Subtitle',
      desc: '',
      args: [],
    );
  }

  /// `That's Great`
  String get thatGreat {
    return Intl.message('That\'s Great', name: 'thatGreat', desc: '', args: []);
  }

  /// `Skip`
  String get skip {
    return Intl.message('Skip', name: 'skip', desc: '', args: []);
  }

  /// `Nearby Profiles on Map`
  String get nearbyProfileOnMap {
    return Intl.message(
      'Nearby Profiles on Map',
      name: 'nearbyProfileOnMap',
      desc: '',
      args: [],
    );
  }

  /// `Allow access to get your location \nand find local people nearby \nand connect with them.`
  String get getStarted3Subtitle {
    return Intl.message(
      'Allow access to get your location \nand find local people nearby \nand connect with them.',
      name: 'getStarted3Subtitle',
      desc: '',
      args: [],
    );
  }

  /// `Allow`
  String get allow {
    return Intl.message('Allow', name: 'allow', desc: '', args: []);
  }

  /// `Stream Yourself`
  String get streamYourself {
    return Intl.message(
      'Stream Yourself',
      name: 'streamYourself',
      desc: '',
      args: [],
    );
  }

  /// `Stream your self and share \nyour life as well join other streamers,\n comment & send gifts`
  String get getStarted4Subtitle {
    return Intl.message(
      'Stream your self and share \nyour life as well join other streamers,\n comment & send gifts',
      name: 'getStarted4Subtitle',
      desc: '',
      args: [],
    );
  }

  /// `LOG IN TO CONTINUE`
  String get loginToContinue {
    return Intl.message(
      'LOG IN TO CONTINUE',
      name: 'loginToContinue',
      desc: '',
      args: [],
    );
  }

  /// `Email`
  String get email {
    return Intl.message('Email', name: 'email', desc: '', args: []);
  }

  /// `Enter The Email`
  String get enterEmail {
    return Intl.message(
      'Enter The Email',
      name: 'enterEmail',
      desc: '',
      args: [],
    );
  }

  /// `Enter Valid Email`
  String get validEmail {
    return Intl.message(
      'Enter Valid Email',
      name: 'validEmail',
      desc: '',
      args: [],
    );
  }

  /// `Or`
  String get or {
    return Intl.message('Or', name: 'or', desc: '', args: []);
  }

  /// `Continue With Google`
  String get continueWithGoogle {
    return Intl.message(
      'Continue With Google',
      name: 'continueWithGoogle',
      desc: '',
      args: [],
    );
  }

  /// `Continue With Facebook`
  String get continueWithFacebook {
    return Intl.message(
      'Continue With Facebook',
      name: 'continueWithFacebook',
      desc: '',
      args: [],
    );
  }

  /// `Continue With Apple`
  String get continueWithApple {
    return Intl.message(
      'Continue With Apple',
      name: 'continueWithApple',
      desc: '',
      args: [],
    );
  }

  /// `Don't have an account?`
  String get donTHaveAnAccount {
    return Intl.message(
      'Don\'t have an account?',
      name: 'donTHaveAnAccount',
      desc: '',
      args: [],
    );
  }

  /// `Sign Up`
  String get signUp {
    return Intl.message('Sign Up', name: 'signUp', desc: '', args: []);
  }

  /// `Forgot Your Password ?`
  String get forgotYourPassword {
    return Intl.message(
      'Forgot Your Password ?',
      name: 'forgotYourPassword',
      desc: '',
      args: [],
    );
  }

  /// `LOG IN`
  String get logIn {
    return Intl.message('LOG IN', name: 'logIn', desc: '', args: []);
  }

  /// `Password`
  String get password {
    return Intl.message('Password', name: 'password', desc: '', args: []);
  }

  /// `Enter the password`
  String get enterPassword {
    return Intl.message(
      'Enter the password',
      name: 'enterPassword',
      desc: '',
      args: [],
    );
  }

  /// `View`
  String get view {
    return Intl.message('View', name: 'view', desc: '', args: []);
  }

  /// `Hide`
  String get hide {
    return Intl.message('Hide', name: 'hide', desc: '', args: []);
  }

  /// `REGISTER`
  String get register {
    return Intl.message('REGISTER', name: 'register', desc: '', args: []);
  }

  /// `Looks like you don't have an account. \nLet's create new account `
  String get registerInfoText {
    return Intl.message(
      'Looks like you don\'t have an account. \nLet\'s create new account ',
      name: 'registerInfoText',
      desc: '',
      args: [],
    );
  }

  /// `Full Name`
  String get fullName {
    return Intl.message('Full Name', name: 'fullName', desc: '', args: []);
  }

  /// `Registration Successfully done`
  String get registrationSuccessfully {
    return Intl.message(
      'Registration Successfully done',
      name: 'registrationSuccessfully',
      desc: '',
      args: [],
    );
  }

  /// `Please valid email`
  String get pleaseValidEmail {
    return Intl.message(
      'Please valid email',
      name: 'pleaseValidEmail',
      desc: '',
      args: [],
    );
  }

  /// `Enter Full Name`
  String get enterFullName {
    return Intl.message(
      'Enter Full Name',
      name: 'enterFullName',
      desc: '',
      args: [],
    );
  }

  /// `Confirm Password`
  String get confirmPassword {
    return Intl.message(
      'Confirm Password',
      name: 'confirmPassword',
      desc: '',
      args: [],
    );
  }

  /// `Enter Confirm Password`
  String get enterConfirmPassword {
    return Intl.message(
      'Enter Confirm Password',
      name: 'enterConfirmPassword',
      desc: '',
      args: [],
    );
  }

  /// `Password Mismatch`
  String get passwordMismatch {
    return Intl.message(
      'Password Mismatch',
      name: 'passwordMismatch',
      desc: '',
      args: [],
    );
  }

  /// `By selecting Agree and continue below, \n I agree to `
  String get policy1 {
    return Intl.message(
      'By selecting Agree and continue below, \n I agree to ',
      name: 'policy1',
      desc: '',
      args: [],
    );
  }

  /// `Terms of Use`
  String get policy2 {
    return Intl.message('Terms of Use', name: 'policy2', desc: '', args: []);
  }

  /// ` and `
  String get policy3 {
    return Intl.message(' and ', name: 'policy3', desc: '', args: []);
  }

  /// `Privacy Policy`
  String get policy4 {
    return Intl.message('Privacy Policy', name: 'policy4', desc: '', args: []);
  }

  /// `Agree & Continue`
  String get agreeNContinue {
    return Intl.message(
      'Agree & Continue',
      name: 'agreeNContinue',
      desc: '',
      args: [],
    );
  }

  /// `Craft your profile with amazing Photos, Interests Bio and stand out from others !`
  String get startingProfileInfoText {
    return Intl.message(
      'Craft your profile with amazing Photos, Interests Bio and stand out from others !',
      name: 'startingProfileInfoText',
      desc: '',
      args: [],
    );
  }

  /// `Profile`
  String get profile {
    return Intl.message('Profile', name: 'profile', desc: '', args: []);
  }

  /// `WHERE DO YOU LIVE ?`
  String get whereDoYouLive {
    return Intl.message(
      'WHERE DO YOU LIVE ?',
      name: 'whereDoYouLive',
      desc: '',
      args: [],
    );
  }

  /// `City, Country`
  String get enterAddress {
    return Intl.message(
      'City, Country',
      name: 'enterAddress',
      desc: '',
      args: [],
    );
  }

  /// `BIO`
  String get bio {
    return Intl.message('BIO', name: 'bio', desc: '', args: []);
  }

  /// `User block by admin`
  String get userBlock {
    return Intl.message(
      'User block by admin',
      name: 'userBlock',
      desc: '',
      args: [],
    );
  }

  /// `Enter BIO`
  String get enterBio {
    return Intl.message('Enter BIO', name: 'enterBio', desc: '', args: []);
  }

  /// `Enter ABOUT`
  String get enterAbout {
    return Intl.message('Enter ABOUT', name: 'enterAbout', desc: '', args: []);
  }

  /// `Enter AGE`
  String get enterAge {
    return Intl.message('Enter AGE', name: 'enterAge', desc: '', args: []);
  }

  /// `AGE`
  String get age {
    return Intl.message('AGE', name: 'age', desc: '', args: []);
  }

  /// `GENDER`
  String get gender {
    return Intl.message('GENDER', name: 'gender', desc: '', args: []);
  }

  /// `Optional`
  String get optional {
    return Intl.message('Optional', name: 'optional', desc: '', args: []);
  }

  /// `Male`
  String get male {
    return Intl.message('Male', name: 'male', desc: '', args: []);
  }

  /// `Female`
  String get female {
    return Intl.message('Female', name: 'female', desc: '', args: []);
  }

  /// `Driving Licence`
  String get drivingLicence {
    return Intl.message(
      'Driving Licence',
      name: 'drivingLicence',
      desc: '',
      args: [],
    );
  }

  /// `National ID Card`
  String get idCard {
    return Intl.message('National ID Card', name: 'idCard', desc: '', args: []);
  }

  /// `Other`
  String get other {
    return Intl.message('Other', name: 'other', desc: '', args: []);
  }

  /// `NEXT`
  String get next {
    return Intl.message('NEXT', name: 'next', desc: '', args: []);
  }

  /// `PHOTOS`
  String get photosCap {
    return Intl.message('PHOTOS', name: 'photosCap', desc: '', args: []);
  }

  /// `Explore`
  String get explore {
    return Intl.message('Explore', name: 'explore', desc: '', args: []);
  }

  /// `Randoms`
  String get randoms {
    return Intl.message('Randoms', name: 'randoms', desc: '', args: []);
  }

  /// `Lives`
  String get joinLive {
    return Intl.message('Lives', name: 'joinLive', desc: '', args: []);
  }

  /// `Message`
  String get message {
    return Intl.message('Message', name: 'message', desc: '', args: []);
  }

  /// `PRICE`
  String get priceCap {
    return Intl.message('PRICE', name: 'priceCap', desc: '', args: []);
  }

  /// `Video Call`
  String get videoCall {
    return Intl.message('Video Call', name: 'videoCall', desc: '', args: []);
  }

  /// `LIVE`
  String get liveCap {
    return Intl.message('LIVE', name: 'liveCap', desc: '', args: []);
  }

  /// `NOW`
  String get nowCap {
    return Intl.message('NOW', name: 'nowCap', desc: '', args: []);
  }

  /// `REVERSE`
  String get reverse {
    return Intl.message('REVERSE', name: 'reverse', desc: '', args: []);
  }

  /// `EMPTY`
  String get empty {
    return Intl.message('EMPTY', name: 'empty', desc: '', args: []);
  }

  /// `Could not launch`
  String get couldNotLaunch {
    return Intl.message(
      'Could not launch',
      name: 'couldNotLaunch',
      desc: '',
      args: [],
    );
  }

  /// `It looks like your wallet has insufficient coins for this action. let’s recharge it to enjoy this feature.`
  String get itLooksLikeEtc {
    return Intl.message(
      'It looks like your wallet has insufficient coins for this action. let’s recharge it to enjoy this feature.',
      name: 'itLooksLikeEtc',
      desc: '',
      args: [],
    );
  }

  /// `SWIPE`
  String get swipe {
    return Intl.message('SWIPE', name: 'swipe', desc: '', args: []);
  }

  /// `use automatically from next`
  String get useAutomaticallyEtc {
    return Intl.message(
      'use automatically from next',
      name: 'useAutomaticallyEtc',
      desc: '',
      args: [],
    );
  }

  /// `WALLET`
  String get walletCap {
    return Intl.message('WALLET', name: 'walletCap', desc: '', args: []);
  }

  /// `Please Select Image`
  String get pleaseSelectImage {
    return Intl.message(
      'Please Select Image',
      name: 'pleaseSelectImage',
      desc: '',
      args: [],
    );
  }

  /// `MORE INFO`
  String get moreInfo {
    return Intl.message('MORE INFO', name: 'moreInfo', desc: '', args: []);
  }

  /// `HIDE INFO`
  String get hideInfo {
    return Intl.message('HIDE INFO', name: 'hideInfo', desc: '', args: []);
  }

  /// `REPORT USER`
  String get reportUser {
    return Intl.message('REPORT USER', name: 'reportUser', desc: '', args: []);
  }

  /// `JOIN`
  String get join {
    return Intl.message('JOIN', name: 'join', desc: '', args: []);
  }

  /// `Explain More`
  String get explainMore {
    return Intl.message(
      'Explain More',
      name: 'explainMore',
      desc: '',
      args: [],
    );
  }

  /// `I agree to`
  String get iAgreeTo {
    return Intl.message('I agree to', name: 'iAgreeTo', desc: '', args: []);
  }

  /// ` continue please`
  String get continuePlease {
    return Intl.message(
      ' continue please',
      name: 'continuePlease',
      desc: '',
      args: [],
    );
  }

  /// `Your Are Reporting this user`
  String get youAreReporting {
    return Intl.message(
      'Your Are Reporting this user',
      name: 'youAreReporting',
      desc: '',
      args: [],
    );
  }

  /// ` Terms & Conditions,`
  String get termAndCondition {
    return Intl.message(
      ' Terms & Conditions,',
      name: 'termAndCondition',
      desc: '',
      args: [],
    );
  }

  /// `Select Reason`
  String get selectReason {
    return Intl.message(
      'Select Reason',
      name: 'selectReason',
      desc: '',
      args: [],
    );
  }

  /// `User not live`
  String get userNotLive {
    return Intl.message(
      'User not live',
      name: 'userNotLive',
      desc: '',
      args: [],
    );
  }

  /// `Cyberbullying`
  String get cyberbullying {
    return Intl.message(
      'Cyberbullying',
      name: 'cyberbullying',
      desc: '',
      args: [],
    );
  }

  /// `Harassment`
  String get harassment {
    return Intl.message('Harassment', name: 'harassment', desc: '', args: []);
  }

  /// `Personal Harassment`
  String get personalHarassment {
    return Intl.message(
      'Personal Harassment',
      name: 'personalHarassment',
      desc: '',
      args: [],
    );
  }

  /// `Inappropriate Content`
  String get inappropriateContent {
    return Intl.message(
      'Inappropriate Content',
      name: 'inappropriateContent',
      desc: '',
      args: [],
    );
  }

  /// `About`
  String get about {
    return Intl.message('About', name: 'about', desc: '', args: []);
  }

  /// `Enter Full Reason`
  String get enterFullReason {
    return Intl.message(
      'Enter Full Reason',
      name: 'enterFullReason',
      desc: '',
      args: [],
    );
  }

  /// `CHAT WITH `
  String get chatWith {
    return Intl.message('CHAT WITH ', name: 'chatWith', desc: '', args: []);
  }

  /// `SHARE`
  String get share {
    return Intl.message('SHARE', name: 'share', desc: '', args: []);
  }

  /// `REPORT `
  String get reportCap {
    return Intl.message('REPORT ', name: 'reportCap', desc: '', args: []);
  }

  /// `NOTIFICATIONS`
  String get notification {
    return Intl.message(
      'NOTIFICATIONS',
      name: 'notification',
      desc: '',
      args: [],
    );
  }

  /// `Personal`
  String get personal {
    return Intl.message('Personal', name: 'personal', desc: '', args: []);
  }

  /// `Platform`
  String get platform {
    return Intl.message('Platform', name: 'platform', desc: '', args: []);
  }

  /// `Go`
  String get go {
    return Intl.message('Go', name: 'go', desc: '', args: []);
  }

  /// `CONTINUE`
  String get continueCap {
    return Intl.message('CONTINUE', name: 'continueCap', desc: '', args: []);
  }

  /// `Terms`
  String get terms {
    return Intl.message('Terms', name: 'terms', desc: '', args: []);
  }

  /// `and`
  String get and {
    return Intl.message('and', name: 'and', desc: '', args: []);
  }

  /// `Privacy Policy`
  String get privacyPolicy {
    return Intl.message(
      'Privacy Policy',
      name: 'privacyPolicy',
      desc: '',
      args: [],
    );
  }

  /// `Today`
  String get today {
    return Intl.message('Today', name: 'today', desc: '', args: []);
  }

  /// `Please check Term & Condition`
  String get pleaseCheckTerm {
    return Intl.message(
      'Please check Term & Condition',
      name: 'pleaseCheckTerm',
      desc: '',
      args: [],
    );
  }

  /// `Block`
  String get block {
    return Intl.message('Block', name: 'block', desc: '', args: []);
  }

  /// `IMAGE`
  String get image {
    return Intl.message('IMAGE', name: 'image', desc: '', args: []);
  }

  /// `Selected`
  String get selected {
    return Intl.message('Selected', name: 'selected', desc: '', args: []);
  }

  /// `VIDEO`
  String get videoCap {
    return Intl.message('VIDEO', name: 'videoCap', desc: '', args: []);
  }

  /// `Videos`
  String get videos {
    return Intl.message('Videos', name: 'videos', desc: '', args: []);
  }

  /// `UNBLOCK`
  String get unblockCap {
    return Intl.message('UNBLOCK', name: 'unblockCap', desc: '', args: []);
  }

  /// `You block this user`
  String get youBlockThisUser {
    return Intl.message(
      'You block this user',
      name: 'youBlockThisUser',
      desc: '',
      args: [],
    );
  }

  /// `to send a message.`
  String get toSendMessage {
    return Intl.message(
      'to send a message.',
      name: 'toSendMessage',
      desc: '',
      args: [],
    );
  }

  /// `Close`
  String get close {
    return Intl.message('Close', name: 'close', desc: '', args: []);
  }

  /// `Send Media`
  String get sendMedia {
    return Intl.message('Send Media', name: 'sendMedia', desc: '', args: []);
  }

  /// `Send`
  String get send {
    return Intl.message('Send', name: 'send', desc: '', args: []);
  }

  /// `you`
  String get you {
    return Intl.message('you', name: 'you', desc: '', args: []);
  }

  /// `Photos`
  String get photos {
    return Intl.message('Photos', name: 'photos', desc: '', args: []);
  }

  /// `Yesterday`
  String get yesterday {
    return Intl.message('Yesterday', name: 'yesterday', desc: '', args: []);
  }

  /// `This User Block You`
  String get thisUserBlockYou {
    return Intl.message(
      'This User Block You',
      name: 'thisUserBlockYou',
      desc: '',
      args: [],
    );
  }

  /// `Which item would you like to select?\nSelect a item`
  String get whichItemWouldYouLikeEtc {
    return Intl.message(
      'Which item would you like to select?\nSelect a item',
      name: 'whichItemWouldYouLikeEtc',
      desc: '',
      args: [],
    );
  }

  /// `Write Message`
  String get writeMessage {
    return Intl.message(
      'Write Message',
      name: 'writeMessage',
      desc: '',
      args: [],
    );
  }

  /// `Unblock`
  String get unBlock {
    return Intl.message('Unblock', name: 'unBlock', desc: '', args: []);
  }

  /// `Report`
  String get report {
    return Intl.message('Report', name: 'report', desc: '', args: []);
  }

  /// `Cancel`
  String get cancel {
    return Intl.message('Cancel', name: 'cancel', desc: '', args: []);
  }

  /// `Delete message`
  String get deleteMessage {
    return Intl.message(
      'Delete message',
      name: 'deleteMessage',
      desc: '',
      args: [],
    );
  }

  /// `Delete this chat`
  String get deleteThisChat {
    return Intl.message(
      'Delete this chat',
      name: 'deleteThisChat',
      desc: '',
      args: [],
    );
  }

  /// `Are you sure you want to delete this message ?`
  String get areYouSureYouEtc {
    return Intl.message(
      'Are you sure you want to delete this message ?',
      name: 'areYouSureYouEtc',
      desc: '',
      args: [],
    );
  }

  /// `Message will only be removed from this device Are you sure?`
  String get messageWillOnlyBeRemoved {
    return Intl.message(
      'Message will only be removed from this device Are you sure?',
      name: 'messageWillOnlyBeRemoved',
      desc: '',
      args: [],
    );
  }

  /// `Are you sure`
  String get areYouSure {
    return Intl.message('Are you sure', name: 'areYouSure', desc: '', args: []);
  }

  /// `Type something...!`
  String get chatHint {
    return Intl.message(
      'Type something...!',
      name: 'chatHint',
      desc: '',
      args: [],
    );
  }

  /// `Yes`
  String get yes {
    return Intl.message('Yes', name: 'yes', desc: '', args: []);
  }

  /// `No`
  String get no {
    return Intl.message('No', name: 'no', desc: '', args: []);
  }

  /// `Map`
  String get map {
    return Intl.message('Map', name: 'map', desc: '', args: []);
  }

  /// `Km`
  String get km {
    return Intl.message('Km', name: 'km', desc: '', args: []);
  }

  /// `Find Someone Randomly\nAnd check their profile `
  String get findSomeoneRandomly {
    return Intl.message(
      'Find Someone Randomly\nAnd check their profile ',
      name: 'findSomeoneRandomly',
      desc: '',
      args: [],
    );
  }

  /// `BOYS`
  String get boys {
    return Intl.message('BOYS', name: 'boys', desc: '', args: []);
  }

  /// `Are you`
  String get areYou {
    return Intl.message('Are you', name: 'areYou', desc: '', args: []);
  }

  /// ` Sure?`
  String get sure {
    return Intl.message(' Sure?', name: 'sure', desc: '', args: []);
  }

  /// `BOTH`
  String get both {
    return Intl.message('BOTH', name: 'both', desc: '', args: []);
  }

  /// `GIRLS`
  String get girls {
    return Intl.message('GIRLS', name: 'girls', desc: '', args: []);
  }

  /// `START MATCHING`
  String get startMatching {
    return Intl.message(
      'START MATCHING',
      name: 'startMatching',
      desc: '',
      args: [],
    );
  }

  /// `Ok`
  String get ok {
    return Intl.message('Ok', name: 'ok', desc: '', args: []);
  }

  /// `Searching...`
  String get searching {
    return Intl.message('Searching...', name: 'searching', desc: '', args: []);
  }

  /// `CANCEL`
  String get cancelCap {
    return Intl.message('CANCEL', name: 'cancelCap', desc: '', args: []);
  }

  /// `DELETE`
  String get deleteCap {
    return Intl.message('DELETE', name: 'deleteCap', desc: '', args: []);
  }

  /// `Delete`
  String get delete {
    return Intl.message('Delete', name: 'delete', desc: '', args: []);
  }

  /// `Delete Chat`
  String get deleteChat {
    return Intl.message('Delete Chat', name: 'deleteChat', desc: '', args: []);
  }

  /// `Interest`
  String get interest {
    return Intl.message('Interest', name: 'interest', desc: '', args: []);
  }

  /// `EDIT PROFILE`
  String get editProfile {
    return Intl.message(
      'EDIT PROFILE',
      name: 'editProfile',
      desc: '',
      args: [],
    );
  }

  /// `EDIT`
  String get edit {
    return Intl.message('EDIT', name: 'edit', desc: '', args: []);
  }

  /// `PROFILE`
  String get profileCap {
    return Intl.message('PROFILE', name: 'profileCap', desc: '', args: []);
  }

  /// `FULL NAME`
  String get fullNameCap {
    return Intl.message('FULL NAME', name: 'fullNameCap', desc: '', args: []);
  }

  /// `DOCUMENT TYPE`
  String get docType {
    return Intl.message('DOCUMENT TYPE', name: 'docType', desc: '', args: []);
  }

  /// `YOUR SELFIE`
  String get yourSelfie {
    return Intl.message('YOUR SELFIE', name: 'yourSelfie', desc: '', args: []);
  }

  /// `INSTAGRAM`
  String get instagram {
    return Intl.message('INSTAGRAM', name: 'instagram', desc: '', args: []);
  }

  /// `FACEBOOK`
  String get facebook {
    return Intl.message('FACEBOOK', name: 'facebook', desc: '', args: []);
  }

  /// `YOUTUBE`
  String get youtube {
    return Intl.message('YOUTUBE', name: 'youtube', desc: '', args: []);
  }

  /// `SAVE`
  String get save {
    return Intl.message('SAVE', name: 'save', desc: '', args: []);
  }

  /// `Please add at least 1 image`
  String get pleaseAddAtLeastEtc {
    return Intl.message(
      'Please add at least 1 image',
      name: 'pleaseAddAtLeastEtc',
      desc: '',
      args: [],
    );
  }

  /// `Please add at least 1 interest`
  String get pleaseAddAtLeastInterest {
    return Intl.message(
      'Please add at least 1 interest',
      name: 'pleaseAddAtLeastInterest',
      desc: '',
      args: [],
    );
  }

  /// `Image is Empty`
  String get imageIsEmpty {
    return Intl.message(
      'Image is Empty',
      name: 'imageIsEmpty',
      desc: '',
      args: [],
    );
  }

  /// `OPTIONS`
  String get options {
    return Intl.message('OPTIONS', name: 'options', desc: '', args: []);
  }

  /// `REQUEST VERIFICATION`
  String get reqVerification {
    return Intl.message(
      'REQUEST VERIFICATION',
      name: 'reqVerification',
      desc: '',
      args: [],
    );
  }

  /// `Wallet / Livestream Dashboard`
  String get livestream {
    return Intl.message(
      'Wallet / Livestream Dashboard',
      name: 'livestream',
      desc: '',
      args: [],
    );
  }

  /// `Apply for Verification`
  String get verification {
    return Intl.message(
      'Apply for Verification',
      name: 'verification',
      desc: '',
      args: [],
    );
  }

  /// `Select Document`
  String get selectDocument {
    return Intl.message(
      'Select Document',
      name: 'selectDocument',
      desc: '',
      args: [],
    );
  }

  /// `Take Photo`
  String get takePhoto {
    return Intl.message('Take Photo', name: 'takePhoto', desc: '', args: []);
  }

  /// `Please add selfie photo`
  String get pleaseAddSelfiePhoto {
    return Intl.message(
      'Please add selfie photo',
      name: 'pleaseAddSelfiePhoto',
      desc: '',
      args: [],
    );
  }

  /// `Verified accounts have blue checkmarks next to their names to show that we have confirmed they are the real presence of the public figures or celebrities.`
  String get verifiedAccountsHaveBlueEtc {
    return Intl.message(
      'Verified accounts have blue checkmarks next to their names to show that we have confirmed they are the real presence of the public figures or celebrities.',
      name: 'verifiedAccountsHaveBlueEtc',
      desc: '',
      args: [],
    );
  }

  /// `PRIVACY SETTINGS`
  String get privacy {
    return Intl.message(
      'PRIVACY SETTINGS',
      name: 'privacy',
      desc: '',
      args: [],
    );
  }

  /// `Push Notifications`
  String get pushNotification {
    return Intl.message(
      'Push Notifications',
      name: 'pushNotification',
      desc: '',
      args: [],
    );
  }

  /// `Keep it on, if you want to receive notifications`
  String get notificationData {
    return Intl.message(
      'Keep it on, if you want to receive notifications',
      name: 'notificationData',
      desc: '',
      args: [],
    );
  }

  /// `Show Me On Map`
  String get switchMap {
    return Intl.message(
      'Show Me On Map',
      name: 'switchMap',
      desc: '',
      args: [],
    );
  }

  /// `Keep it on, if you want to be seen on Map`
  String get switchMapData {
    return Intl.message(
      'Keep it on, if you want to be seen on Map',
      name: 'switchMapData',
      desc: '',
      args: [],
    );
  }

  /// `Go Annonymous`
  String get anonymous {
    return Intl.message('Go Annonymous', name: 'anonymous', desc: '', args: []);
  }

  /// `Turn On, if you don't want to be seen anywhere in the app.Like: Search,Card Stack.`
  String get anonymousData {
    return Intl.message(
      'Turn On, if you don\'t want to be seen anywhere in the app.Like: Search,Card Stack.',
      name: 'anonymousData',
      desc: '',
      args: [],
    );
  }

  /// `Terms Of Use`
  String get termsOfUse {
    return Intl.message('Terms Of Use', name: 'termsOfUse', desc: '', args: []);
  }

  /// `Log Out`
  String get logOut {
    return Intl.message('Log Out', name: 'logOut', desc: '', args: []);
  }

  /// `Delete Account`
  String get deleteAccount {
    return Intl.message(
      'Delete Account',
      name: 'deleteAccount',
      desc: '',
      args: [],
    );
  }

  /// `Version`
  String get versionText {
    return Intl.message('Version', name: 'versionText', desc: '', args: []);
  }

  /// `LEGAL`
  String get legal {
    return Intl.message('LEGAL', name: 'legal', desc: '', args: []);
  }

  /// `Do you really want to delete your account? You won't be able to recover it later and data will be lost forever`
  String get deleteDialogDis {
    return Intl.message(
      'Do you really want to delete your account? You won\'t be able to recover it later and data will be lost forever',
      name: 'deleteDialogDis',
      desc: '',
      args: [],
    );
  }

  /// `Do you really want to logout from this app?`
  String get logOutDis {
    return Intl.message(
      'Do you really want to logout from this app?',
      name: 'logOutDis',
      desc: '',
      args: [],
    );
  }

  /// `LIVESTREAM`
  String get liveStreamCap {
    return Intl.message(
      'LIVESTREAM',
      name: 'liveStreamCap',
      desc: '',
      args: [],
    );
  }

  /// `STREAM`
  String get streamCap {
    return Intl.message('STREAM', name: 'streamCap', desc: '', args: []);
  }

  /// `Are you sure you want to end your live video?`
  String get areYouSureYouWantToEnd {
    return Intl.message(
      'Are you sure you want to end your live video?',
      name: 'areYouSureYouWantToEnd',
      desc: '',
      args: [],
    );
  }

  /// `Do you really want to live. Please continue to go Live`
  String get doYouReallyWantToLive {
    return Intl.message(
      'Do you really want to live. Please continue to go Live',
      name: 'doYouReallyWantToLive',
      desc: '',
      args: [],
    );
  }

  /// `Video Preview Screen`
  String get videoPreview {
    return Intl.message(
      'Video Preview Screen',
      name: 'videoPreview',
      desc: '',
      args: [],
    );
  }

  /// `Failed to load video: Cannot Open`
  String get failedToLoadVideo {
    return Intl.message(
      'Failed to load video: Cannot Open',
      name: 'failedToLoadVideo',
      desc: '',
      args: [],
    );
  }

  /// ` APPLICATION`
  String get application {
    return Intl.message(
      ' APPLICATION',
      name: 'application',
      desc: '',
      args: [],
    );
  }

  /// `SOMETHING ABOUT YOU?`
  String get something {
    return Intl.message(
      'SOMETHING ABOUT YOU?',
      name: 'something',
      desc: '',
      args: [],
    );
  }

  /// `Short intro about you..`
  String get shortIntro {
    return Intl.message(
      'Short intro about you..',
      name: 'shortIntro',
      desc: '',
      args: [],
    );
  }

  /// `Languages`
  String get languages {
    return Intl.message('Languages', name: 'languages', desc: '', args: []);
  }

  /// `App Languages`
  String get appLanguages {
    return Intl.message(
      'App Languages',
      name: 'appLanguages',
      desc: '',
      args: [],
    );
  }

  /// `LANGUAGES YOU WILL SPEAK`
  String get languagesYouEtc {
    return Intl.message(
      'LANGUAGES YOU WILL SPEAK',
      name: 'languagesYouEtc',
      desc: '',
      args: [],
    );
  }

  /// `Languages you will speak while streaming..`
  String get languagesDetail {
    return Intl.message(
      'Languages you will speak while streaming..',
      name: 'languagesDetail',
      desc: '',
      args: [],
    );
  }

  /// `SHORT INTRO VIDEO`
  String get intro {
    return Intl.message('SHORT INTRO VIDEO', name: 'intro', desc: '', args: []);
  }

  /// `Attach`
  String get attach {
    return Intl.message('Attach', name: 'attach', desc: '', args: []);
  }

  /// `SOCIAL PROFILE LINKS`
  String get social {
    return Intl.message(
      'SOCIAL PROFILE LINKS',
      name: 'social',
      desc: '',
      args: [],
    );
  }

  /// `Links to some of your social media profiles,which helps us to know more about your fan followings.`
  String get socialData {
    return Intl.message(
      'Links to some of your social media profiles,which helps us to know more about your fan followings.',
      name: 'socialData',
      desc: '',
      args: [],
    );
  }

  /// `SUBMIT`
  String get submit {
    return Intl.message('SUBMIT', name: 'submit', desc: '', args: []);
  }

  /// ` HISTORY`
  String get history {
    return Intl.message(' HISTORY', name: 'history', desc: '', args: []);
  }

  /// ` Time:`
  String get time {
    return Intl.message(' Time:', name: 'time', desc: '', args: []);
  }

  /// `Streamed For:`
  String get streamed {
    return Intl.message('Streamed For:', name: 'streamed', desc: '', args: []);
  }

  /// `Diamonds Collected:`
  String get diamond {
    return Intl.message(
      'Diamonds Collected:',
      name: 'diamond',
      desc: '',
      args: [],
    );
  }

  /// `Live`
  String get live {
    return Intl.message('Live', name: 'live', desc: '', args: []);
  }

  /// `GO LIVE`
  String get goLive {
    return Intl.message('GO LIVE', name: 'goLive', desc: '', args: []);
  }

  /// `Failed payment`
  String get failedPayment {
    return Intl.message(
      'Failed payment',
      name: 'failedPayment',
      desc: '',
      args: [],
    );
  }

  /// `END`
  String get end {
    return Intl.message('END', name: 'end', desc: '', args: []);
  }

  /// `Viewers`
  String get viewers {
    return Intl.message('Viewers', name: 'viewers', desc: '', args: []);
  }

  /// `Collected`
  String get collected {
    return Intl.message('Collected', name: 'collected', desc: '', args: []);
  }

  /// `Comment...`
  String get comment {
    return Intl.message('Comment...', name: 'comment', desc: '', args: []);
  }

  /// `Exit`
  String get exit {
    return Intl.message('Exit', name: 'exit', desc: '', args: []);
  }

  /// `YOU WILL BE SENT OUTSIDE SOON`
  String get youWillBeSentEtc {
    return Intl.message(
      'YOU WILL BE SENT OUTSIDE SOON',
      name: 'youWillBeSentEtc',
      desc: '',
      args: [],
    );
  }

  /// `Subscribe to PRO - Have No Limits`
  String get subscribeToProEtc {
    return Intl.message(
      'Subscribe to PRO - Have No Limits',
      name: 'subscribeToProEtc',
      desc: '',
      args: [],
    );
  }

  /// `PRO`
  String get pro {
    return Intl.message('PRO', name: 'pro', desc: '', args: []);
  }

  /// `ADD`
  String get add {
    return Intl.message('ADD', name: 'add', desc: '', args: []);
  }

  /// `DIAMONDS`
  String get diamonds {
    return Intl.message('DIAMONDS', name: 'diamonds', desc: '', args: []);
  }

  /// `Diamonds`
  String get diamondsCamel {
    return Intl.message('Diamonds', name: 'diamondsCamel', desc: '', args: []);
  }

  /// `REDEEM`
  String get redeem {
    return Intl.message('REDEEM', name: 'redeem', desc: '', args: []);
  }

  /// ` REQUESTS`
  String get requests {
    return Intl.message(' REQUESTS', name: 'requests', desc: '', args: []);
  }

  /// `Complete`
  String get complete {
    return Intl.message('Complete', name: 'complete', desc: '', args: []);
  }

  /// `Processing`
  String get processing {
    return Intl.message('Processing', name: 'processing', desc: '', args: []);
  }

  /// `Diamonds:`
  String get diamond1 {
    return Intl.message('Diamonds:', name: 'diamond1', desc: '', args: []);
  }

  /// `Amount Paid:`
  String get amount {
    return Intl.message('Amount Paid:', name: 'amount', desc: '', args: []);
  }

  /// `No redeem data`
  String get noRedeemData {
    return Intl.message(
      'No redeem data',
      name: 'noRedeemData',
      desc: '',
      args: [],
    );
  }

  /// ` DASHBOARD`
  String get dashboard {
    return Intl.message(' DASHBOARD', name: 'dashboard', desc: '', args: []);
  }

  /// `GET ACCESS TO GIVE LIVE`
  String get getAccess {
    return Intl.message(
      'GET ACCESS TO GIVE LIVE',
      name: 'getAccess',
      desc: '',
      args: [],
    );
  }

  /// `LIVE VERIFICATION`
  String get liveVerification {
    return Intl.message(
      'LIVE VERIFICATION',
      name: 'liveVerification',
      desc: '',
      args: [],
    );
  }

  /// `APPLY`
  String get apply {
    return Intl.message('APPLY', name: 'apply', desc: '', args: []);
  }

  /// `Livestream Eligibility`
  String get eligibility {
    return Intl.message(
      'Livestream Eligibility',
      name: 'eligibility',
      desc: '',
      args: [],
    );
  }

  /// `ELIGIBLE`
  String get eligible {
    return Intl.message('ELIGIBLE', name: 'eligible', desc: '', args: []);
  }

  /// `PENDING`
  String get pending {
    return Intl.message('PENDING', name: 'pending', desc: '', args: []);
  }

  /// `NOT ELIGIBLE`
  String get notEligible {
    return Intl.message(
      'NOT ELIGIBLE',
      name: 'notEligible',
      desc: '',
      args: [],
    );
  }

  /// `DIAMOND WALLET`
  String get wallet {
    return Intl.message('DIAMOND WALLET', name: 'wallet', desc: '', args: []);
  }

  /// `Live`
  String get liveCAp {
    return Intl.message('Live', name: 'liveCAp', desc: '', args: []);
  }

  /// `Minimum Threshold : `
  String get threshold {
    return Intl.message(
      'Minimum Threshold : ',
      name: 'threshold',
      desc: '',
      args: [],
    );
  }

  /// `REDEEM`
  String get redeemCap {
    return Intl.message('REDEEM', name: 'redeemCap', desc: '', args: []);
  }

  /// `ADD COINS`
  String get addCoins {
    return Intl.message('ADD COINS', name: 'addCoins', desc: '', args: []);
  }

  /// `TOTAL STREAMS`
  String get totalStream {
    return Intl.message(
      'TOTAL STREAMS',
      name: 'totalStream',
      desc: '',
      args: [],
    );
  }

  /// `TOTAL COLLECTION`
  String get totalCollection {
    return Intl.message(
      'TOTAL COLLECTION',
      name: 'totalCollection',
      desc: '',
      args: [],
    );
  }

  /// `REDEEM REQUESTS`
  String get redeemRequests {
    return Intl.message(
      'REDEEM REQUESTS',
      name: 'redeemRequests',
      desc: '',
      args: [],
    );
  }

  /// `DIAMOND`
  String get diamondCap {
    return Intl.message('DIAMOND', name: 'diamondCap', desc: '', args: []);
  }

  /// `SHOP`
  String get shop {
    return Intl.message('SHOP', name: 'shop', desc: '', args: []);
  }

  /// `By continuing the purchase you agree to our `
  String get bayContinuingThePurchaseEtc {
    return Intl.message(
      'By continuing the purchase you agree to our ',
      name: 'bayContinuingThePurchaseEtc',
      desc: '',
      args: [],
    );
  }

  /// `automatically`
  String get automatically {
    return Intl.message(
      'automatically',
      name: 'automatically',
      desc: '',
      args: [],
    );
  }

  /// `PayPal`
  String get paypal {
    return Intl.message('PayPal', name: 'paypal', desc: '', args: []);
  }

  /// `Enter Account details`
  String get enterAccountDetails {
    return Intl.message(
      'Enter Account details',
      name: 'enterAccountDetails',
      desc: '',
      args: [],
    );
  }

  /// `Bank Transfer`
  String get bankTransfer {
    return Intl.message(
      'Bank Transfer',
      name: 'bankTransfer',
      desc: '',
      args: [],
    );
  }

  /// `No Data Available`
  String get noDataAvailable {
    return Intl.message(
      'No Data Available',
      name: 'noDataAvailable',
      desc: '',
      args: [],
    );
  }

  /// `You must be 18+`
  String get youMustBe18 {
    return Intl.message(
      'You must be 18+',
      name: 'youMustBe18',
      desc: '',
      args: [],
    );
  }

  /// `Accept`
  String get accept {
    return Intl.message('Accept', name: 'accept', desc: '', args: []);
  }

  /// `No users are live`
  String get noUsersAreLive {
    return Intl.message(
      'No users are live',
      name: 'noUsersAreLive',
      desc: '',
      args: [],
    );
  }

  /// `Please apply for live stream from livestream dashboard from profile!`
  String get pleaseApplyForLiveStreamFromLivestreamDashboardFromProfile {
    return Intl.message(
      'Please apply for live stream from livestream dashboard from profile!',
      name: 'pleaseApplyForLiveStreamFromLivestreamDashboardFromProfile',
      desc: '',
      args: [],
    );
  }

  /// `Your Application is pending please wait`
  String get yourApplicationIsPendingPleaseWait {
    return Intl.message(
      'Your Application is pending please wait',
      name: 'yourApplicationIsPendingPleaseWait',
      desc: '',
      args: [],
    );
  }

  /// `Change`
  String get change {
    return Intl.message('Change', name: 'change', desc: '', args: []);
  }

  /// `Too Large`
  String get tooLarge {
    return Intl.message('Too Large', name: 'tooLarge', desc: '', args: []);
  }

  /// `Video?`
  String get video {
    return Intl.message('Video?', name: 'video', desc: '', args: []);
  }

  /// `This video is greater than 50 mb\nPlease select another...`
  String get thisVideoIsGreaterThan50MbnpleaseSelectAnother {
    return Intl.message(
      'This video is greater than 50 mb\nPlease select another...',
      name: 'thisVideoIsGreaterThan50MbnpleaseSelectAnother',
      desc: '',
      args: [],
    );
  }

  /// `Select another`
  String get selectAnother {
    return Intl.message(
      'Select another',
      name: 'selectAnother',
      desc: '',
      args: [],
    );
  }

  /// `Please add social links`
  String get pleaseAddSocialLinks {
    return Intl.message(
      'Please add social links',
      name: 'pleaseAddSocialLinks',
      desc: '',
      args: [],
    );
  }

  /// `Your live stream has been ended!\nBelow is a summary of it.`
  String get yourLiveStreamHasBeenEndednbelowIsASummaryOf {
    return Intl.message(
      'Your live stream has been ended!\nBelow is a summary of it.',
      name: 'yourLiveStreamHasBeenEndednbelowIsASummaryOf',
      desc: '',
      args: [],
    );
  }

  /// `Stream for`
  String get streamFor {
    return Intl.message('Stream for', name: 'streamFor', desc: '', args: []);
  }

  /// `Users`
  String get users {
    return Intl.message('Users', name: 'users', desc: '', args: []);
  }

  /// `Please Enter Email...!`
  String get pleaseEnterEmail {
    return Intl.message(
      'Please Enter Email...!',
      name: 'pleaseEnterEmail',
      desc: '',
      args: [],
    );
  }

  /// `Please Enter valid email address`
  String get pleaseEnterValidEmailAddress {
    return Intl.message(
      'Please Enter valid email address',
      name: 'pleaseEnterValidEmailAddress',
      desc: '',
      args: [],
    );
  }

  /// `Email sent Successfully...`
  String get emailSentSuccessfully {
    return Intl.message(
      'Email sent Successfully...',
      name: 'emailSentSuccessfully',
      desc: '',
      args: [],
    );
  }

  /// `Forgot Password?`
  String get forgotPassword {
    return Intl.message(
      'Forgot Password?',
      name: 'forgotPassword',
      desc: '',
      args: [],
    );
  }

  /// `Enter your mail on which you have \ncreated an account. We will send a link \nto reset your password`
  String get enterYourMailOnWhichYouHaveNcreatedAnAccount {
    return Intl.message(
      'Enter your mail on which you have \ncreated an account. We will send a link \nto reset your password',
      name: 'enterYourMailOnWhichYouHaveNcreatedAnAccount',
      desc: '',
      args: [],
    );
  }

  /// `Reset`
  String get reset {
    return Intl.message('Reset', name: 'reset', desc: '', args: []);
  }

  /// `Enter the password for the account \nwith the email below`
  String get enterThePasswordForTheAccountNwithTheEmailBelow {
    return Intl.message(
      'Enter the password for the account \nwith the email below',
      name: 'enterThePasswordForTheAccountNwithTheEmailBelow',
      desc: '',
      args: [],
    );
  }

  /// `Incorrect password or UserId`
  String get incorrectPasswordOrUserid {
    return Intl.message(
      'Incorrect password or UserId',
      name: 'incorrectPasswordOrUserid',
      desc: '',
      args: [],
    );
  }

  /// `Please Verify your e-mail from your inbox`
  String get pleaseVerifyYourEmailFromYourInbox {
    return Intl.message(
      'Please Verify your e-mail from your inbox',
      name: 'pleaseVerifyYourEmailFromYourInbox',
      desc: '',
      args: [],
    );
  }

  /// `No Data`
  String get noData {
    return Intl.message('No Data', name: 'noData', desc: '', args: []);
  }

  /// ` has liked your profile, you should check their profile!`
  String get hasLikedYourProfileYouShouldCheckTheirProfile {
    return Intl.message(
      ' has liked your profile, you should check their profile!',
      name: 'hasLikedYourProfileYouShouldCheckTheirProfile',
      desc: '',
      args: [],
    );
  }

  /// `You are fake User`
  String get youAreFakeUser {
    return Intl.message(
      'You are fake User',
      name: 'youAreFakeUser',
      desc: '',
      args: [],
    );
  }

  /// `You Must 18+`
  String get youMust18 {
    return Intl.message('You Must 18+', name: 'youMust18', desc: '', args: []);
  }

  /// `PAYMENT GATEWAY`
  String get paymentGateway {
    return Intl.message(
      'PAYMENT GATEWAY',
      name: 'paymentGateway',
      desc: '',
      args: [],
    );
  }

  /// `ACCOUNT DETAILS`
  String get accountDetails {
    return Intl.message(
      'ACCOUNT DETAILS',
      name: 'accountDetails',
      desc: '',
      args: [],
    );
  }

  /// `No Location`
  String get noLocation {
    return Intl.message('No Location', name: 'noLocation', desc: '', args: []);
  }

  /// `kms Away`
  String get kmsAway {
    return Intl.message('kms Away', name: 'kmsAway', desc: '', args: []);
  }

  /// `Check out this Profile`
  String get checkOutThisProfile {
    return Intl.message(
      'Check out this Profile',
      name: 'checkOutThisProfile',
      desc: '',
      args: [],
    );
  }

  /// `Look`
  String get look {
    return Intl.message('Look', name: 'look', desc: '', args: []);
  }

  /// `Reverse Swipe will cost you`
  String get reverseSwipeWillCostYou {
    return Intl.message(
      'Reverse Swipe will cost you',
      name: 'reverseSwipeWillCostYou',
      desc: '',
      args: [],
    );
  }

  /// `coins, Please confirm if you to continue or not`
  String get coinsPleaseConfirmIfYouToContinueOrNot {
    return Intl.message(
      'coins, Please confirm if you to continue or not',
      name: 'coinsPleaseConfirmIfYouToContinueOrNot',
      desc: '',
      args: [],
    );
  }

  /// `Message price will cost you`
  String get messagePriceWillCostYou {
    return Intl.message(
      'Message price will cost you',
      name: 'messagePriceWillCostYou',
      desc: '',
      args: [],
    );
  }

  /// `coins per Msg, Please confirm if you to continue or not`
  String get coinsPerMsgPleaseConfirmIfYouToContinueOr {
    return Intl.message(
      'coins per Msg, Please confirm if you to continue or not',
      name: 'coinsPerMsgPleaseConfirmIfYouToContinueOr',
      desc: '',
      args: [],
    );
  }

  /// `Live stream price will cost you`
  String get liveStreamPriceWillCostYou {
    return Intl.message(
      'Live stream price will cost you',
      name: 'liveStreamPriceWillCostYou',
      desc: '',
      args: [],
    );
  }

  /// `coins per minutes, Please confirm if you to continue or not`
  String get coinsPerMinutesPleaseConfirmIfYouToContinueOr {
    return Intl.message(
      'coins per minutes, Please confirm if you to continue or not',
      name: 'coinsPerMinutesPleaseConfirmIfYouToContinueOr',
      desc: '',
      args: [],
    );
  }

  /// `Live Stream Ended`
  String get liveStreamEnded {
    return Intl.message(
      'Live Stream Ended',
      name: 'liveStreamEnded',
      desc: '',
      args: [],
    );
  }

  /// `Saved Profiles`
  String get savedProfiles {
    return Intl.message(
      'Saved Profiles',
      name: 'savedProfiles',
      desc: '',
      args: [],
    );
  }

  /// `Like Profiles`
  String get likeProfiles {
    return Intl.message(
      'Like Profiles',
      name: 'likeProfiles',
      desc: '',
      args: [],
    );
  }

  /// `Blocked Profiles`
  String get blockedProfiles {
    return Intl.message(
      'Blocked Profiles',
      name: 'blockedProfiles',
      desc: '',
      args: [],
    );
  }

  /// `Lives`
  String get lives {
    return Intl.message('Lives', name: 'lives', desc: '', args: []);
  }

  /// `Feed`
  String get feed {
    return Intl.message('Feed', name: 'feed', desc: '', args: []);
  }

  /// `Comments`
  String get comments {
    return Intl.message('Comments', name: 'comments', desc: '', args: []);
  }

  /// `Add Comment`
  String get addComment {
    return Intl.message('Add Comment', name: 'addComment', desc: '', args: []);
  }

  /// `Photo`
  String get photo {
    return Intl.message('Photo', name: 'photo', desc: '', args: []);
  }

  /// `Write something here...`
  String get writeSomethingHere {
    return Intl.message(
      'Write something here...',
      name: 'writeSomethingHere',
      desc: '',
      args: [],
    );
  }

  /// `Create Post`
  String get createPost {
    return Intl.message('Create Post', name: 'createPost', desc: '', args: []);
  }

  /// `Post`
  String get post {
    return Intl.message('Post', name: 'post', desc: '', args: []);
  }

  /// `Select interests`
  String get selectInterestsToContinue {
    return Intl.message(
      'Select interests',
      name: 'selectInterestsToContinue',
      desc: '',
      args: [],
    );
  }

  /// `Posts`
  String get posts {
    return Intl.message('Posts', name: 'posts', desc: '', args: []);
  }

  /// `Follow`
  String get follow {
    return Intl.message('Follow', name: 'follow', desc: '', args: []);
  }

  /// `Followers`
  String get followers {
    return Intl.message('Followers', name: 'followers', desc: '', args: []);
  }

  /// `Following`
  String get following {
    return Intl.message('Following', name: 'following', desc: '', args: []);
  }

  /// `Following List`
  String get followingList {
    return Intl.message(
      'Following List',
      name: 'followingList',
      desc: '',
      args: [],
    );
  }

  /// `Search Profile`
  String get searchProfile {
    return Intl.message(
      'Search Profile',
      name: 'searchProfile',
      desc: '',
      args: [],
    );
  }

  /// `Unfollow`
  String get unfollow {
    return Intl.message('Unfollow', name: 'unfollow', desc: '', args: []);
  }

  /// `Comment Not Found`
  String get commentNotFound {
    return Intl.message(
      'Comment Not Found',
      name: 'commentNotFound',
      desc: '',
      args: [],
    );
  }

  /// `No Comment`
  String get noComment {
    return Intl.message('No Comment', name: 'noComment', desc: '', args: []);
  }

  /// `Reported Submitted`
  String get reportedSubmitted {
    return Intl.message(
      'Reported Submitted',
      name: 'reportedSubmitted',
      desc: '',
      args: [],
    );
  }

  /// `Reported Successfully!!`
  String get reportedSuccessfully {
    return Intl.message(
      'Reported Successfully!!',
      name: 'reportedSuccessfully',
      desc: '',
      args: [],
    );
  }

  /// `User Not Found!!`
  String get userNotFound {
    return Intl.message(
      'User Not Found!!',
      name: 'userNotFound',
      desc: '',
      args: [],
    );
  }

  /// `Do you really want to delete this chat You won’t be able to recover any kind of data after. Hope you are aware of that!`
  String get doYouReallyWantToDeleteThisChatYouWont {
    return Intl.message(
      'Do you really want to delete this chat You won’t be able to recover any kind of data after. Hope you are aware of that!',
      name: 'doYouReallyWantToDeleteThisChatYouWont',
      desc: '',
      args: [],
    );
  }

  /// `After deleting the chat, you can not restore our message. Message will be deleted from your account.`
  String get afterDeletingTheChatYouCanNotRestoreOurMessage {
    return Intl.message(
      'After deleting the chat, you can not restore our message. Message will be deleted from your account.',
      name: 'afterDeletingTheChatYouCanNotRestoreOurMessage',
      desc: '',
      args: [],
    );
  }

  /// `Are you sure you want to delete the post?`
  String get areYouSureYouWantToDeleteThePost {
    return Intl.message(
      'Are you sure you want to delete the post?',
      name: 'areYouSureYouWantToDeleteThePost',
      desc: '',
      args: [],
    );
  }

  /// `Delete post`
  String get deletePost {
    return Intl.message('Delete post', name: 'deletePost', desc: '', args: []);
  }

  /// `Report post`
  String get reportPost {
    return Intl.message('Report post', name: 'reportPost', desc: '', args: []);
  }

  /// `Do you want to delete this story?, You can not restore the story it will be permanently deleted.`
  String get doYouWantToDeleteThisStoryYouCanNot {
    return Intl.message(
      'Do you want to delete this story?, You can not restore the story it will be permanently deleted.',
      name: 'doYouWantToDeleteThisStoryYouCanNot',
      desc: '',
      args: [],
    );
  }

  /// `Delete this story?`
  String get deleteThisStory {
    return Intl.message(
      'Delete this story?',
      name: 'deleteThisStory',
      desc: '',
      args: [],
    );
  }

  /// `Please enter your age`
  String get pleaseEnterYourAge {
    return Intl.message(
      'Please enter your age',
      name: 'pleaseEnterYourAge',
      desc: '',
      args: [],
    );
  }

  /// `No Like Data`
  String get noLikeData {
    return Intl.message('No Like Data', name: 'noLikeData', desc: '', args: []);
  }

  /// `No Saved Data`
  String get noSavedData {
    return Intl.message(
      'No Saved Data',
      name: 'noSavedData',
      desc: '',
      args: [],
    );
  }

  /// `What do you want to select?`
  String get whatDoYouWantToSelect {
    return Intl.message(
      'What do you want to select?',
      name: 'whatDoYouWantToSelect',
      desc: '',
      args: [],
    );
  }

  /// `Read Less...`
  String get readLess {
    return Intl.message('Read Less...', name: 'readLess', desc: '', args: []);
  }

  /// `Read More...`
  String get readMore {
    return Intl.message('Read More...', name: 'readMore', desc: '', args: []);
  }

  /// `Video duration is`
  String get videoDurationIs {
    return Intl.message(
      'Video duration is',
      name: 'videoDurationIs',
      desc: '',
      args: [],
    );
  }

  /// `Large`
  String get large {
    return Intl.message('Large', name: 'large', desc: '', args: []);
  }

  /// `Comment delete ?`
  String get commentDelete {
    return Intl.message(
      'Comment delete ?',
      name: 'commentDelete',
      desc: '',
      args: [],
    );
  }

  /// `Are you sure you want to delete the comment ?`
  String get areYouSureYouWantToDeleteTheComment {
    return Intl.message(
      'Are you sure you want to delete the comment ?',
      name: 'areYouSureYouWantToDeleteTheComment',
      desc: '',
      args: [],
    );
  }

  /// `Enter UserName`
  String get enterUsername {
    return Intl.message(
      'Enter UserName',
      name: 'enterUsername',
      desc: '',
      args: [],
    );
  }

  /// `UserName`
  String get username {
    return Intl.message('UserName', name: 'username', desc: '', args: []);
  }

  /// `Follower List`
  String get followerList {
    return Intl.message(
      'Follower List',
      name: 'followerList',
      desc: '',
      args: [],
    );
  }

  /// `User did not allow camera and microphone permission.`
  String get userDidNotAllowCameraAndMicrophonePermission {
    return Intl.message(
      'User did not allow camera and microphone permission.',
      name: 'userDidNotAllowCameraAndMicrophonePermission',
      desc: '',
      args: [],
    );
  }

  /// `User did not allow camera`
  String get userDidNotAllowCamera {
    return Intl.message(
      'User did not allow camera',
      name: 'userDidNotAllowCamera',
      desc: '',
      args: [],
    );
  }

  /// `Open Settings`
  String get openSettings {
    return Intl.message(
      'Open Settings',
      name: 'openSettings',
      desc: '',
      args: [],
    );
  }

  /// `If appears that camera permission has not been granted. To the App, you will need to allow access to the camera from the settings.`
  String get ifAppearsThatCameraPermissionHasNotBeenGrantedTo {
    return Intl.message(
      'If appears that camera permission has not been granted. To the App, you will need to allow access to the camera from the settings.',
      name: 'ifAppearsThatCameraPermissionHasNotBeenGrantedTo',
      desc: '',
      args: [],
    );
  }

  /// `to access your camera and microphone`
  String get toAccessYourCameraAndMicrophone {
    return Intl.message(
      'to access your camera and microphone',
      name: 'toAccessYourCameraAndMicrophone',
      desc: '',
      args: [],
    );
  }

  /// `Please select your interests, or skip this step.`
  String get pleaseSelectYourInterestsOrSkipThisStep {
    return Intl.message(
      'Please select your interests, or skip this step.',
      name: 'pleaseSelectYourInterestsOrSkipThisStep',
      desc: '',
      args: [],
    );
  }

  /// `Previous`
  String get previous {
    return Intl.message('Previous', name: 'previous', desc: '', args: []);
  }

  /// `Swipe right to view the next profile.`
  String get swipeRightToViewTheNextProfile {
    return Intl.message(
      'Swipe right to view the next profile.',
      name: 'swipeRightToViewTheNextProfile',
      desc: '',
      args: [],
    );
  }

  /// `Gender Preference`
  String get genderPref {
    return Intl.message(
      'Gender Preference',
      name: 'genderPref',
      desc: '',
      args: [],
    );
  }

  /// `Age Preference`
  String get agePref {
    return Intl.message('Age Preference', name: 'agePref', desc: '', args: []);
  }

  /// `Continue With Email`
  String get continueWithEmail {
    return Intl.message(
      'Continue With Email',
      name: 'continueWithEmail',
      desc: '',
      args: [],
    );
  }

  /// `Already have an account?`
  String get alreadyHaveAnAccount {
    return Intl.message(
      'Already have an account?',
      name: 'alreadyHaveAnAccount',
      desc: '',
      args: [],
    );
  }

  /// `Login`
  String get login {
    return Intl.message('Login', name: 'login', desc: '', args: []);
  }

  /// `Email Address`
  String get emailAddress {
    return Intl.message(
      'Email Address',
      name: 'emailAddress',
      desc: '',
      args: [],
    );
  }

  /// `Go ahead and set up your account 🌟`
  String get goAheadAndSetUpYourAccount {
    return Intl.message(
      'Go ahead and set up your account 🌟',
      name: 'goAheadAndSetUpYourAccount',
      desc: '',
      args: [],
    );
  }

  /// `Welcome to your new journey of connections!`
  String get welcomeToYourNewJourneyOfConnections {
    return Intl.message(
      'Welcome to your new journey of connections!',
      name: 'welcomeToYourNewJourneyOfConnections',
      desc: '',
      args: [],
    );
  }

  /// `Reset your password and regain access. 🔒`
  String get resetYourPasswordAndRegainAccess {
    return Intl.message(
      'Reset your password and regain access. 🔒',
      name: 'resetYourPasswordAndRegainAccess',
      desc: '',
      args: [],
    );
  }

  /// `No worries, let's help you reset it!`
  String get noWorriesLetsHelpYouResetIt {
    return Intl.message(
      'No worries, let\'s help you reset it!',
      name: 'noWorriesLetsHelpYouResetIt',
      desc: '',
      args: [],
    );
  }

  /// `Create Profile 🚀`
  String get createProfile {
    return Intl.message(
      'Create Profile 🚀',
      name: 'createProfile',
      desc: '',
      args: [],
    );
  }

  /// `Let’s set up your perfect profile!`
  String get letsSetUpYourPerfectProfile {
    return Intl.message(
      'Let’s set up your perfect profile!',
      name: 'letsSetUpYourPerfectProfile',
      desc: '',
      args: [],
    );
  }

  /// `Date of birth`
  String get dateOfBirth {
    return Intl.message(
      'Date of birth',
      name: 'dateOfBirth',
      desc: '',
      args: [],
    );
  }

  /// `Find Matches 💘`
  String get findMatches {
    return Intl.message(
      'Find Matches 💘',
      name: 'findMatches',
      desc: '',
      args: [],
    );
  }

  /// `Discover people who match your vibe!`
  String get discoverPeopleWhoMatchYourVibe {
    return Intl.message(
      'Discover people who match your vibe!',
      name: 'discoverPeopleWhoMatchYourVibe',
      desc: '',
      args: [],
    );
  }

  /// `Preferred Gender`
  String get preferredGender {
    return Intl.message(
      'Preferred Gender',
      name: 'preferredGender',
      desc: '',
      args: [],
    );
  }

  /// `all`
  String get all {
    return Intl.message('all', name: 'all', desc: '', args: []);
  }

  /// `Age Range`
  String get ageRange {
    return Intl.message('Age Range', name: 'ageRange', desc: '', args: []);
  }

  /// `Distance Preference`
  String get distancePreference {
    return Intl.message(
      'Distance Preference',
      name: 'distancePreference',
      desc: '',
      args: [],
    );
  }

  /// `Find someone who truly understands you.`
  String get findSomeoneWhoTrulyUnderstandsYou {
    return Intl.message(
      'Find someone who truly understands you.',
      name: 'findSomeoneWhoTrulyUnderstandsYou',
      desc: '',
      args: [],
    );
  }

  /// `Relationship Goals 👩‍❤️‍👨`
  String get relationshipGoals {
    return Intl.message(
      'Relationship Goals 👩‍❤️‍👨',
      name: 'relationshipGoals',
      desc: '',
      args: [],
    );
  }

  /// `Discover Like-Minded People 🤗`
  String get discoverLikemindedPeople {
    return Intl.message(
      'Discover Like-Minded People 🤗',
      name: 'discoverLikemindedPeople',
      desc: '',
      args: [],
    );
  }

  /// `who truly understands you.`
  String get whoTrulyUnderstandsYou {
    return Intl.message(
      'who truly understands you.',
      name: 'whoTrulyUnderstandsYou',
      desc: '',
      args: [],
    );
  }

  /// `Find someone`
  String get findSomeone {
    return Intl.message(
      'Find someone',
      name: 'findSomeone',
      desc: '',
      args: [],
    );
  }

  /// `Find Religion 🙏`
  String get findReligion {
    return Intl.message(
      'Find Religion 🙏',
      name: 'findReligion',
      desc: '',
      args: [],
    );
  }

  /// `Select Languages 🌍`
  String get selectLanguages {
    return Intl.message(
      'Select Languages 🌍',
      name: 'selectLanguages',
      desc: '',
      args: [],
    );
  }

  /// `Add Your Profile Photos 📸`
  String get addYourProfilePhotos {
    return Intl.message(
      'Add Your Profile Photos 📸',
      name: 'addYourProfilePhotos',
      desc: '',
      args: [],
    );
  }

  /// `Let your photos tell your story.`
  String get letYourPhotosTellYourStory {
    return Intl.message(
      'Let your photos tell your story.',
      name: 'letYourPhotosTellYourStory',
      desc: '',
      args: [],
    );
  }

  /// `Add Photos`
  String get addPhotos {
    return Intl.message('Add Photos', name: 'addPhotos', desc: '', args: []);
  }

  /// `Your Profile is Ready.  🎉`
  String get yourProfileIsReady {
    return Intl.message(
      'Your Profile is Ready.  🎉',
      name: 'yourProfileIsReady',
      desc: '',
      args: [],
    );
  }

  /// `Religion`
  String get religion {
    return Intl.message('Religion', name: 'religion', desc: '', args: []);
  }

  /// `Language`
  String get language {
    return Intl.message('Language', name: 'language', desc: '', args: []);
  }

  /// `Languages i know`
  String get languagesIKnow {
    return Intl.message(
      'Languages i know',
      name: 'languagesIKnow',
      desc: '',
      args: [],
    );
  }

  /// `Social Links`
  String get socialLinks {
    return Intl.message(
      'Social Links',
      name: 'socialLinks',
      desc: '',
      args: [],
    );
  }

  /// `The password provided is too weak.`
  String get thePasswordProvidedIsTooWeak {
    return Intl.message(
      'The password provided is too weak.',
      name: 'thePasswordProvidedIsTooWeak',
      desc: '',
      args: [],
    );
  }

  /// `The account already exists for that email.`
  String get theAccountAlreadyExistsForThatEmail {
    return Intl.message(
      'The account already exists for that email.',
      name: 'theAccountAlreadyExistsForThatEmail',
      desc: '',
      args: [],
    );
  }

  /// `No user found with that email. Please register with this email.`
  String get noUserFoundWithThatEmailPleaseRegisterWithThis {
    return Intl.message(
      'No user found with that email. Please register with this email.',
      name: 'noUserFoundWithThatEmailPleaseRegisterWithThis',
      desc: '',
      args: [],
    );
  }

  /// `Incorrect password provided for this user.`
  String get incorrectPasswordProvidedForThisUser {
    return Intl.message(
      'Incorrect password provided for this user.',
      name: 'incorrectPasswordProvidedForThisUser',
      desc: '',
      args: [],
    );
  }

  /// `A verification link has been sent to your email. Please verify the link to log in.`
  String get aVerificationLinkHasBeenSentToYourEmailPlease {
    return Intl.message(
      'A verification link has been sent to your email. Please verify the link to log in.',
      name: 'aVerificationLinkHasBeenSentToYourEmailPlease',
      desc: '',
      args: [],
    );
  }

  /// `Select your relationship goal`
  String get selectYourRelationshipGoal {
    return Intl.message(
      'Select your relationship goal',
      name: 'selectYourRelationshipGoal',
      desc: '',
      args: [],
    );
  }

  /// `Select your religion`
  String get selectYourReligion {
    return Intl.message(
      'Select your religion',
      name: 'selectYourReligion',
      desc: '',
      args: [],
    );
  }

  /// `Select your language`
  String get selectYourLanguage {
    return Intl.message(
      'Select your language',
      name: 'selectYourLanguage',
      desc: '',
      args: [],
    );
  }

  /// `Please add relationship goals in the admin panel to continue completing your profile.`
  String get pleaseAddRelationshipGoalsInTheAdminPanelToContinue {
    return Intl.message(
      'Please add relationship goals in the admin panel to continue completing your profile.',
      name: 'pleaseAddRelationshipGoalsInTheAdminPanelToContinue',
      desc: '',
      args: [],
    );
  }

  /// `Please add Interest in the admin panel to continue completing your profile.`
  String get pleaseAddInterestsInTheAdminPanelToContinue {
    return Intl.message(
      'Please add Interest in the admin panel to continue completing your profile.',
      name: 'pleaseAddInterestsInTheAdminPanelToContinue',
      desc: '',
      args: [],
    );
  }

  /// `Please add Religion in the admin panel to continue completing your profile.`
  String get pleaseAddReligionInTheAdminPanelToContinue {
    return Intl.message(
      'Please add Religion in the admin panel to continue completing your profile.',
      name: 'pleaseAddReligionInTheAdminPanelToContinue',
      desc: '',
      args: [],
    );
  }

  /// `Please add Languages in the admin panel to continue completing your profile.`
  String get pleaseAddLanguagesInTheAdminPanelToContinue {
    return Intl.message(
      'Please add Languages in the admin panel to continue completing your profile.',
      name: 'pleaseAddLanguagesInTheAdminPanelToContinue',
      desc: '',
      args: [],
    );
  }

  /// `SWIPE RIGHT`
  String get swipeRight {
    return Intl.message('SWIPE RIGHT', name: 'swipeRight', desc: '', args: []);
  }

  /// `Filter`
  String get filter {
    return Intl.message('Filter', name: 'filter', desc: '', args: []);
  }

  /// `Match`
  String get match {
    return Intl.message('Match', name: 'match', desc: '', args: []);
  }

  /// `Find`
  String get find {
    return Intl.message('Find', name: 'find', desc: '', args: []);
  }

  /// `Your Matching`
  String get yourMatching {
    return Intl.message(
      'Your Matching',
      name: 'yourMatching',
      desc: '',
      args: [],
    );
  }

  /// `Go to Profile`
  String get goToProfile {
    return Intl.message(
      'Go to Profile',
      name: 'goToProfile',
      desc: '',
      args: [],
    );
  }

  /// `It's a match!`
  String get itsAMatch {
    return Intl.message(
      'It\'s a match!',
      name: 'itsAMatch',
      desc: '',
      args: [],
    );
  }

  /// `Premium`
  String get premium {
    return Intl.message('Premium', name: 'premium', desc: '', args: []);
  }

  /// `Restore`
  String get restore {
    return Intl.message('Restore', name: 'restore', desc: '', args: []);
  }

  /// `Upgrade Experience`
  String get upgradeExperience {
    return Intl.message(
      'Upgrade Experience',
      name: 'upgradeExperience',
      desc: '',
      args: [],
    );
  }

  /// `Subscribe`
  String get subscribe {
    return Intl.message('Subscribe', name: 'subscribe', desc: '', args: []);
  }

  /// `Subscribe now`
  String get subscribeNow {
    return Intl.message(
      'Subscribe now',
      name: 'subscribeNow',
      desc: '',
      args: [],
    );
  }

  /// `Get Unlimited Reverse Swipe`
  String get getUnlimitedReverseSwipe {
    return Intl.message(
      'Get Unlimited Reverse Swipe',
      name: 'getUnlimitedReverseSwipe',
      desc: '',
      args: [],
    );
  }

  /// `Get Verified Badge`
  String get getVerifiedBadge {
    return Intl.message(
      'Get Verified Badge',
      name: 'getVerifiedBadge',
      desc: '',
      args: [],
    );
  }

  /// `Free Live`
  String get freeLive {
    return Intl.message('Free Live', name: 'freeLive', desc: '', args: []);
  }

  /// `Ad Free Experience`
  String get adFreeExperience {
    return Intl.message(
      'Ad Free Experience',
      name: 'adFreeExperience',
      desc: '',
      args: [],
    );
  }

  /// `Free Chat`
  String get freeChat {
    return Intl.message('Free Chat', name: 'freeChat', desc: '', args: []);
  }

  /// `Upgrade To Enjoy All The Features.`
  String get upgradeToEnjoyAllTheFeatures {
    return Intl.message(
      'Upgrade To Enjoy All The Features.',
      name: 'upgradeToEnjoyAllTheFeatures',
      desc: '',
      args: [],
    );
  }

  /// `The subscriptions renews automatically as per the plan unless cancelled with 24 hours before the end of current period. you can manage and cancel subscriptions anytime from the app store/play store settings.`
  String get theSubscriptionsRenewsAutomaticallyAsPerThePlanUnlessCancelled {
    return Intl.message(
      'The subscriptions renews automatically as per the plan unless cancelled with 24 hours before the end of current period. you can manage and cancel subscriptions anytime from the app store/play store settings.',
      name: 'theSubscriptionsRenewsAutomaticallyAsPerThePlanUnlessCancelled',
      desc: '',
      args: [],
    );
  }

  /// `No, Thanks`
  String get noThanks {
    return Intl.message('No, Thanks', name: 'noThanks', desc: '', args: []);
  }

  /// `Upgrade from`
  String get upgradeFrom {
    return Intl.message(
      'Upgrade from',
      name: 'upgradeFrom',
      desc: '',
      args: [],
    );
  }

  /// `Please enter your name.`
  String get pleaseEnterYourName {
    return Intl.message(
      'Please enter your name.',
      name: 'pleaseEnterYourName',
      desc: '',
      args: [],
    );
  }

  /// `Please select document file.`
  String get pleaseSelectDocumentFile {
    return Intl.message(
      'Please select document file.',
      name: 'pleaseSelectDocumentFile',
      desc: '',
      args: [],
    );
  }

  /// `Days`
  String get days {
    return Intl.message('Days', name: 'days', desc: '', args: []);
  }

  /// `Weeks`
  String get weeks {
    return Intl.message('Weeks', name: 'weeks', desc: '', args: []);
  }

  /// `Months`
  String get months {
    return Intl.message('Months', name: 'months', desc: '', args: []);
  }

  /// `Years`
  String get years {
    return Intl.message('Years', name: 'years', desc: '', args: []);
  }

  /// `Day`
  String get day {
    return Intl.message('Day', name: 'day', desc: '', args: []);
  }

  /// `Week`
  String get week {
    return Intl.message('Week', name: 'week', desc: '', args: []);
  }

  /// `Month`
  String get month {
    return Intl.message('Month', name: 'month', desc: '', args: []);
  }

  /// `Year`
  String get year {
    return Intl.message('Year', name: 'year', desc: '', args: []);
  }

  /// `Lifetime`
  String get lifetime {
    return Intl.message('Lifetime', name: 'lifetime', desc: '', args: []);
  }

  /// `Annual`
  String get annual {
    return Intl.message('Annual', name: 'annual', desc: '', args: []);
  }

  /// `6 Month`
  String get sixMonth {
    return Intl.message('6 Month', name: 'sixMonth', desc: '', args: []);
  }

  /// `3 Month`
  String get threeMonth {
    return Intl.message('3 Month', name: 'threeMonth', desc: '', args: []);
  }

  /// `2 Month`
  String get twoMonth {
    return Intl.message('2 Month', name: 'twoMonth', desc: '', args: []);
  }

  /// `Monthly`
  String get monthly {
    return Intl.message('Monthly', name: 'monthly', desc: '', args: []);
  }

  /// `Weekly`
  String get weekly {
    return Intl.message('Weekly', name: 'weekly', desc: '', args: []);
  }

  /// `@price / Month. Billed @unit_label`
  String get subscriptionDescription {
    return Intl.message(
      '@price / Month. Billed @unit_label',
      name: 'subscriptionDescription',
      desc: '',
      args: [],
    );
  }

  /// `Give it a try`
  String get giveItATry {
    return Intl.message(
      'Give it a try',
      name: 'giveItATry',
      desc: '',
      args: [],
    );
  }

  /// `@count @get_period Free trial`
  String get freeTrialDescription {
    return Intl.message(
      '@count @get_period Free trial',
      name: 'freeTrialDescription',
      desc: '',
      args: [],
    );
  }

  /// `Annually`
  String get annually {
    return Intl.message('Annually', name: 'annually', desc: '', args: []);
  }

  /// `Semi Annually`
  String get semiAnnually {
    return Intl.message(
      'Semi Annually',
      name: 'semiAnnually',
      desc: '',
      args: [],
    );
  }

  /// `Three Months`
  String get threeMonths {
    return Intl.message(
      'Three Months',
      name: 'threeMonths',
      desc: '',
      args: [],
    );
  }

  /// `Two Months`
  String get twoMonths {
    return Intl.message('Two Months', name: 'twoMonths', desc: '', args: []);
  }

  /// `You are premium member`
  String get youArePremiumMember {
    return Intl.message(
      'You are premium member',
      name: 'youArePremiumMember',
      desc: '',
      args: [],
    );
  }

  /// `Don’t show this profile again`
  String get dontShowThisProfileAgain {
    return Intl.message(
      'Don’t show this profile again',
      name: 'dontShowThisProfileAgain',
      desc: '',
      args: [],
    );
  }

  /// `Next Profile`
  String get nextProfile {
    return Intl.message(
      'Next Profile',
      name: 'nextProfile',
      desc: '',
      args: [],
    );
  }

  /// `A reset password link has been sent to your email. Please use it to reset your password.`
  String get aResetPasswordLinkHasBeenSentToYourEmail {
    return Intl.message(
      'A reset password link has been sent to your email. Please use it to reset your password.',
      name: 'aResetPasswordLinkHasBeenSentToYourEmail',
      desc: '',
      args: [],
    );
  }

  /// `No more profile matches found`
  String get noMoreProfileMatchesFound {
    return Intl.message(
      'No more profile matches found',
      name: 'noMoreProfileMatchesFound',
      desc: '',
      args: [],
    );
  }

  /// `Hidden Profile`
  String get hiddenProfile {
    return Intl.message(
      'Hidden Profile',
      name: 'hiddenProfile',
      desc: '',
      args: [],
    );
  }

  /// `Hidden Profiles`
  String get hiddenProfiles {
    return Intl.message(
      'Hidden Profiles',
      name: 'hiddenProfiles',
      desc: '',
      args: [],
    );
  }

  /// `UnHide`
  String get unhide {
    return Intl.message('UnHide', name: 'unhide', desc: '', args: []);
  }

  /// `Show`
  String get show {
    return Intl.message('Show', name: 'show', desc: '', args: []);
  }

  /// `Are you sure you want to show this profile again ?`
  String get areYouSureYouWantToShowThisProfileAgain {
    return Intl.message(
      'Are you sure you want to show this profile again ?',
      name: 'areYouSureYouWantToShowThisProfileAgain',
      desc: '',
      args: [],
    );
  }

  /// `Hurry up and join before it ends.`
  String get hurryUpAndJoinBeforeItEnds {
    return Intl.message(
      'Hurry up and join before it ends.',
      name: 'hurryUpAndJoinBeforeItEnds',
      desc: '',
      args: [],
    );
  }

  /// `By Continuing,\n`
  String get toContinueBelown {
    return Intl.message(
      'By Continuing,\n',
      name: 'toContinueBelown',
      desc: '',
      args: [],
    );
  }

  /// `Allow Location Access`
  String get allowLocationAccess {
    return Intl.message(
      'Allow Location Access',
      name: 'allowLocationAccess',
      desc: '',
      args: [],
    );
  }

  /// `Allow @appname to access your location to find matches nearby and enhance your dating experience.`
  String get allowOrangeToAccessYourLocationToFindMatchesNearby {
    return Intl.message(
      'Allow @appname to access your location to find matches nearby and enhance your dating experience.',
      name: 'allowOrangeToAccessYourLocationToFindMatchesNearby',
      desc: '',
      args: [],
    );
  }

  /// `Allow Permission`
  String get allowPermission {
    return Intl.message(
      'Allow Permission',
      name: 'allowPermission',
      desc: '',
      args: [],
    );
  }

  /// `I will do it later`
  String get iWillDoItLater {
    return Intl.message(
      'I will do it later',
      name: 'iWillDoItLater',
      desc: '',
      args: [],
    );
  }

  /// `To see nearby profiles, we need access to your location. Without it, you won't be able to view people around you.`
  String get toSeeNearbyProfilesWeNeedAccessToYourLocation {
    return Intl.message(
      'To see nearby profiles, we need access to your location. Without it, you won\'t be able to view people around you.',
      name: 'toSeeNearbyProfilesWeNeedAccessToYourLocation',
      desc: '',
      args: [],
    );
  }

  /// `Random Screen`
  String get randomScreen {
    return Intl.message(
      'Random Screen',
      name: 'randomScreen',
      desc: '',
      args: [],
    );
  }

  /// `Find match`
  String get findMatch {
    return Intl.message('Find match', name: 'findMatch', desc: '', args: []);
  }

  /// `Preferences`
  String get preferences {
    return Intl.message('Preferences', name: 'preferences', desc: '', args: []);
  }

  /// `City`
  String get city {
    return Intl.message('City', name: 'city', desc: '', args: []);
  }

  /// `Country`
  String get country {
    return Intl.message('Country', name: 'country', desc: '', args: []);
  }

  /// `Search Here`
  String get searchHere {
    return Intl.message('Search Here', name: 'searchHere', desc: '', args: []);
  }

  /// `State`
  String get state {
    return Intl.message('State', name: 'state', desc: '', args: []);
  }

  /// `Please select country`
  String get pleaseSelectCountry {
    return Intl.message(
      'Please select country',
      name: 'pleaseSelectCountry',
      desc: '',
      args: [],
    );
  }

  /// `Please select state`
  String get pleaseSelectState {
    return Intl.message(
      'Please select state',
      name: 'pleaseSelectState',
      desc: '',
      args: [],
    );
  }

  /// `Please select city`
  String get pleaseSelectCity {
    return Intl.message(
      'Please select city',
      name: 'pleaseSelectCity',
      desc: '',
      args: [],
    );
  }

  /// `Make Your Preference Wider`
  String get makeYourPreferenceWider {
    return Intl.message(
      'Make Your Preference Wider',
      name: 'makeYourPreferenceWider',
      desc: '',
      args: [],
    );
  }

  /// `Try expanding your age or distance preferences, or switch interests to discover more people.`
  String get tryExpandingYourAgeOrDistancePreferencesOrSwitchInterests {
    return Intl.message(
      'Try expanding your age or distance preferences, or switch interests to discover more people.',
      name: 'tryExpandingYourAgeOrDistancePreferencesOrSwitchInterests',
      desc: '',
      args: [],
    );
  }

  /// `No matches found.`
  String get noMatchesFound {
    return Intl.message(
      'No matches found.',
      name: 'noMatchesFound',
      desc: '',
      args: [],
    );
  }

  /// `Do you really want to hide this profile? Once hidden, it will no longer appear in Explore, Search, or your Feed.`
  String get doYouReallyWantToHideThisProfileOnceHidden {
    return Intl.message(
      'Do you really want to hide this profile? Once hidden, it will no longer appear in Explore, Search, or your Feed.',
      name: 'doYouReallyWantToHideThisProfileOnceHidden',
      desc: '',
      args: [],
    );
  }

  /// `Member`
  String get member {
    return Intl.message('Member', name: 'member', desc: '', args: []);
  }

  /// `You are`
  String get youAre {
    return Intl.message('You are', name: 'youAre', desc: '', args: []);
  }

  /// `Are you sure you want to unblock this user?`
  String get areYouSureYouWantToUnblockThisUser {
    return Intl.message(
      'Are you sure you want to unblock this user?',
      name: 'areYouSureYouWantToUnblockThisUser',
      desc: '',
      args: [],
    );
  }

  /// `Match Preference`
  String get matchPreference {
    return Intl.message(
      'Match Preference',
      name: 'matchPreference',
      desc: '',
      args: [],
    );
  }

  /// `has liked your profile.`
  String get hasLikedYourProfile {
    return Intl.message(
      'has liked your profile.',
      name: 'hasLikedYourProfile',
      desc: '',
      args: [],
    );
  }

  /// `has followed your profile.`
  String get hasFollowedYourProfile {
    return Intl.message(
      'has followed your profile.',
      name: 'hasFollowedYourProfile',
      desc: '',
      args: [],
    );
  }

  /// `has liked your post`
  String get hasLikedYourPost {
    return Intl.message(
      'has liked your post',
      name: 'hasLikedYourPost',
      desc: '',
      args: [],
    );
  }

  /// `has commented on your post`
  String get hasCommentedOnYourPost {
    return Intl.message(
      'has commented on your post',
      name: 'hasCommentedOnYourPost',
      desc: '',
      args: [],
    );
  }

  /// `Are you sure you want to dislike this user?`
  String get areYouSureYouWantToDislikeThisUser {
    return Intl.message(
      'Are you sure you want to dislike this user?',
      name: 'areYouSureYouWantToDislikeThisUser',
      desc: '',
      args: [],
    );
  }

  /// `Start Finding`
  String get startFinding {
    return Intl.message(
      'Start Finding',
      name: 'startFinding',
      desc: '',
      args: [],
    );
  }

  /// `Your Matchings`
  String get yourMatchings {
    return Intl.message(
      'Your Matchings',
      name: 'yourMatchings',
      desc: '',
      args: [],
    );
  }

  /// `Post created successfully`
  String get postCreatedSuccessfully {
    return Intl.message(
      'Post created successfully',
      name: 'postCreatedSuccessfully',
      desc: '',
      args: [],
    );
  }

  /// `If you close the sheet your message coin will be lost`
  String get ifYouCloseTheSheetYourMessageCoinWillBe {
    return Intl.message(
      'If you close the sheet your message coin will be lost',
      name: 'ifYouCloseTheSheetYourMessageCoinWillBe',
      desc: '',
      args: [],
    );
  }
}

class AppLocalizationDelegate extends LocalizationsDelegate<S> {
  const AppLocalizationDelegate();

  List<Locale> get supportedLocales {
    return const <Locale>[
      Locale.fromSubtags(languageCode: 'en'),
      Locale.fromSubtags(languageCode: 'ar'),
      Locale.fromSubtags(languageCode: 'da'),
      Locale.fromSubtags(languageCode: 'de'),
      Locale.fromSubtags(languageCode: 'el'),
      Locale.fromSubtags(languageCode: 'es'),
      Locale.fromSubtags(languageCode: 'fr'),
      Locale.fromSubtags(languageCode: 'hi'),
      Locale.fromSubtags(languageCode: 'id'),
      Locale.fromSubtags(languageCode: 'it'),
      Locale.fromSubtags(languageCode: 'ja'),
      Locale.fromSubtags(languageCode: 'ko'),
      Locale.fromSubtags(languageCode: 'nb'),
      Locale.fromSubtags(languageCode: 'nl'),
      Locale.fromSubtags(languageCode: 'pl'),
      Locale.fromSubtags(languageCode: 'pt'),
      Locale.fromSubtags(languageCode: 'ru'),
      Locale.fromSubtags(languageCode: 'th'),
      Locale.fromSubtags(languageCode: 'tr'),
      Locale.fromSubtags(languageCode: 'vi'),
      Locale.fromSubtags(languageCode: 'zh'),
    ];
  }

  @override
  bool isSupported(Locale locale) => _isSupported(locale);
  @override
  Future<S> load(Locale locale) => S.load(locale);
  @override
  bool shouldReload(AppLocalizationDelegate old) => false;

  bool _isSupported(Locale locale) {
    for (var supportedLocale in supportedLocales) {
      if (supportedLocale.languageCode == locale.languageCode) {
        return true;
      }
    }
    return false;
  }
}
