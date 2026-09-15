/** Document requirements per doc §Onboarding / §Vendor Classification / §Pharmacy Compliance.
 *  Returns the required document kinds for an application; used to validate submissions. */
import { VendorType } from '@ore/contracts';
import { VendorClass } from './entities';

export function requiredDocuments(
  kind: 'VENDOR' | 'RIDER',
  vendorClass?: VendorClass | null,
  vendorType?: VendorType | null,
): string[] {
  if (kind === 'RIDER') {
    return ['national_id', 'drivers_license', 'vehicle_registration'];
  }
  const docs = new Set<string>(['national_id']);
  if (vendorClass === 'INDIVIDUAL') docs.add('selfie');
  if (vendorClass === 'BUSINESS') docs.add('business_registration');
  switch (vendorType) {
    case VendorType.FOOD:
      docs.add('food_hygiene_permit');
      break;
    case VendorType.PHARMACY:
      docs.add('pharmacy_license'); // doc: no onboarding without Pharmacy Council license
      break;
    default:
      break;
  }
  return [...docs];
}
