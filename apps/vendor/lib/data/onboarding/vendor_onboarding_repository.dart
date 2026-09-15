import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:http_parser/http_parser.dart';
import 'package:ore_core/ore_core.dart';

class VendorApplicationStatus {
  const VendorApplicationStatus({
    required this.id,
    required this.kind,
    required this.status,
    required this.currentStage,
    required this.maxStages,
    this.reason,
    this.requiresActionField,
    this.stageData = const <String, dynamic>{},
    this.vendorType,
    this.businessName,
    this.applicantName,
  });

  final String id;
  final String kind;
  final String status;
  final int currentStage;
  final int maxStages;
  final String? reason;
  final String? requiresActionField;
  final Map<String, dynamic> stageData;
  final String? vendorType;
  final String? businessName;
  final String? applicantName;

  factory VendorApplicationStatus.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Vendor application must be an object');
    return VendorApplicationStatus(
      id: _requiredString(json['id'], 'application.id'),
      kind: _requiredString(json['kind'], 'application.kind'),
      status: _requiredString(json['status'], 'application.status'),
      currentStage: _requiredInt(json['currentStage'], 'application.currentStage'),
      maxStages: _requiredInt(json['maxStages'], 'application.maxStages'),
      reason: json['reason'] as String?,
      requiresActionField: json['requiresActionField'] as String?,
      stageData: json['stageData'] is Map ? Map<String, dynamic>.from(json['stageData'] as Map) : const <String, dynamic>{},
      vendorType: json['vendorType'] as String?,
      businessName: json['businessName'] as String?,
      applicantName: json['applicantName'] as String?,
    );
  }
}

class VendorDocumentRecord {
  const VendorDocumentRecord({required this.id, required this.kind, required this.fileName, required this.contentType, required this.createdAt});

  final String id;
  final String kind;
  final String fileName;
  final String contentType;
  final DateTime createdAt;

  factory VendorDocumentRecord.fromJson(Object? json) {
    if (json is! Map) throw const FormatException('Vendor document must be an object');
    final createdAt = json['createdAt'] is String ? DateTime.tryParse(json['createdAt'] as String) : null;
    if (json['id'] is! String || json['kind'] is! String || json['fileName'] is! String || json['contentType'] is! String || createdAt == null) {
      throw const FormatException('Vendor document fields are invalid');
    }
    return VendorDocumentRecord(id: json['id'] as String, kind: json['kind'] as String, fileName: json['fileName'] as String, contentType: json['contentType'] as String, createdAt: createdAt);
  }
}

class VendorDocumentContent {
  const VendorDocumentContent({required this.contentType, required this.bytes});

  final String contentType;
  final Uint8List bytes;
}

class VendorPayoutProvider {
  const VendorPayoutProvider({required this.name, required this.code, required this.type});

  final String name;
  final String code;
  final String type;

  factory VendorPayoutProvider.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) throw const FormatException('Payout provider must be an object');
    return VendorPayoutProvider(
      name: _requiredString(json['name'], 'provider.name'),
      code: _requiredString(json['code'], 'provider.code'),
      type: _requiredString(json['type'], 'provider.type'),
    );
  }
}

class VendorOnboardingRepository {
  const VendorOnboardingRepository(this._client);

  final OreApiClient _client;

  Future<List<VendorDocumentRecord>> getDocuments() async {
    final response = await _client.getFresh<List<dynamic>>(OreEndpoints.onboardingDocuments);
    return (response.data ?? const <dynamic>[]).map(VendorDocumentRecord.fromJson).toList();
  }

  Future<VendorDocumentContent> getDocument(String documentId) async {
    final response = await _client.get<List<int>>(
      OreEndpoints.mediaDocument(documentId),
      options: Options(responseType: ResponseType.bytes),
    );
    final bytes = response.data;
    if (bytes == null || bytes.isEmpty) throw const FormatException('Document response is empty');
    final contentType = response.headers.value('content-type') ?? 'application/octet-stream';
    return VendorDocumentContent(
      contentType: contentType.split(';').first.trim().toLowerCase(),
      bytes: Uint8List.fromList(bytes),
    );
  }

