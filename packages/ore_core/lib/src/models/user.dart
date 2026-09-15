import 'address.dart';

enum UserRole { customer, vendor, rider, admin }

class OreUser {
  final String id;
  final String? name;
  final String phone;
  final String? email;
  final String? photoUrl;
  final UserRole role;
  final double rating;
  final bool isVerified;
  final String? token;
  final OreAddress? defaultAddress;

  const OreUser({
    required this.id,
    this.name,
    required this.phone,
    this.email,
    this.photoUrl,
    this.role = UserRole.customer,
    this.rating = 0,
    this.isVerified = false,
    this.token,
    this.defaultAddress,
  });

  bool get isLoggedIn => token != null && token!.isNotEmpty;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'email': email,
        'photo_url': photoUrl,
        'role': role.name,
        'rating': rating,
        'is_verified': isVerified,
        'token': token,
        'default_address': defaultAddress?.toJson(),
      };

  factory OreUser.fromJson(Map<String, dynamic> json) => OreUser(
        id: json['id'] as String,
        name: json['name'] as String?,
        phone: json['phone'] as String? ?? '',
        email: json['email'] as String?,
        photoUrl: json['photo_url'] as String?,
        role: UserRole.values.firstWhere(
          (r) => r.name == json['role'],
          orElse: () => UserRole.customer,
        ),
        rating: (json['rating'] as num?)?.toDouble() ?? 0,
        isVerified: json['is_verified'] as bool? ?? false,
        token: json['token'] as String?,
        defaultAddress: json['default_address'] != null
            ? OreAddress.fromJson(
                json['default_address'] as Map<String, dynamic>)
            : null,
      );
}
