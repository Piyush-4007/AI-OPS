# Startup Guide

Everything needed to bring the project up from cold. Takes about 3 minutes.

## Where things live

| What | Path |
|---|---|
| Project root | `C:\Users\Lenovo\Desktop\VS\AIops\PBL` |
| Frontend | `PBL\aiops-dashboard` |
| Backend (local copy) | `PBL\aiops-backend` |
| Backend (on server) | `~/aiops-backend` on EC2 |
| **Secrets — outside the repo** | `C:\Users\Lenovo\Desktop\VS\AIops-SECRETS` |

Secrets are deliberately kept out of the project folder so they can never be committed:
`aiops-key.pem` (SSH key), `email_config.py` (SMTP credentials), and the GitHub recovery
codes all live in `AIOps-SECRETS`.

---

## Step 1 — Start the EC2 instance

AWS Console → EC2 → Instances → `aiops-server` → Instance state → **Start instance**.

Wait ~30 seconds, then copy the **Public IPv4 address**.

> The instance gets a **new public IP every time it stops and starts**. Assigning an
> Elastic IP would make the address permanent and remove Step 2 entirely.

## Step 2 — Point the frontend at the new IP

Open `aiops-dashboard\src\App.jsx` and update **line 6**:

```js
const API = 'http://YOUR_NEW_IP:5000'
```

Keep the `http://` and the `:5000`. Save — Vite hot-reloads, no restart needed.

The IP shown in the dashboard header is derived from this value, so it updates too.

## Step 3 — Start the frontend

```powershell
cd C:\Users\Lenovo\Desktop\VS\AIops\PBL\aiops-dashboard
npm run dev
```

Open <http://localhost:5173>. Leave the window open.

First time on a new machine, or if `node_modules` is missing or corrupt:

```powershell
npm install
```

## Step 4 — Confirm the backend is running

The backend runs as a systemd service and starts automatically with the instance, so
usually there is nothing to do. To verify:

```powershell
ssh -i "C:\Users\Lenovo\Desktop\VS\AIops-SECRETS\aiops-key.pem" ubuntu@YOUR_IP
```

Then on the server:

```bash
systemctl is-active aiops-backend     # expect: active
curl http://localhost:5000/api/health  # expect: {"status": "ok"}
```

## Step 5 — Verify the dashboard

At <http://localhost:5173> you should see:

- A green **Connected** badge, top right
- A health score in the sidebar
- Metric cards showing real numbers, not grey skeletons
- A green **Live** dot with a ticking timestamp

If the cards stay as skeletons, the frontend cannot reach the backend — recheck the IP
from Step 2.

---

## Troubleshooting

**Backend not running**

```bash
sudo systemctl restart aiops-backend
sleep 3
curl http://localhost:5000/api/health
```

If it still fails, read the error:

```bash
sudo journalctl -u aiops-backend -n 40 --no-pager
```

If port 5000 is stuck:

```bash
fuser -k 5000/tcp
sudo systemctl start aiops-backend
```

**SSH hangs** — the instance is probably still booting. Wait 60 seconds and retry. If it
stays unresponsive (this can happen after a full stress test), reboot it from the AWS
Console — and remember the IP changes again.

**Cards show loading skeletons** — wrong IP in `App.jsx` line 6, or the backend is down.

**Checking email alerts**

Alerts log their outcome, so delivery is directly observable:

```bash
sudo journalctl -u aiops-backend --since '10 minutes ago' | grep alert_mailer
```

- `Alert email sent — CPU at 84.27% (critical)` → sent successfully
- `Cooldown active for CPU (240s remaining)` → suppressed by the 5-minute per-metric cooldown
- `Alert email FAILED ...` → includes the exception and a traceback

Alerts only fire above threshold (CPU > 35%), at most once per metric per five minutes.
On an idle server, no email is expected behavior. Delivery can also lag by a few minutes,
and Gmail may file these under Spam or Promotions — search `in:anywhere AIOps` if one
seems missing.

**Demo tip** — trigger a stress test from the Actions page, then watch Processes, CPU and
AI Anomaly in turn. Use **Stop All Stress** when finished.

---

## Deploying backend changes

Edit files in `PBL\aiops-backend`, then push them up and restart:

```powershell
scp -i "C:\Users\Lenovo\Desktop\VS\AIops-SECRETS\aiops-key.pem" `
  C:\Users\Lenovo\Desktop\VS\AIops\PBL\aiops-backend\app.py `
  ubuntu@YOUR_IP:/home/ubuntu/aiops-backend/

ssh -i "C:\Users\Lenovo\Desktop\VS\AIops-SECRETS\aiops-key.pem" ubuntu@YOUR_IP `
  "sudo systemctl restart aiops-backend"
```

`email_config.py` lives only on the server and is gitignored — don't overwrite it with the
example template.
