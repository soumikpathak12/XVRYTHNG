#!/bin/bash
set -e

# 1. Create 2GB swap space to avoid OOM
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 2. Update and Install dependencies
sudo apt-get update
sudo apt-get install -y mariadb-server nginx curl git unzip

# 3. Setup Node.js 20
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 4. Install pm2
sudo npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1 | sudo bash || true

# 5. Secure and Configure MariaDB/MySQL
sudo systemctl start mariadb
sudo systemctl enable mariadb

sudo mysql -e "CREATE DATABASE IF NOT EXISTS xvrythng;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'xvrythng_user'@'localhost' IDENTIFIED BY 'xvrythng_pass';"
sudo mysql -e "GRANT ALL PRIVILEGES ON xvrythng.* TO 'xvrythng_user'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo "Setup completed successfully."
