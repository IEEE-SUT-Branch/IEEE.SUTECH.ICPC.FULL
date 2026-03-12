# IEEE SUTECH Platform - Docker Deployment (Hostinger VPS)

## 1. What is included
- `Backend/Dockerfile`: production backend image with local judge runtimes (Python, C++, Java).
- `Frontend/Dockerfile`: Vite build + nginx runtime image.
- `Frontend/nginx.conf`: SPA routing + reverse proxy for `/api` and `/socket.io`.
- `docker-compose.yml`: full stack orchestration (`mongo`, `backend`, `frontend`).
- `docker-compose.local.yml`: local overlay that exposes frontend on host port.
- `docker-compose.prod.yml`: production overlay that adds `caddy` for HTTPS and serves app on 80/443.
- `infra/Caddyfile`: reverse proxy + automatic Let's Encrypt SSL.
- `.env.vps.example`: compose-level variables for VPS deployment.
- `.env.vps.ssl.example`: SSL/domain variables for production TLS.

## 2. Server prerequisites (Ubuntu VPS)
Run once on Hostinger VPS:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and log in again after adding your user to docker group.

## 3. Upload project and prepare env files
```bash
cd /opt
sudo mkdir -p ieee-platform
sudo chown -R $USER:$USER ieee-platform
cd ieee-platform

# Clone your repository
# git clone <your-repo-url> .
```

### Backend env
Create `Backend/.env` (do not commit it) and set at least:
- `PORT=3000`
- `MONGO_URI=...` (Atlas or local mongo)
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `CORS_ORIGIN=https://your-domain.com`
- `BASE_URL=https://your-domain.com`

If you already have working values, keep them as-is and only update domain-related variables.

### Compose env
```bash
cp .env.vps.example .env
nano .env
```
Set values in `.env` only for compose-level options (for example `APP_PORT` and `VITE_API_URL`).

## 4. Build and run (local/non-SSL)

```bash
docker compose pull
docker compose build --no-cache
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

Check status:
```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

Open local app on `http://SERVER_IP:${APP_PORT:-80}`.

## 5. Production with domain + SSL (recommended)
Point DNS A record of your domain to VPS IP first.

```bash
cp .env.vps.ssl.example .env.vps.ssl
nano .env.vps.ssl
```

Set:
- `DOMAIN=your-domain.com`
- `LETSENCRYPT_EMAIL=you@example.com`

Run production stack:
```bash
docker compose \
  --env-file .env.vps.ssl \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --build
```

Check SSL service logs:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f caddy
```

Open:
- `https://your-domain.com`
- `https://your-domain.com/api/health`

## 6. Common operations
Restart app:
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml restart
```

Redeploy after code changes:
```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.local.yml build
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

If you changed any value inside `Backend/.env`:
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --force-recreate backend
```

Stop stack:
```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml down
```

Stop production (SSL overlay) stack:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

Stop and remove volumes (danger: removes local Mongo data):
```bash
docker compose down -v
```

## 7. Judge runtime note
Backend container includes:
- `python3`
- `g++`
- `default-jdk`

So local judging works for Python/C++/Java inside Docker without relying only on remote services.

## 8. Security checklist before go-live
- Use strong random JWT secrets.
- Restrict `CORS_ORIGIN` to your domain only.
- Keep `ADMIN_API_KEY` private.
- Do not expose MongoDB port publicly.
- Enable firewall (`ufw`) and allow only SSH + HTTP/HTTPS.

Example firewall setup:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```
