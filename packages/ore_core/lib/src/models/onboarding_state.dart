/// Canonical Onboarding & Registration Models matching Ore Architecture Spec.

enum AppRole {
  customer,
  rider,
  vendor,
  admin,
}

enum OnboardingAppStatus {
  draft,
  inProgress,
  verificationPending,
  pendingReview,
  approved,
  rejected,
  requiresAction,
  suspended,
}

extension OnboardingAppStatusX on OnboardingAppStatus {
  static OnboardingAppStatus fromString(String? val) {
    switch (val?.toUpperCase()) {
      case 'DRAFT':
        return OnboardingAppStatus.draft;
      case 'IN_PROGRESS':
        return OnboardingAppStatus.inProgress;
      case 'VERIFICATION_PENDING':
        return OnboardingAppStatus.verificationPending;
      case 'PENDING_REVIEW':
        return OnboardingAppStatus.pendingReview;
      case 'APPROVED':
        return OnboardingAppStatus.approved;
      case 'REJECTED':
        return OnboardingAppStatus.rejected;
      case 'REQUIRES_ACTION':
        return OnboardingAppStatus.requiresAction;
      case 'SUSPENDED':
        return OnboardingAppStatus.suspended;
      default:
        return OnboardingAppStatus.draft;
    }
  }

  String get label {
    switch (this) {
      case OnboardingAppStatus.draft:
        return 'Draft';
      case OnboardingAppStatus.inProgress:
        return 'In Progress';
      case OnboardingAppStatus.verificationPending:
        return 'Verifying Identity';
      case OnboardingAppStatus.pendingReview:
        return 'Under Compliance Review';
      case OnboardingAppStatus.approved:
        return 'Approved';
      case OnboardingAppStatus.rejected:
        return 'Application Rejected';
      case OnboardingAppStatus.requiresAction:
        return 'Action Required';
      case OnboardingAppStatus.suspended:
        return 'Account Suspended';
    }
  }
}

class OnboardingApplication {
  final String id;
  final String kind; // RIDER or VENDOR
  final OnboardingAppStatus status;
  final int currentStage;
  final int maxStages;
  final Map<String, dynamic> stageData;
  final String? requiresActionField;
  final String? rejectionReason;
  final String? publicId;

  const OnboardingApplication({
    required this.id,
    required this.kind,
    required this.status,
    required this.currentStage,
    required this.maxStages,
    this.stageData = const {},
    this.requiresActionField,
    this.rejectionReason,
    this.publicId,
  });

  factory OnboardingApplication.fromJson(Map<String, dynamic> json) {
    return OnboardingApplication(
      id: json['id'] as String? ?? '',
      kind: json['kind'] as String? ?? 'RIDER',
      status: OnboardingAppStatusX.fromString(json['status'] as String?),
      currentStage: (json['currentStage'] as num?)?.toInt() ?? 1,
      maxStages: (json['maxStages'] as num?)?.toInt() ?? 4,
      stageData: (json['stageData'] as Map<String, dynamic>?) ?? {},
      requiresActionField: json['requiresActionField'] as String?,
      rejectionReason: json['reason'] as String?,
      publicId: json['publicId'] as String?,
    );
  }
}
