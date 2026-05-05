#!/usr/bin/env python3
"""
Simple TMDB connectivity checker.
Usage:
  - Ensure your TMDB key is available in the environment as VITE_TMDB_API_KEY or TMDB_API_KEY
  - Or place a ` .env.local` file next to the frontend folder with `VITE_TMDB_API_KEY=...`
  - Run: `python scripts/check_tmdb.py`

The script will: verify TCP connectivity to api.themoviedb.org:443 and perform a sample GET /movie/550 request.
"""

import os
import sys
import socket
import json
import urllib.request
import urllib.error
from pathlib import Path


def load_key_from_env_or_file():
    # Check environment variables first
    key = os.environ.get("VITE_TMDB_API_KEY") or os.environ.get("TMDB_API_KEY")
    if key:
        return key.strip()

    # Look for .env.local in common locations relative to this script
    script_dir = Path(__file__).resolve().parent
    candidates = [script_dir / '.env.local', script_dir.parent / '.env.local']

    for cand in candidates:
        if cand.exists():
            try:
                for line in cand.read_text(encoding='utf-8').splitlines():
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' not in line:
                        continue
                    k, v = line.split('=', 1)
                    if k.strip() == 'VITE_TMDB_API_KEY' or k.strip() == 'TMDB_API_KEY':
                        return v.strip().strip('"').strip("'")
            except Exception:
                continue
    return None


def tcp_check(host='api.themoviedb.org', port=443, timeout=5):
    try:
        sock = socket.create_connection((host, port), timeout=timeout)
        sock.close()
        return True, None
    except Exception as e:
        return False, str(e)


def http_check(api_key):
    url = f'https://api.themoviedb.org/3/movie/550?api_key={api_key}'
    req = urllib.request.Request(url, headers={
        'User-Agent': 'naminotes-tmdb-check/1.0'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = resp.read()
            try:
                data = json.loads(raw.decode('utf-8'))
            except Exception:
                data = {'raw': raw.decode('utf-8', errors='replace')}
            return True, resp.getcode(), data
    except urllib.error.HTTPError as he:
        try:
            body = he.read().decode('utf-8', errors='replace')
        except Exception:
            body = '<no body>'
        return False, he.code, {'error': body}
    except urllib.error.URLError as ue:
        return False, None, {'error': str(ue)}
    except Exception as e:
        return False, None, {'error': str(e)}


def main():
    print('TMDB connectivity check')
    key = load_key_from_env_or_file()
    if not key:
        print('ERROR: TMDB API key not found in environment or .env.local (looked in script locations).')
        print('Set VITE_TMDB_API_KEY or TMDB_API_KEY in environment, or place .env.local with the key.')
        sys.exit(2)

    print('Found API key (redacted):', key[:4] + '...' if len(key) > 8 else '****')

    print('\n1) TCP test to api.themoviedb.org:443')
    ok, err = tcp_check()
    if ok:
        print('  TCP: OK')
    else:
        print('  TCP: FAILED ->', err)

    print('\n2) HTTP test: sample movie request')
    ok, status, data = http_check(key)
    if ok:
        print('  HTTP: OK (status {})'.format(status))
        # Print a small summary
        title = data.get('title') or data.get('name')
        movie_id = data.get('id')
        overview = data.get('overview', '')
        print(f'  Movie: {title} (id={movie_id})')
        if overview:
            snippet = overview[:160].replace('\n', ' ')
            print('  Overview:', snippet + ('...' if len(overview) > 160 else ''))
    else:
        print('  HTTP: FAILED (status: {})'.format(status))
        print('  Response/Error:', data.get('error'))

    if not ok:
        print('\nDiagnostics:')
        print(' - Confirm the key is the TMDB "API Key (v3 auth)" from https://www.themoviedb.org/settings/api')
        print(' - If behind a firewall, check outbound HTTPS to api.themoviedb.org:443')

    sys.exit(0 if ok else 3)


if __name__ == '__main__':
    main()
