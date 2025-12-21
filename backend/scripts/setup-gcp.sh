#!/bin/bash
# PKGrower Backend - GCP Deployment Script
# Run this script on your Google Cloud VM to set up everything

set -e  # Exit on any error

echo "=========================================="
echo "  PKGrower Backend - GCP Setup Script"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update system
echo -e "${YELLOW}[1/7] Updating system...${NC}"
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js 20 LTS
echo -e "${YELLOW}[2/7] Installing Node.js 20 LTS...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Step 3: Install PM2 globally
echo -e "${YELLOW}[3/7] Installing PM2...${NC}"
sudo npm install -g pm2

# Step 4: Install Git
echo -e "${YELLOW}[4/7] Installing Git...${NC}"
sudo apt install -y git

# Step 5: Clone repository
echo -e "${YELLOW}[5/7] Cloning PKGrower repository...${NC}"
cd ~
if [ -d "PKGrower" ]; then
    echo "Repository already exists, pulling latest..."
    cd PKGrower
    git pull
else
    git clone https://github.com/israelmena59-cloud/PKGrower.git
    cd PKGrower
fi

# Step 6: Install dependencies
echo -e "${YELLOW}[6/7] Installing backend dependencies...${NC}"
cd backend
npm install

# Create logs directory
mkdir -p logs

# Step 7: Check for .env file
echo -e "${YELLOW}[7/7] Checking environment configuration...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}WARNING: .env file not found!${NC}"
    echo "Please create .env file with your configuration:"
    echo "  nano ~/PKGrower/backend/.env"
    echo ""
    echo "Copy the contents from .env.example and fill in your values."
else
    echo -e "${GREEN}.env file found!${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}  Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Configure .env file: nano ~/PKGrower/backend/.env"
echo "2. Start the server: pm2 start ecosystem.config.js"
echo "3. Save PM2 config: pm2 save"
echo "4. Enable startup: pm2 startup"
echo ""
echo "Useful commands:"
echo "  pm2 logs          - View logs"
echo "  pm2 status        - Check status"
echo "  pm2 restart all   - Restart server"
echo ""
