# TLS setup for cafehavilah.com and pos.cafehavilah.com

Same server: **pos.cafehavilah.com** → POS app, **cafehavilah.com** / **www.cafehavilah.com** → placeholder (or future website).

## Prerequisites

- DNS for `pos.cafehavilah.com`, `cafehavilah.com`, and `www.cafehavilah.com` points to your server IP (e.g. 159.89.174.14).
- Docker stack is running (`docker compose up -d`).

---

## Step 1: Use HTTP-only nginx (so nginx starts without certs)

The main `deploy/nginx.conf` includes HTTPS and will **not** start until certificate files exist. Use the HTTP-only config first:

On the server:

```bash
cd /opt/pos
cp deploy/nginx.http-only.conf deploy/nginx.conf
mkdir -p deploy/certbot-webroot
docker compose up -d --force-recreate nginx
```

Check: **http://pos.cafehavilah.com** and **http://cafehavilah.com** should load over HTTP (port 80). No HTTPS yet.

---

## Step 2: Install certbot and get a certificate

On the server (not in Docker):

```bash
sudo apt update
sudo apt install -y certbot
sudo certbot certonly --webroot \
  -w /opt/pos/deploy/certbot-webroot \
  -d cafehavilah.com \
  -d www.cafehavilah.com \
  -d pos.cafehavilah.com \
  --email YOUR_EMAIL@example.com \
  --agree-tos \
  --no-eff-email
```

Use a real email for renewal notices. Certificates will be in `/etc/letsencrypt/live/cafehavilah.com/`.

---

## Step 3: Switch to HTTPS nginx and mount certs

Restore the full nginx config (with 443 and redirects):

```bash
cd /opt/pos
git checkout -- deploy/nginx.conf
```

Or, if you edited it manually, ensure `deploy/nginx.conf` is the version that includes the `listen 443 ssl` blocks for both `pos.cafehavilah.com` and `cafehavilah.com`.

Uncomment the LetsEncrypt volume in `docker-compose.yml`:

```yaml
# Change this:
# - /etc/letsencrypt:/etc/nginx/ssl/letsencrypt:ro

# To this (remove the #):
- /etc/letsencrypt:/etc/nginx/ssl/letsencrypt:ro
```

Restart nginx:

```bash
docker compose up -d --force-recreate nginx
```

Check:

- **https://pos.cafehavilah.com** → POS app (HTTPS).
- **https://cafehavilah.com** and **https://www.cafehavilah.com** → “Coming soon” page (HTTPS).
- HTTP requests to both should redirect to HTTPS.

---

## Step 4: Point the POS app at the canonical URL

On the server, set the app’s public URL to the POS subdomain so links and redirects use HTTPS:

```bash
cd /opt/pos
nano .env
```

Set (or update):

```env
APP_BASE_URL=https://pos.cafehavilah.com
NEXT_PUBLIC_APP_ORIGIN=https://pos.cafehavilah.com
```

Restart the app:

```bash
docker compose restart pos-app
```

---

## Step 5: Auto-renew certificates

Certbot certificates expire after 90 days. Install a cron job:

```bash
sudo crontab -e
```

Add:

```cron
0 3 * * * certbot renew --quiet --deploy-hook "docker -f /opt/pos/docker-compose.yml exec -T nginx nginx -s reload"
```

(Adjust the path to `docker-compose.yml` if yours is different.) This renews when needed and reloads nginx so new certs are used.

---

## Summary

| URL                     | Serves                          |
|-------------------------|----------------------------------|
| pos.cafehavilah.com     | POS app (HTTPS after Step 3)    |
| cafehavilah.com         | Placeholder / future website    |
| www.cafehavilah.com     | Same as cafehavilah.com         |

Same server and database; only nginx routes by host. When you add the real website for cafehavilah.com, you can replace the `landing` folder or point that server block at a different app or static build.
