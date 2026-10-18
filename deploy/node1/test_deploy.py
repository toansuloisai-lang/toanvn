import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

import deploy


class DeploymentTests(unittest.TestCase):
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
