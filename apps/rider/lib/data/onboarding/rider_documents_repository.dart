import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:ore_core/ore_core.dart';

class RiderDocumentRecord {
  const RiderDocumentRecord({
    required this.id,
    required this.kind,
    required this.fileName,
    required this.contentType,
    required this.createdAt,
  });

  final String id;
  final String kind;
  final String fileName;
  final String contentType;
  final DateTime createdAt;

  factory RiderDocumentRecord.fromJson(Object? json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Document record must be a JSON object');
    }
    final createdAt = DateTime.tryParse(json['createdAt']?.toString() ?? '');
    if (createdAt == null) {
      throw const FormatException('Document record createdAt is invalid');
    }
    return RiderDocumentRecord(
      id: _requiredString(json['id'], 'id'),
      kind: _requiredString(json['kind'], 'kind'),
      fileName: _requiredString(json['fileName'], 'fileName'),
      contentType: _requiredString(json['contentType'], 'contentType'),
      createdAt: createdAt,
    );
  }
}

class RiderDocumentContent {
  const RiderDocumentContent({required this.bytes, required this.contentType});

  final Uint8List bytes;
  final String contentType;
}

/// Reads the authenticated rider's private onboarding documents.
class RiderDocumentsRepository {
  const RiderDocumentsRepository(this._client);

  final OreApiClient _client;

  Future<List<RiderDocumentRecord>> list() async {
    final response = await _client.getFresh<List<dynamic>>(
      OreEndpoints.onboardingDocuments,
    );
    return (response.data ?? const <dynamic>[])
        .map(RiderDocumentRecord.fromJson)
        .toList();
  }

  Future<RiderDocumentContent> read(String documentId) async {
    final response = await _client.get<List<int>>(
      OreEndpoints.mediaDocument(documentId),
      options: Options(responseType: ResponseType.bytes),
    );
    final bytes = response.data;
    if (bytes == null || bytes.isEmpty) {
      throw const FormatException('Document response is empty');
    }
    final contentType = response.headers.value('content-type') ??
        'application/octet-stream';
    return RiderDocumentContent(
      bytes: Uint8List.fromList(bytes),
      contentType: contentType.split(';').first.trim().toLowerCase(),
    );
  }
}

String _requiredString(Object? value, String field) {
  if (value is! String || value.isEmpty) {
    throw FormatException('Missing or invalid document $field');
  }
  return value;
}
