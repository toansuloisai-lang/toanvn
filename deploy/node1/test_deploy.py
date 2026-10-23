import tempfile
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from types import SimpleNamespace

import deploy


class DeploymentTests(unittest.TestCase):
    def test_healthy_starting_and_stopped_containers_are_not_restarted(self):
        with tempfile.TemporaryDirectory() as directory:
            for status, health in [('running', 'healthy'), ('running', 'starting'), ('exited', 'unhealthy')]:
                with self.subTest(status=status, health=health):
                    state = {'Status': status, 'Health': {'Status': health}}
                    with patch.object(deploy, 'run', return_value=SimpleNamespace(stdout=json.dumps(state))) as command:
                        deploy.recover_unhealthy(Path(directory), now=10000)
                    self.assertEqual(command.call_count, 1)
                    self.assertFalse((Path(directory) / 'health-restarts.json').exists())

    def test_unhealthy_container_restarts_with_cooldown_and_hourly_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = {'Status': 'running', 'Health': {'Status': 'unhealthy'}}
            with patch.object(deploy, 'run', return_value=SimpleNamespace(stdout=json.dumps(state))) as command:
                deploy.recover_unhealthy(root, now=10000)
                self.assertEqual(command.call_args.args[0], ['docker', 'restart', '--time', '60', 'toanvn'])
                self.assertEqual(command.call_count, 2)
                deploy.recover_unhealthy(root, now=10060)
                self.assertEqual(command.call_count, 3)  # Inspect only during cooldown.
                deploy.recover_unhealthy(root, now=10300)
                deploy.recover_unhealthy(root, now=10600)
                self.assertEqual(command.call_count, 7)
                deploy.recover_unhealthy(root, now=10900)
                self.assertEqual(command.call_count, 8)  # Three attempts/hour already used.
                deploy.recover_unhealthy(root, now=13601)
                self.assertEqual(command.call_count, 10)  # Old attempts expire.

    def test_failed_restart_also_consumes_attempt_and_cannot_loop(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = SimpleNamespace(stdout=json.dumps({'Status': 'running', 'Health': {'Status': 'unhealthy'}}))
            with patch.object(deploy, 'run', side_effect=[state, RuntimeError('restart failed')]):
                with self.assertRaises(RuntimeError):
                    deploy.recover_unhealthy(root, now=10000)
            with patch.object(deploy, 'run', return_value=state) as command:
                deploy.recover_unhealthy(root, now=10001)
                self.assertEqual(command.call_count, 1)

    def test_only_exact_successful_main_push_can_deploy(self):
        sha = 'a' * 40
        valid = {'head_sha': sha, 'head_branch': 'main', 'event': 'push',
                 'head_repository': {'full_name': deploy.REPOSITORY},
                 'path': '.github/workflows/ci.yml', 'status': 'completed',
                 'conclusion': 'success', 'run_number': 1, 'run_attempt': 1}
        self.assertTrue(deploy.approved({'workflow_runs': [valid]}, sha))
        for key, value in [('head_sha', 'b' * 40), ('head_branch', 'feature'),
                           ('event', 'pull_request'), ('conclusion', 'failure'),
                           ('status', 'in_progress'), ('path', '.github/workflows/other.yml'),
                           ('head_repository', {'full_name': 'someone/fork'})]:
            with self.subTest(key=key):
                self.assertFalse(deploy.approved({'workflow_runs': [{**valid, key: value}]}, sha))
        self.assertFalse(deploy.approved({'workflow_runs': []}, sha))
        rerun = {**valid, 'run_attempt': 2, 'conclusion': 'failure'}
        self.assertFalse(deploy.approved({'workflow_runs': [valid, rerun]}, sha))

    def test_failed_release_restores_previous_image_and_manifest(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = Path(directory) / 'runtime.yaml'
            runtime.touch()
            candidate = Path(directory) / 'candidate.yaml'
            with patch.object(deploy, 'compose', side_effect=[RuntimeError('bad health'), None]) as up:
                with patch.object(deploy, 'verify') as verify:
                    with self.assertRaises(RuntimeError):
                        deploy.rollout(candidate, runtime, 'new-image', 'old-image')
            self.assertEqual(up.call_args_list[0].args, (candidate, 'new-image'))
            self.assertEqual(up.call_args_list[1].args, (runtime, 'old-image'))
            verify.assert_called_once()

    def test_failed_proxy_check_also_rolls_back(self):
        with tempfile.TemporaryDirectory() as directory:
            runtime = Path(directory) / 'runtime.yaml'
            runtime.touch()
            with patch.object(deploy, 'compose') as up:
                with patch.object(deploy, 'verify', side_effect=[RuntimeError('proxy failed'), None]):
                    with self.assertRaises(RuntimeError):
                        deploy.rollout(Path('candidate'), runtime, 'new-image', 'old-image')
            self.assertEqual(up.call_args_list[-1].args, (runtime, 'old-image'))


if __name__ == '__main__':
    unittest.main()
