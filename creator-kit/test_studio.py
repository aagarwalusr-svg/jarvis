import argparse
import contextlib
import io
import json
import pathlib
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
import studio

GRAPH = {'1': {'class_type': 'Text', 'inputs': {'text': 'positive'}}, '2': {'class_type': 'Text', 'inputs': {'text': 'negative'}}, '3': {'class_type': 'Sampler', 'inputs': {'noise_seed': 0, 'model': 'test.safetensors'}}}
BINDINGS = {'positive': [{'node': '1', 'input': 'text'}], 'negative': [{'node': '2', 'input': 'text'}], 'seed': [{'node': '3', 'input': 'noise_seed'}]}
OBJECTS = {'Text': {'input': {'required': {'text': ['STRING']}}}, 'Sampler': {'input': {'required': {'noise_seed': ['INT'], 'model': [['test.safetensors']]}}}}

class Tests(unittest.TestCase):
    def test_bindings_preserve_original(self):
        result = studio.prepare(GRAPH, BINDINGS, {'positive': 'new', 'negative': 'bad'}, 42)
        self.assertEqual(result['1']['inputs']['text'], 'new')
        self.assertEqual(result['3']['inputs']['noise_seed'], 42)
        self.assertEqual(GRAPH['3']['inputs']['noise_seed'], 0)
        with self.assertRaises(ValueError):
            studio.prepare(GRAPH, {}, {}, 0)

    def test_missing_models_and_nodes_fail(self):
        studio.validate(GRAPH, OBJECTS)
        with self.assertRaises(ValueError):
            studio.validate(GRAPH, {})
        broken = json.loads(json.dumps(GRAPH))
        broken['3']['inputs']['model'] = 'missing.safetensors'
        with self.assertRaises(ValueError):
            studio.validate(broken, OBJECTS)

    def test_http_approval_and_output(self):
        posted = []
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args):
                pass
            def do_GET(self):
                if self.path.startswith('/object_info'):
                    data = OBJECTS
                elif self.path.startswith('/history/'):
                    data = {'job': {'status': {'status_str': 'success'}, 'outputs': {'4': {'videos': [{'filename': 'clip.mp4', 'type': 'output', 'subfolder': ''}]}}}}
                else:
                    self.send_response(200); self.end_headers(); self.wfile.write(b'test-output'); return
                self.send_response(200); self.end_headers(); self.wfile.write(json.dumps(data).encode())
            def do_POST(self):
                posted.append(json.loads(self.rfile.read(int(self.headers['Content-Length']))))
                self.send_response(200); self.end_headers(); self.wfile.write(b'{"prompt_id":"job"}')
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            with tempfile.TemporaryDirectory() as temp, patch.object(studio, 'ROOT', pathlib.Path(temp)), patch.object(studio, 'BASE', f'http://127.0.0.1:{server.server_port}'), contextlib.redirect_stdout(io.StringIO()):
                root = pathlib.Path(temp)
                (root / 'story.json').write_text(json.dumps([{'positive': 'p', 'negative': 'n'}]))
                (root / 'graph.json').write_text(json.dumps(GRAPH))
                (root / 'bind.json').write_text(json.dumps(BINDINGS))
                args = argparse.Namespace(shot=1, workflow=str(root / 'graph.json'), bindings=str(root / 'bind.json'), seed=42, approve=False, timeout=5)
                studio.render(args)
                self.assertEqual(posted, [])
                args.approve = True
                studio.render(args)
                self.assertEqual(len(posted), 1)
                self.assertEqual((root / 'renders/shot-1-job/clip.mp4').read_bytes(), b'test-output')
        finally:
            server.shutdown(); server.server_close(); thread.join()

if __name__ == '__main__':
    unittest.main()
