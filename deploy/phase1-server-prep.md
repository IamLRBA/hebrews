# Phase 1 — Production Server Preparation

**Target:** DigitalOcean VPS, Ubuntu 22.04 LTS (fresh install)  
**Scope:** Base system hardening and prerequisites only. No application, database, or Docker Compose configuration.

Assume `root` or `sudo` for all commands.

---

## 1. System Update & Base Packages

```bash
# Update package lists and upgrade all packages
apt update && apt upgrade -y

# Install essential utilities
apt install -y \
  curl \
  git \
  htop \
  unzip \
  ca-certificates \
  gnupg \
  lsb-release \
  apt-transport-https \
  software-properties-common \
  vim \
  jq

# Optional: set hostname (e.g. pos-server)
hostnamectl set-hostname pos-server
```

---

## 2. Create Dedicated Deployment User

```bash
# Create non-root user for deployment (no password login; use SSH keys)
adduser --disabled-password --gecos "" posadmin

# Grant sudo without password (optional; remove NOPASSWD for password prompt)
echo "posadmin ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/posadmin
chmod 440 /etc/sudoers.d/posadmin

# Ensure home directory exists and has correct permissions
chown posadmin:posadmin /home/posadmin
chmod 700 /home/posadmin
```

**Note:** For the rest of the runbook, switch to `posadmin` after SSH is configured (e.g. `su - posadmin`). Docker group is added in section 8.

---

## 3. Secure SSH Configuration

**Do this only after you have confirmed key-based login works from another terminal.** Otherwise you may lock yourself out.

```bash
# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Disable password authentication (key-based only)
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

# Ensure these are set
grep -q '^PermitRootLogin' /etc/ssh/sshd_config || echo "PermitRootLogin no" >> /etc/ssh/sshd_config
grep -q '^PasswordAuthentication' /etc/ssh/sshd_config || echo "PasswordAuthentication no" >> /etc/ssh/sshd_config

# Optional hardening
echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
echo "MaxAuthTries 3" >> /etc/ssh/sshd_config
echo "ClientAliveInterval 300" >> /etc/ssh/sshd_config
echo "ClientAliveCountMax 2" >> /etc/ssh/sshd_config

# Test config before restart (if test fails, restore backup and fix)
sshd -t

# Restart SSH (keep existing session open; test new session first)
systemctl restart sshd
# Or on some systems:
# systemctl restart ssh
```

**Before disabling root/password:** Copy your SSH public key to `posadmin`:

```bash
mkdir -p /home/posadmin/.ssh
chmod 700 /home/posadmin/.ssh
# Paste your public key into authorized_keys (e.g. from your machine: ssh-copy-id posadmin@SERVER_IP)
touch /home/posadmin/.ssh/authorized_keys
chmod 600 /home/posadmin/.ssh/authorized_keys
chown -R posadmin:posadmin /home/posadmin/.ssh
```

---

## 4. Firewall Configuration (UFW)

```bash
# Default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH, HTTP, HTTPS
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable (will prompt if SSH might be affected; answer y only if key-based login is working)
ufw --force enable

# Verify
ufw status verbose
```

---

## 5. Fail2Ban Installation & Setup

```bash
# Install fail2ban
apt install -y fail2ban

# Create local jail config for SSH
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

# Enable and start
systemctl enable fail2ban
systemctl start fail2ban
systemctl status fail2ban

# Check SSH jail status
fail2ban-client status sshd
```

---

## 6. Time Synchronization

```bash
# Install chrony (NTP client)
apt install -y chrony

# Enable and start
systemctl enable chrony
systemctl start chrony

# Verify sync
chronyc tracking
chronyc sources
```

**Why accurate time matters:** JWT auth tokens use expiry timestamps; log ordering and audit trails depend on correct time. Pesapal webhooks and session logic may also rely on it.

---

## 7. System Limits & Performance Basics

**Swap (recommended if RAM &lt; 2 GB):**

```bash
# Create 2GB swap file (skip if server has enough RAM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Optional: reduce swappiness (default 60)
echo "vm.swappiness=10" >> /etc/sysctl.d/99-pos.conf
sysctl -p /etc/sysctl.d/99-pos.conf
```

**File descriptor limits (optional; Docker/Next.js usually fine with defaults):**

```bash
# Increase limits for systemd services if needed later
# echo "DefaultLimitNOFILE=65536" >> /etc/systemd/system.conf
# systemctl daemon-reexec
```

---

## 8. Docker Engine Installation

```bash
# Add Docker official GPG key and repo
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine, CLI, containerd, Compose plugin
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add deployment user to docker group (so you don't need sudo for docker)
usermod -aG docker posadmin

# Enable and start Docker
systemctl enable docker
systemctl start docker
systemctl status docker
```

**Verification:**

```bash
docker --version
docker compose version
docker run --rm hello-world
```

**Note:** User `posadmin` must log out and back in (or `newgrp docker`) for group membership to apply.

---

## 9. Security Best Practices

**Recommended directory structure:**

```bash
# Create app directory; ownership by deployment user
mkdir -p /opt/pos
chown posadmin:posadmin /opt/pos
chmod 755 /opt/pos
```

**Practices:**

- Run application containers as non-root (your Dockerfile already uses `nextjs` user).
- Do not run Docker or app services as root in production; use `posadmin` and `docker` group.
- Keep secrets in env files with restricted permissions: `chmod 600 /opt/pos/.env` when you add it later.
- Avoid storing secrets in world-readable paths or in git.

---

## 10. Final Verification Checklist

Run as root or with sudo:

```bash
# Firewall active and rules correct
ufw status | grep -E "22|80|443"
# Expect: 22, 80, 443 allowed

# Docker running
systemctl is-active docker
# Expect: active

# Docker Compose plugin available
docker compose version
# Expect: Docker Compose version v2.x

# SSH: password auth disabled, root login disabled
grep -E "^(PasswordAuthentication|PermitRootLogin)" /etc/ssh/sshd_config
# Expect: PasswordAuthentication no, PermitRootLogin no

# Fail2ban SSH jail active
fail2ban-client status sshd
# Expect: Status active

# Time sync (chrony)
chronyc tracking | grep -E "Leap status|System time"
# Expect: Leap status: Normal, System time within range

# Deployment user exists and in docker group
getent group docker | grep posadmin
id posadmin
# Expect: posadmin in docker group

# App directory exists and owned by posadmin
ls -ld /opt/pos
# Expect: drwxr-xr-x ... posadmin posadmin ... /opt/pos
```

---

**Phase 1 complete.** Next: Phase 2 — deploy application (clone repo, `.env`, Docker Compose, migrations, seed).
