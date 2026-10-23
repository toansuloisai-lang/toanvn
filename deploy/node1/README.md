# node1 deployment

Host: SSH shell alias `node1` (`root@45.119.215.154`). Application directory: `/opt/toanvn`.

The single `toanvn` container uses Node 24 and the existing Supabase database.
`/opt/toanvn/.env` was copied from the repository's local `.env (1)` file and is
root-owned with mode 600. Keep it outside Git and Docker images. Compose overrides
the listen address, port, secure-cookie setting and trusted proxy IP.

## Nginx Proxy Manager

Create a Proxy Host with:

- Domain: `toanvn.skytruong.com`
- Scheme: `http`
- Forward Hostname: `toanvn`
- Forward Port: `3000`
- Access List: Publicly Accessible
- SSL: select/request the domain certificate, then enable Force SSL.

The app and `nginx-manager` share the existing `nginx-manager_default` network.
Add these server-level directives in the Advanced tab:

```nginx
client_max_body_size 24m;
proxy_connect_timeout 10s;
proxy_read_timeout 120s;
proxy_send_timeout 120s;
```

DNS A record: `toanvn.skytruong.com` -> `45.119.215.154`.
The host-only diagnostic endpoint is `http://127.0.0.1:3060/api/status`.
Secure cookies require accessing the app through HTTPS for login.

## Operations

```sh
cd /opt/toanvn
docker compose -f deploy/node1/compose.yaml ps
docker compose -f deploy/node1/compose.yaml logs --tail=100 app
docker compose -f deploy/node1/compose.yaml restart app
curl -fsS http://127.0.0.1:3060/api/status
docker exec nginx-manager curl -fsS http://toanvn:3000/api/status
```

Keep one writer instance: do not start the local app against the same Supabase
database. Do not import or synchronize an old JSON snapshot over live data.
Supabase backups must cover `math_lab_private.state` and `math_lab_private.files`.
If Nginx Manager's container IP changes, update `TRUSTED_PROXY_IPS` in Compose
(initially `172.20.0.14`) and recreate the app container.

## CI/CD

Push to `main` runs `.github/workflows/ci.yml`: Node tests, disposable PostgreSQL
integration tests, deployment-controller tests, Compose validation and a Linux
production-image build. Pull requests run the same checks but never deploy.

`toanvn-deploy.timer` checks Git every 60–70 seconds. For a changed main SHA it
requires a completed, successful **push** CI run for that exact SHA in this public
repository. Missing, pending, failed or inaccessible CI results leave production
unchanged. No GitHub token, SSH private key or production secrets are stored in
GitHub Actions. The public repository and CI run metadata must remain readable.

Before checking Git, the controller also recovers a running container marked
`unhealthy` by Docker (Docker's restart policy alone does not do this). It restarts
the same single container, loading the current database snapshot; it does not
retry a failed write or reconnect using stale in-memory state. Recovery is capped
at three attempts per rolling hour with at least five minutes between attempts.
Healthy, starting and intentionally stopped containers are left alone. Attempts
are recorded in `/opt/toanvn/health-restarts.json`. After the limit is reached,
operator intervention is required. Database failures now log an operation and
bounded error code without connection strings, query text or private data.

The controller lives at `/usr/local/lib/toanvn/deploy.py`. It archives tracked
source into `/opt/toanvn/releases/<sha>`, builds an image tagged with the full SHA,
then replaces the single app container. The old writer is stopped before the new
one starts. A failed container or proxy health check restores the previous image
using the previous Compose manifest. Database schema/data changes are not rolled
back; future migrations must remain compatible with the previous app version.

Production env stays at `/opt/toanvn/.env`; deployment never overwrites it or
imports old data. `/opt/toanvn/runtime-compose.yaml` holds the last successful
manifest and `deployed.json` records the deployed SHA/image. Source and images
are retained for recovery; monitor disk usage and prune old releases manually.

```sh
systemctl list-timers toanvn-deploy.timer
journalctl -u toanvn-deploy.service -n 100 --no-pager
cat /opt/toanvn/deployed.json
python3 /usr/local/lib/toanvn/deploy.py --check
# After diagnosing a failed release, retry it while retaining the CI gate:
python3 /usr/local/lib/toanvn/deploy.py --retry
# Pause automatic deployment:
systemctl stop toanvn-deploy.timer
# Resume:
systemctl start toanvn-deploy.timer
```

Initial setup: clone the public repository without checking it out into
`/opt/toanvn/repository`; copy the known-good Compose manifest to
`/opt/toanvn/runtime-compose.yaml`; install the controller and the two systemd
units from this directory; run `systemctl daemon-reload` and
`systemctl enable --now toanvn-deploy.timer`. Updating controller/unit files in
Git does not update their installed copies; install those operations files
explicitly when changing the deployment mechanism itself.
