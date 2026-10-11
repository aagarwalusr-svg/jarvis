"""Standard-library ComfyUI controller. No paid services or embedded secrets."""
import argparse
import copy
import json
import pathlib
import subprocess
import time
import urllib.request
import urllib.parse
import uuid

ROOT = pathlib.Path(__file__).resolve().parent
BASE = 'http://127.0.0.1:8188'


def request(path, data=None):
    body = None if data is None else json.dumps(data).encode()
    req = urllib.request.Request(BASE + path, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def prepare(graph, bindings, shot, seed):
    graph = copy.deepcopy(graph)
    for field in ('positive', 'negative', 'seed'):
        targets = bindings.get(field, [])
        if not targets:
            raise ValueError(f'Missing explicit workflow binding: {field}')
        value = seed if field == 'seed' else shot[field]
        for target in targets:
            node, name = str(target['node']), target['input']
            if node not in graph or name not in graph[node]['inputs']:
                raise ValueError(f'Invalid {field} binding: {node}/{name}')
            graph[node]['inputs'][name] = value
    return graph


def validate(graph, objects):
    missing = sorted({node['class_type'] for node in graph.values()} - set(objects))
    if missing:
        raise ValueError('Missing ComfyUI nodes: ' + ', '.join(missing))
    for node in graph.values():
        schema = objects[node['class_type']]['input']
        for key, value in node['inputs'].items():
            spec = schema.get('required', {}).get(key, schema.get('optional', {}).get(key))
            if spec and isinstance(spec[0], list) and value not in spec[0]:
                raise ValueError(f'Model/option unavailable: {node["class_type"]}.{key}: {value}')


def render(args):
    shot = json.loads((ROOT / 'story.json').read_text())[args.shot - 1]
    graph = json.loads(pathlib.Path(args.workflow).read_text())
    bindings = json.loads(pathlib.Path(args.bindings).read_text())
    graph = prepare(graph, bindings, shot, args.seed)
    validate(graph, request('/object_info'))
    if not args.approve:
        print('Workflow validated. Re-run with --approve to use your GPU. No generation submitted.')
        return
    result = request('/prompt', {'prompt': graph, 'client_id': str(uuid.uuid4())})
    if result.get('node_errors') or not result.get('prompt_id'):
        raise RuntimeError(json.dumps(result))
    prompt_id = result['prompt_id']
    deadline = time.monotonic() + args.timeout
    while time.monotonic() < deadline:
        item = request('/history/' + prompt_id).get(prompt_id)
        if item:
            if item.get('status', {}).get('status_str') == 'error':
                raise RuntimeError(json.dumps(item['status']))
            out = ROOT / 'renders' / f'shot-{args.shot}-{prompt_id}'
            out.mkdir(parents=True, exist_ok=True)
            (out / 'history.json').write_text(json.dumps(item, indent=2))
            count = 0
            for node in item.get('outputs', {}).values():
                for values in node.values():
                    if not isinstance(values, list):
                        continue
                    for entry in values:
                        if isinstance(entry, dict) and 'filename' in entry:
                            if entry.get('type', 'output') != 'output':
                                continue
                            query = urllib.parse.urlencode({k: entry[k] for k in ('filename', 'subfolder', 'type') if k in entry})
                            destination = out / pathlib.Path(entry['filename']).name
                            urllib.request.urlretrieve(BASE + '/view?' + query, destination)
                            count += 1
            if not count:
                raise RuntimeError('No downloadable final outputs. Inspect history and workflow output nodes.')
            print(f'Saved {count} output(s) to {out}; inspect before generating the next shot.')
            return
        time.sleep(3)
    raise TimeoutError(f'Generation {prompt_id} still pending; not resubmitted. Inspect ComfyUI queue.')


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('doctor')
    launch = sub.add_parser('launch')
    launch.add_argument('--comfy', required=True)
    launch.add_argument('--python', required=True)
    r = sub.add_parser('render')
    r.add_argument('--workflow', required=True)
    r.add_argument('--bindings', required=True)
    r.add_argument('--shot', type=int, choices=(1, 2, 3), required=True)
    r.add_argument('--seed', type=int, default=20261011)
    r.add_argument('--approve', action='store_true')
    r.add_argument('--timeout', type=int, default=3600)
    args = parser.parse_args()
    if args.command == 'doctor':
        subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total,driver_version', '--format=csv'], check=True)
        print(json.dumps(request('/system_stats'), indent=2))
        objects = request('/object_info')
        (ROOT / 'available-nodes.json').write_text(json.dumps(objects, indent=2))
        print(f'{len(objects)} node types available; schemas saved to available-nodes.json')
    elif args.command == 'launch':
        subprocess.run([args.python, 'main.py', '--listen', '127.0.0.1', '--port', '8188'], cwd=args.comfy, check=True)
    else:
        render(args)


if __name__ == '__main__':
    main()
