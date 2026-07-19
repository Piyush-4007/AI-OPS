import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email_config import EMAIL_SENDER, EMAIL_RECEIVER, EMAIL_PASSWORD
import time
import logging

# print() is block-buffered when stdout is not a TTY, so under systemd its output
# never reaches journalctl and alert delivery becomes invisible. Log instead.
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s [%(name)s] %(message)s')
log = logging.getLogger('alert_mailer')

# Per-metric cooldowns (seconds)
COOLDOWNS = {
    "CPU": 300,
    "RAM": 300,
    "Disk": 300,
    "Anomaly": 300,
    "App Error Rate": 300,
    "Response Time": 300,
}
DEFAULT_COOLDOWN = 300
last_alert_times = {}

def send_alert_email(metric, value, severity, recommendation):
    global last_alert_times
    now = time.time()
    cooldown = COOLDOWNS.get(metric, DEFAULT_COOLDOWN)
    last = last_alert_times.get(metric, 0)
    if now - last < cooldown:
        log.info("Cooldown active for %s (%.0fs remaining) — skipping email", metric, cooldown - (now - last))
        return
    last_alert_times[metric] = now

    severity_color = {"critical": "#f87171", "warning": "#fbbf24", "info": "#60a5fa"}.get(severity, "#60a5fa")
    severity_bg = {"critical": "#450a0a", "warning": "#451a03", "info": "#0c1a2e"}.get(severity, "#0c1a2e")
    severity_icon = {"critical": "🔴", "warning": "🟡", "info": "🔵"}.get(severity, "🔵")
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())

    try:
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_SENDER
        msg['To'] = EMAIL_RECEIVER
        msg['Subject'] = f"{severity_icon} [AIOps] {severity.upper()} — {metric} at {value}%"

        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a12;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a12;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111120;border-radius:16px;border:1px solid #1e1e3a;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1a0a2e,#0d0d20);padding:28px 32px;border-bottom:1px solid #1e1e3a;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><span style="font-size:22px;font-weight:800;color:#8b5cf6;letter-spacing:-0.5px;">AIOps</span><span style="font-size:11px;color:#4a4a6a;margin-left:8px;text-transform:uppercase;letter-spacing:2px;">Monitoring</span></td>
              <td align="right"><span style="background:{severity_color}20;color:{severity_color};border:1px solid {severity_color}40;padding:6px 14px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">{severity_icon} {severity}</span></td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:{severity_bg};border-left:4px solid {severity_color};padding:20px 32px;">
          <div style="font-size:11px;color:{severity_color};text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:6px;">Alert Triggered</div>
          <div style="font-size:24px;font-weight:800;color:#f1f5f9;">{metric} at {value}%</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Detected at {timestamp}</div>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #1e1e3a;">
            <tr style="background:#0d0d1e;">
              <td style="padding:12px 18px;font-size:10px;color:#4a4a6a;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Metric</td>
              <td style="padding:12px 18px;font-size:10px;color:#4a4a6a;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Value</td>
              <td style="padding:12px 18px;font-size:10px;color:#4a4a6a;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Severity</td>
              <td style="padding:12px 18px;font-size:10px;color:#4a4a6a;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Time</td>
            </tr>
            <tr style="background:#111120;border-top:1px solid #1e1e3a;">
              <td style="padding:14px 18px;font-size:13px;font-weight:600;color:#f1f5f9;">{metric}</td>
              <td style="padding:14px 18px;font-size:13px;font-weight:800;color:{severity_color};font-family:monospace;">{value}%</td>
              <td style="padding:14px 18px;font-size:13px;font-weight:600;color:{severity_color};">{severity.upper()}</td>
              <td style="padding:14px 18px;font-size:11px;color:#64748b;font-family:monospace;">{timestamp}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <div style="background:#0d1a2e;border:1px solid #1e3a5a;border-left:3px solid #8b5cf6;border-radius:12px;padding:18px 20px;">
            <div style="margin-bottom:10px;"><span style="font-size:10px;color:#8b5cf6;text-transform:uppercase;letter-spacing:2px;font-weight:700;">🤖 AI Recommendation</span></div>
            <div style="font-size:13px;color:#94a3b8;line-height:1.7;">{recommendation}</div>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="33%" style="text-align:center;background:#0d0d1e;border:1px solid #1e1e3a;border-radius:10px;padding:14px;">
                <div style="font-size:10px;color:#4a4a6a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Server</div>
                <div style="font-size:13px;font-weight:700;color:#f1f5f9;">aiops-server</div>
              </td>
              <td width="4%"></td>
              <td width="33%" style="text-align:center;background:#0d0d1e;border:1px solid #1e1e3a;border-radius:10px;padding:14px;">
                <div style="font-size:10px;color:#4a4a6a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Region</div>
                <div style="font-size:13px;font-weight:700;color:#f1f5f9;">us-east-1</div>
              </td>
              <td width="4%"></td>
              <td width="33%" style="text-align:center;background:#0d0d1e;border:1px solid #1e1e3a;border-radius:10px;padding:14px;">
                <div style="font-size:10px;color:#4a4a6a;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Instance</div>
                <div style="font-size:13px;font-weight:700;color:#f1f5f9;">t2.micro</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="background:#0d0d1e;border-top:1px solid #1e1e3a;padding:16px 32px;text-align:center;">
          <div style="font-size:11px;color:#4a4a6a;">AIOps Monitoring System · AWS EC2 · Prometheus + Isolation Forest + Claude AI</div>
          <div style="font-size:10px;color:#2a2a4a;margin-top:4px;">Automated alert · Per-metric cooldown: 5 minutes</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

        msg.attach(MIMEText(html, 'html'))
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, EMAIL_RECEIVER, msg.as_string())
        server.quit()
        log.info("Alert email sent — %s at %s%% (%s) to %s", metric, value, severity, EMAIL_RECEIVER)
    except Exception as e:
        log.error("Alert email FAILED for %s at %s%%: %s: %s", metric, value, type(e).__name__, e, exc_info=True)
