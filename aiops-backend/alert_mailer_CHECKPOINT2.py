import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email_config import EMAIL_SENDER, EMAIL_RECEIVER, EMAIL_PASSWORD
import time

last_alert_time = 0
COOLDOWN = 300  # only send email once every 5 minutes

def send_alert_email(metric, value, severity, recommendation):
    global last_alert_time
    now = time.time()
    if now - last_alert_time < COOLDOWN:
        return
    last_alert_time = now

    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_SENDER
        msg['To'] = EMAIL_RECEIVER
        msg['Subject'] = f"[AIOps Alert] {severity.upper()} — {metric} at {value}%"

        body = f"""
AIOps Monitoring Alert
======================
Severity  : {severity.upper()}
Metric    : {metric}
Value     : {value}%
Time      : {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}

AI Recommendation:
{recommendation}

-- AIOps Monitoring System
AWS EC2 · us-east-1 · t2.micro
        """
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        server.sendmail(EMAIL_SENDER, EMAIL_RECEIVER, msg.as_string())
        server.quit()
        print(f"Alert email sent for {metric} at {value}%")
    except Exception as e:
        print(f"Email failed: {e}")
