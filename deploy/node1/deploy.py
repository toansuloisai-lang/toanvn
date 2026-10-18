#!/usr/bin/env python3
"""Pull public main, require successful GitHub CI, deploy one writer with rollback."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request

REPOSITORY = 'toansuloisai-lang/toanvn'


def log(message):
    print(message, flush=True)


def run(args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def approved(payload, sha):
    runs = payload.get('workflow_runs', [])
    if not runs:
        return False
    latest = max(runs, key=lambda item: (item.get('run_number', 0), item.get('run_attempt', 0)))
    return all([
        latest.get('head_sha') == sha,
        latest.get('head_branch') == 'main',
        latest.get('event') == 'push',
        latest.get('head_repository', {}).get('full_name') == REPOSITORY,
        latest.get('path') == '.github/workflows/ci.yml',
        latest.get('status') == 'completed',
        latest.get('conclusion') == 'success',
    ])


def ci_approved(sha):
    query = urllib.parse.urlencode({'branch': 'main', 'event': 'push', 'head_sha': sha, 'per_page': 10})
    request = urllib.request.Request(
        f'https://api.github.com/repos/{REPOSITORY}/actions/workflows/ci.yml/runs?{query}',
        headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'toanvn-node1-deploy',
                 'X-GitHub-Api-Version': '2022-11-28'},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return approved(json.load(response), sha)


def compose(file, image):
    run(['docker', 'compose', '-f', str(file), 'up', '-d', '--no-build', '--wait', '--wait-timeout', '90'],
        env={**os.environ, 'TOANVN_IMAGE': image})


def verify():
    # Check access from the actual reverse proxy, not just the host port.
    run(['docker', 'exec', 'nginx-manager', 'curl', '--fail', '--silent', '--show-error',
         '--max-time', '15', 'http://toanvn:3000/api/status'], stdout=subprocess.DEVNULL)


def rollout(candidate, runtime, image, previous):
    try:
        compose(candidate, image)
        verify()
    except Exception:
        if previous and runtime.exists():
            log(f'New release failed health checks; restoring {previous}.')
            compose(runtime, previous)
            verify()
            log('Previous image restored and healthy.')
        raise


def atomic_text(path, value):
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(value)
    os.replace(temporary, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path('/opt/toanvn'))
    parser.add_argument('--check', action='store_true', help='Check Git and CI without deploying')
    parser.add_argument('--retry', action='store_true', help='Retry a release that previously failed')
    args = parser.parse_args()
    root = args.root
    with (root / 'deploy.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log('Another deployment is running.'); return
        repo = root / 'repository'
        # No tokens or SSH credentials are needed for this public repository.
        if not repo.exists():
            run(['git', 'clone', '--quiet', '--no-checkout', '--single-branch', '--branch', 'main',
                 f'https://github.com/{REPOSITORY}.git', str(repo)])
        run(['git', '-C', str(repo), 'fetch', '--quiet', 'origin', 'main'])
        sha = run(['git', '-C', str(repo), 'rev-parse', 'origin/main'], capture_output=True).stdout.strip()
        if not re.fullmatch('[0-9a-f]{40}', sha):
            raise RuntimeError('Invalid commit identifier')
        state_file, failed = root / 'deployed.json', root / 'failed-release'
        state = json.loads(state_file.read_text()) if state_file.exists() else {}
        if state.get('sha') == sha:
            return
        if failed.exists() and failed.read_text().strip() == sha and not args.retry:
            return
        if not ci_approved(sha):
            log(f'Waiting for successful CI on main {sha[:12]}.'); return
        if args.check:
            log(f'CI approved {sha}; ready to deploy.'); return
        release = root / 'releases' / sha
        runtime = root / 'runtime-compose.yaml'
        image = f'toanvn:{sha}'
        previous = run(['docker', 'inspect', 'toanvn', '--format', '{{.Config.Image}}'],
                       capture_output=True).stdout.strip()
        if not runtime.exists():
            raise RuntimeError('Missing known-good runtime-compose.yaml; bootstrap it before deployment')
        log(f'Deploying main {sha} (previous image: {previous}).')
        try:
            if not release.exists():
                temporary = release.with_name(sha + '.tmp')
                if temporary.exists():
                    shutil.rmtree(temporary)
                temporary.mkdir(parents=True)
                # Only tracked source files enter the release; production env stays outside.
                with subprocess.Popen(['git', '-C', str(repo), 'archive', sha], stdout=subprocess.PIPE) as archive:
                    run(['tar', '-xf', '-', '-C', str(temporary)], stdin=archive.stdout)
                    archive.stdout.close()
                    if archive.wait() != 0:
                        raise RuntimeError('Source archive failed')
                os.replace(temporary, release)
            run(['docker', 'build', '-f', str(release / 'deploy/node1/Dockerfile'), '-t', image, str(release)])
            candidate = release / 'deploy/node1/compose.yaml'
            rollout(candidate, runtime, image, previous)
            atomic_text(runtime, candidate.read_text())
            atomic_text(state_file, json.dumps({'sha': sha, 'image': image, 'previous_image': previous}) + '\n')
            if failed.exists():
                failed.unlink()
            log(f'DEPLOYED {sha}; container and reverse-proxy access healthy.')
        except Exception:
            atomic_text(failed, sha + '\n')
            raise


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        # Configuration and database credentials are never printed by the controller.
        log(f'Deployment stopped: {type(error).__name__}. See preceding build/health-check output.')
        sys.exit(1)
