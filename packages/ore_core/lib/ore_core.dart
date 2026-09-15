/// Ore Core — shared models, theme, widgets, networking & motion primitives
/// used by the customer, vendor, and rider apps.
library ore_core;

// Models
export 'src/models/service_type.dart';
export 'src/models/order_status.dart';
export 'src/models/address.dart';
export 'src/models/user.dart';
export 'src/models/vendor.dart';
export 'src/models/product.dart';
export 'src/models/cart_item.dart';
export 'src/models/order.dart';

// Theme
export 'src/theme/app_colors.dart';
export 'src/theme/app_typography.dart';
export 'src/theme/app_theme.dart';
export 'src/theme/app_tokens.dart';

// Motion
export 'src/motion/motion.dart';

// Widgets
export 'src/widgets/animated_press.dart';
export 'src/widgets/ore_button.dart';
export 'src/widgets/empty_state.dart';
export 'src/widgets/shimmer_list.dart';
export 'src/models/onboarding_state.dart';
export 'src/widgets/support_modal.dart';
export 'src/widgets/network_image_x.dart';
export 'src/widgets/success_animation.dart';
export 'src/widgets/common.dart';
export 'src/widgets/toast.dart';

// Network
export 'src/network/endpoints.dart';
export 'src/network/api_client.dart';
export 'src/network/tracking_socket.dart';
export 'src/network/comms_models.dart';
export 'src/network/comms_client.dart';
export 'src/network/comms_socket.dart';
export 'src/widgets/order_chat_page.dart';
export 'src/widgets/voice_call_page.dart';
export 'src/widgets/voice_presence.dart';

// Services
export 'src/services/connectivity.dart';

// Utils  
export 'src/utils/formatters.dart';
// Note: Haptics is already available in motion.dart, don't double-export
