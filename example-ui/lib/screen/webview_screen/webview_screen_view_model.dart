import 'package:orange_ui/utils/const_res.dart';
import 'package:stacked/stacked.dart';
import 'package:webview_flutter_plus/webview_flutter_plus.dart';

class WebViewScreenViewModel extends BaseViewModel {
  WebViewControllerPlus controller = WebViewControllerPlus();

  void init(String url) {
    controller = WebViewControllerPlus()
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) async {},
        ),
      )
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(ConstRes.base + url));
  }
}
