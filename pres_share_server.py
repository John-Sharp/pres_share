import asyncio
import websockets
import http.server
import uuid
import urllib
import json

# map from join_token to presentation file
presentation_library = {}

# map from join_token to list of partakers web-sockets
join_token_websockets = {}


class PresShareServer(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if (self.path == "/fileupload"):
            self.handlePresentationUpload()
        elif (self.path == "/partake"):
            self.handlePartakeRequest()
        elif (self.path == "/setpage"):
            self.handleSetPageRequest()

    def handlePresentationUpload(self):
        presentation_file = self.rfile.read(int(self.headers["Content-Length"]))

        join_token = uuid.uuid4()
        presentation_library[join_token] = presentation_file

        response_data = bytes('{{"join_token":"{}"}}'.
                format(str(join_token)), 'utf8')

        self.send_response(200)
        self.send_header('Content-Length', len(response_data))
        self.send_header('Content-Type', 'application/json')
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(response_data)

    def handlePartakeRequest(self):
        req_data = self.rfile.read(int(self.headers["Content-Length"]))
        join_token = urllib.parse.parse_qs(req_data.decode("utf8"))['joinToken'][0]
        join_token = uuid.UUID(join_token)

        response_data = presentation_library[join_token]
        self.send_response(200)
        self.send_header('Content-Length', len(response_data))
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Connection', 'close')
        self.end_headers()
        self.wfile.write(response_data)

    def handleSetPageRequest(self):
        req_data = self.rfile.read(int(self.headers["Content-Length"]))
        join_token = urllib.parse.parse_qs(req_data.decode("utf8"))['joinToken'][0]
        join_token = uuid.UUID(join_token)

        page_number = urllib.parse.parse_qs(req_data.decode("utf8"))['pageNumber'][0]
        page_number = int(page_number)

        # TODO get web sockets for join_token, and on each of them send page_number

async def send_message(ws, msg):
    await ws.send(msg)

async def producer_handler(websocket, path):
    data = await websocket.recv()
    join_token = json.loads(data)['joinToken']
    join_token = uuid.UUID(join_token)

    print("product")
    await websocket.send("hi there")

    if not join_token_websockets.get(join_token):
        join_token_websockets[join_token] = asyncio.Event() # set() 

    print(join_token_websockets[join_token]) 
    while True:
        print("here")
        await join_token_websockets[join_token].wait()
        await websocket.send("hi there")
        join_token_websockets[join_token].clear()

def run_http_server():
    server_address = ('', 8000)
    httpd = http.server.HTTPServer(server_address, PresShareServer)
    httpd.serve_forever()

start_server = websockets.serve(producer_handler, 'localhost', 8765)

asyncio.get_event_loop().run_in_executor(None, run_http_server)
asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
