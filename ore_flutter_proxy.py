from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

FLUTTER_DIR = r"C:\Users\Eddie\Downloads\ore-cus\ore-cus\apps\customer\build\web"
BACKEND = "http://127.0.0.1:4000"


class ProxyHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FLUTTER_DIR, **kwargs)

    def _proxy_api(self):
        target = BACKEND + self.path
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else None
        headers = {
            key: value
            for key, value in self.headers.items()
            if key.lower() not in {"host", "content-length", "connection"}
        }
        request = Request(target, data=body, headers=headers, method=self.command)
        try:
            with urlopen(request, timeout=60) as response:
                payload = response.read()
                self.send_response(response.status)
                for key, value in response.headers.items():
                    if key.lower() not in {"connection", "transfer-encoding", "content-encoding"}:
                        self.send_header(key, value)
                self.end_headers()
                self.wfile.write(payload)
        except HTTPError as error:
            payload = error.read()
            self.send_response(error.code)
            for key, value in error.headers.items():
                if key.lower() not in {"connection", "transfer-encoding", "content-encoding"}:
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(payload)
        except Exception as error:
            self.send_error(502, f"Backend proxy error: {error}")

    def do_GET(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            self.send_error(405, "POST is only supported for /api routes")

    def do_PUT(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            self.send_error(405, "PUT is only supported for /api routes")

    def do_PATCH(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            self.send_error(405, "PATCH is only supported for /api routes")

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            self.send_error(405, "DELETE is only supported for /api routes")

    def do_OPTIONS(self):
        if self.path.startswith("/api/"):
            self._proxy_api()
        else:
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.end_headers()


server = ThreadingHTTPServer(("0.0.0.0", 5000), ProxyHandler)
print("Flutter app + API proxy listening on http://0.0.0.0:5000", flush=True)
server.serve_forever()