  Future<List<VendorPayoutProvider>> getPayoutProviders(String type) async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.payoutProviders,
      query: <String, dynamic>{'type': type},
    );
    return (response.data ?? const <dynamic>[]).map(VendorPayoutProvider.fromJson).toList();
  }

  Future<VendorApplicationStatus> getStatus() async {
    final response = await _client.getFresh<Map<String, dynamic>>(
      OreEndpoints.onboardingStatus,
      query: const <String, dynamic>{'kind': 'VENDOR'},
    );
    return VendorApplicationStatus.fromJson(response.data);
  }

  Future<VendorApplicationStatus> saveStage(int stage, Map<String, dynamic> data) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.vendorStage(stage),
      data: data,
    );
    return VendorApplicationStatus.fromJson(response.data);
  }

  Future<String> uploadDocument({
    required String applicationId,
    required String documentType,
    required String fileName,
    required String contentType,
    required List<int> bytes,
  }) async {
    if (bytes.isEmpty || bytes.length > 10 * 1024 * 1024) {
      throw ArgumentError('Document must be between 1 byte and 10 MB');
    }
    final key = 'onboarding-documents/$applicationId/vendor-$documentType-${DateTime.now().millisecondsSinceEpoch}-$fileName';
    await _client.post<Map<String, dynamic>>(
      OreEndpoints.mediaUpload,
      data: <String, dynamic>{
        'key': key,
        'contentType': contentType,
        'dataBase64': base64Encode(bytes),
      },
    );
    return key;
  }

  Future<void> submitVendorSmileDocument({
    required String givenNames,
    required String lastName,
    required String email,
    required String phoneNumber,
    required String idNumber,
    required String selfieBase64,
    required List<String> angleImagesBase64,
    required String documentFrontBase64,
    required String documentFrontName,
    String? documentBackBase64,
    String? documentBackName,
    required Map<String, dynamic> stage4,
    required Map<String, dynamic> stage5,
  }) async {
    if (angleImagesBase64.length < 6) throw ArgumentError('At least six liveness images are required');
    final fields = <String, dynamic>{
      'selfie': MultipartFile.fromBytes(base64Decode(selfieBase64), filename: 'selfie.jpg', contentType: MediaType('image', 'jpeg')),
      'document_front': MultipartFile.fromBytes(base64Decode(documentFrontBase64), filename: documentFrontName, contentType: _mediaType(documentFrontName)),
      'given_names': givenNames,
      'last_name': lastName,
      'email': email,
      'phone_number': phoneNumber,
      'id_type': 'GHANA_CARD',
      'id_number': idNumber,
      'consent': jsonEncode(<String, dynamic>{'granted': true, 'source': 'vendor_onboarding', 'granted_at': DateTime.now().toUtc().toIso8601String()}),
      'stage4': jsonEncode(stage4),
      'stage5': jsonEncode(stage5),
    };
    if (documentBackBase64 != null) {
      fields['document_back'] = MultipartFile.fromBytes(base64Decode(documentBackBase64), filename: documentBackName ?? 'document_back.jpg', contentType: _mediaType(documentBackName ?? 'document_back.jpg'));
    }
    for (var index = 0; index < angleImagesBase64.length; index++) {
      fields['liveness_${index + 1}'] = MultipartFile.fromBytes(base64Decode(angleImagesBase64[index]), filename: 'liveness_${index + 1}.jpg', contentType: MediaType('image', 'jpeg'));
    }
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.vendorSmileDocumentSubmission,
      data: FormData.fromMap(fields),
    );
    if (response.data?['jobId'] is! String) throw const FormatException('Vendor SmileID submission did not return a job ID');
  }

  Future<void> verifyPayout({
    required String type,
    required String provider,
    required String accountNumber,
    required String accountName,
  }) async {
    final response = await _client.post<Map<String, dynamic>>(
      OreEndpoints.verifyPayout,
      data: <String, String>{
        'type': type,
        'provider': provider,
        'accountNumber': accountNumber,
        'accountName': accountName,
      },
    );
    if (response.data?['verified'] != true) {
      throw const FormatException('Payout account was not verified');
    }
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) throw FormatException('Missing or invalid $field');
  return value;
}

int _requiredInt(Object? value, String field) {
  if (value is num) return value.toInt();
  throw FormatException('Missing or invalid $field');
}

MediaType _mediaType(String filename) {
  return filename.toLowerCase().endsWith('.png') ? MediaType('image', 'png') : MediaType('image', 'jpeg');
}
