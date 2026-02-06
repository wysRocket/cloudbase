export const docsData = {
    'getting-started': {
        title: 'Getting Started',
        icon: '🚀',
        description: 'Learn the basics of WysCloudTop and deploy your first resource.',
        articles: [
            {
                id: 'quick-start',
                title: 'Quick Start Guide',
                desc: 'Deploy your first server in under 5 minutes',
                content: `
# Quick Start Guide

Welcome to WysCloudTop! This guide will help you get your first cloud resource up and running in minutes.

## Prerequisites
1. A WysCloudTop account
2. A valid payment method or trial credits
3. Basic understanding of cloud concepts

## Step 1: Create an Account
If you haven't already, head over to the Sign Up page and create your account. You'll need to verify your email address before proceeding.

## Step 2: Access the Dashboard
Log in to your account to access the main dashboard. This is your command center for all WysCloudTop resources.

## Step 3: Launch a VPS
1. Click "New Resource" in the sidebar.
2. Select "Virtual Private Server".
3. Choose your region (e.g., US-East, EU-Central).
4. Select your OS image (Ubuntu, Debian, CentOS).
5. Choose your plan size.
6. Click "Deploy".

Your server will be ready in approximately 30-60 seconds!
                `
            },
            {
                id: 'account-setup',
                title: 'Account Setup',
                desc: 'Configure your account and billing',
                content: `
# Account Setup

Ensure your account is secure and properly configured.

## Profile Settings
Navigate to Settings > Profile to update your personal information and contact details.

## Security
We strongly recommend enabling Two-Factor Authentication (2FA) immediately.
1. Go to Settings > Security.
2. Click "Enable 2FA".
3. Scan the QR code with your authenticator app.

## Billing Information
Add a payment method in the Billing section to prevent service interruption. We accept major credit cards and PayPal.
                `
            },
            {
                id: 'dashboard-overview',
                title: 'Dashboard Overview',
                desc: 'Learn the main dashboard features',
                content: `
# Dashboard Overview

The WysCloudTop dashboard is designed for simplicity and power.

## Main Sections
- **Overview**: See active resources and current usage stats.
- **Resources**: specific tabs for VPS, Databases, Kubernetes, etc.
- **Activity**: A log of all actions taken on your account.
- **Settings**: Global account configuration.

## Resource Cards
Each active resource appears as a card on your dashboard, showing real-time status (Online/Offline), IP address, and quick actions (Reboot, Console).
                `
            },
            {
                id: 'first-deployment',
                title: 'First Deployment',
                desc: 'Step-by-step guide to your first deployment',
                content: `
# Your First Deployment

Let's deploy a simple web server.

1. **Provision a VPS**: Follow the Quick Start guide to launch an Ubuntu 22.04 LTS server.
2. **Connect via SSH**: Use your terminal to connect: \`ssh root@<your-ip>\`.
3. **Install Nginx**: Run \`apt update && apt install nginx -y\`.
4. **Verify**: Open your server's IP in a web browser. You should see the "Welcome to nginx!" page.

Congratulations! You've deployed your first web service.
                `
            }
        ]
    },
    'billing': {
        title: 'Billing & Payments',
        icon: '💳',
        description: 'Manage your invoices, payment methods, and plan upgrades.',
        articles: [
            {
                id: 'payment-methods',
                title: 'Payment Methods',
                desc: 'Managing credit cards and other payment options',
                content: `
# Payment Methods

You can manage your payment methods in the **Billing** section of your dashboard.

## Adding a Card
1. Go to Billing > Payment Methods.
2. Click "Add New Card".
3. Enter your card details secure via Stripe.

## Primary Method
The method marked as "Default" will be charged automatically at the start of each billing cycle.
                `
            },
            {
                id: 'invoices',
                title: 'Invoices',
                desc: 'Understanding and downloading your invoices',
                content: `
# Invoices

Invoices are generated on the 1st of every month.

## Viewing Invoices
You can view and download PDF versions of all past invoices in the Billing history section.

## Invoice Breakdown
- **Subscription**: Base cost of your active plans.
- **Usage**: Hourly billing for resources created/destroyed mid-month.
- **Taxes**: Applicable VAT or sales tax based on your location.
                `
            },
            {
                id: 'refund-policy',
                title: 'Refund Policy',
                desc: 'Our policy on refunds and cancellations',
                content: `
# Refund Policy

We offer a 7-day money-back guarantee for new accounts.

## requesting a Refund
Please contact support within 7 days of your first payment explaining why the service didn't meet your needs.

## Exclusions
- Usage-based overages (bandwidth, storage) are non-refundable.
- Domain registrations are non-refundable.
                `
            },
            {
                id: 'upgrading-plans',
                title: 'Upgrading Plans',
                desc: 'How to resize or upgrade your services',
                content: `
# Upgrading Plans

You can vertically scale your resources at any time.

## VPS Resizing
1. Select your VPS.
2. Go to Settings > Resize.
3. Choose a larger plan.
4. Reboot your server for changes to take effect (Disk resize may require file system expansion).
                `
            }
        ]
    },
    'vps': {
        title: 'VPS Hosting',
        icon: '🖥️',
        description: 'High-performance virtual private servers for any workload.',
        articles: [
            {
                id: 'creating-vps',
                title: 'Creating a VPS',
                desc: 'Step-by-step VPS deployment',
                content: `
# Creating a VPS

1. Navigate to "Compute" in the sidebar.
2. Click "Create Droplet/VPS".
3. **Region**: Choose the datacenter closest to your users.
4. **Image**: Select an OS (Ubuntu, Fedora, Debian) or a One-Click App (Wordpress, Docker).
5. **Size**: Select CPU/RAM config.
6. **Authentication**: Add your SSH key (Recommended) or create a root password.
7. Click **Create**.
                `
            },
            {
                id: 'ssh-access',
                title: 'SSH Access',
                desc: 'Connecting to your server securely',
                content: `
# SSH Access

Secure Shell (SSH) is the standard way to manage Linux servers.

## Connecting
\`\`\`bash
ssh root@your_server_ip
\`\`\`

## Using SSH Keys
We strongly recommend using SSH keys instead of passwords.
1. Generate key: \`ssh-keygen -t rsa -b 4096\`
2. Add the public key \`~/.ssh/id_rsa.pub\` to your WysCloudTop panel during creation.
                `
            },
            {
                id: 'server-management',
                title: 'Server Management',
                desc: 'Reboots, snapshots, and power cycles',
                content: `
# Server Management

## Power Controls
- **Reboot**: Soft restart (ACPI signal).
- **Power Off**: Hard shutdown (cuts power).

## Backups
Enable automated weekly backups in the server settings to prevent data loss.
                `
            },
            {
                id: 'scaling-resources',
                title: 'Scaling Resources',
                desc: 'Upgrade CPU, RAM, and storage',
                content: `
# Scaling Resources

Need more power?

1. Go to the "Resize" tab of your server.
2. Select a new plan.
3. Choose **CPU & RAM only** (reversible) or **Disk, CPU & RAM** (permanent disk increase).
4. Apply resize.
                `
            }
        ]
    },
    'database': {
        title: 'Databases',
        icon: '🗄️',
        description: 'Managed database clusters for persistence.',
        articles: [
            {
                id: 'creating-databases',
                title: 'Creating Databases',
                desc: 'PostgreSQL, MySQL, Redis, MongoDB',
                content: `
# Managed Databases

Stop worrying about updates and maintenance.

## Supported Engines
- PostgreSQL 14+
- MySQL 8
- Redis 6+
- MongoDB 5+

## Creation
Select "Databases" > "Create", choose your engine and version, and deploy.
                `
            },
            {
                id: 'connection-strings',
                title: 'Connection Strings',
                desc: 'Connect your applications',
                content: `
# Connecting to your Database

We provide a secure connection string for your apps.

## Internal vs External
- **Public Network**: Use for connecting from local machine or external providers.
- **Private Network**: Use for connecting from WysCloudTop VPS (faster, more secure, free bandwidth).

Example:
\`postgresql://doadmin:password@host:25060/defaultdb?sslmode=require\`
                `
            },
            {
                id: 'db-backups',
                title: 'Backups & Restore',
                desc: 'Manage your data safely',
                content: `
# Database Backups

## Automated Backups
We automatically back up your database cluster every 24 hours and retain backups for 7 days.

## Point-in-Time Recovery
For supported engines (Postgres), you can restore to any specific second within the retention window.
                `
            },
            {
                id: 'db-scaling',
                title: 'Scaling',
                desc: 'Resize your database cluster',
                content: `
# Scaling Databases

You can add standby nodes for High Availability (HA) or increase the size of the nodes.

**Note**: Scaling may involve a short downtime for failover unless you are running in HA mode.
                `
            }
        ]
    },
    'kubernetes': {
        title: 'Kubernetes',
        icon: '⚙️',
        description: 'Managed K8s for container orchestration.',
        articles: [
            {
                id: 'k8s-clusters',
                title: 'Creating Clusters',
                desc: 'Deploy managed Kubernetes',
                content: `
# Managed Kubernetes

Deploy production-ready K8s clusters in minutes.

We manage the Control Plane (API Server, Etcd) for you. You only pay for the Worker Nodes.
                `
            },
            {
                id: 'kubectl-setup',
                title: 'kubectl Setup',
                desc: 'Configure local kubectl access',
                content: `
# Setting up kubectl

1. Download the kubeconfig file from your cluster dashboard.
2. Save it to \`~/.kube/config\` or run:
\`\`\`bash
export KUBECONFIG=/path/to/downloaded-config.yaml
\`\`\`
3. Test connection: \`kubectl get nodes\`.
                `
            },
            {
                id: 'k8s-deployments',
                title: 'Deployments',
                desc: 'Deploy your applications',
                content: `
# Deploying Apps

Use standard Kubernetes manifests.

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
\`\`\`
                `
            },
            {
                id: 'ingress',
                title: 'Ingress & Load Balancers',
                desc: 'Expose your services',
                content: `
# Exposing Services

To expose an app to the internet, use a LoadBalancer service or an Ingress Controller.

## LoadBalancer
Creating a Service of type \`LoadBalancer\` will automatically provision a Cloud Load Balancer in your account.
                `
            }
        ]
    },
    'api': {
        title: 'API Reference',
        icon: '🔌',
        description: 'Automate your infrastructure programmatically.',
        articles: [
            {
                id: 'auth',
                title: 'Authentication',
                desc: 'API keys and tokens',
                content: `
# Authentication

All API requests must be authenticated using a Bearer Token.

## Generating a Token
Go to Settings > API and create a new Personal Access Token.

## Usage
\`\`\`bash
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.wyscloudtop.com/v2/account
\`\`\`
                `
            },
            {
                id: 'vps-endpoints',
                title: 'VPS Endpoints',
                desc: 'Manage VPS via API',
                content: `
# VPS API

## List Droplets
\`GET /v2/droplets\`

## Create Droplet
\`POST /v2/droplets\`

Payload:
\`\`\`json
{
  "name": "example.com",
  "region": "nyc3",
  "size": "s-1vcpu-1gb",
  "image": "ubuntu-20-04-x64"
}
\`\`\`
                `
            },
            {
                id: 'db-endpoints',
                title: 'Database Endpoints',
                desc: 'Manage databases via API',
                content: `
# Database API

## List Clusters
\`GET /v2/databases\`

## Resize Cluster
\`PUT /v2/databases/{id}/resize\`
                `
            },
            {
                id: 'rate-limits',
                title: 'Rate Limits',
                desc: 'API usage limits',
                content: `
# Rate Limits

Standard API limit is **5,000 requests per hour** per authenticated user.

Headers returned with requests:
- \`RateLimit-Limit\`
- \`RateLimit-Remaining\`
- \`RateLimit-Reset\`
                `
            }
        ]
    },
    'account': {
        title: 'Account & Security',
        icon: '🔐',
        description: 'Manage your team, security settings, and account recovery.',
        articles: [
            {
                id: '2fa',
                title: 'Two-Factor Auth',
                desc: 'Secure your account with 2FA',
                content: `
# Two-Factor Authentication

Protect your account with an extra layer of security.

## Enabling 2FA
1. Go to **Settings** > **Security**.
2. Click **Enable 2FA**.
3. Scan the QR code using Google Authenticator or Authy.
4. Enter the verification code.
                `
            },
            {
                id: 'team-members',
                title: 'Team Members',
                desc: 'Collaborate with your team',
                content: `
# Team Management

Invite colleagues to manage your infrastructure.

## Roles
- **Owner**: Full access + Billing + Team management.
- **Member**: Can create/manage resources but cannot change billing or invite users.

## inviting Users
Go to **Settings** > **Team** and enter their email address.
                `
            },
            {
                id: 'password-reset',
                title: 'Password Reset',
                desc: 'Recover your account access',
                content: `
# Password Reset

Forgot your password?

1. Go to the Sign In page.
2. Click "Forgot Password?".
3. Enter your email usage.
4. Follow the instructions sent to your inbox.
                `
            },
            {
                id: 'api-tokens',
                title: 'API Keys',
                desc: 'Manage programmatic access',
                content: `
# API Keys

(See API Reference for detailed usage)

You can generate read/write tokens in the **Settings** > **API** section. Treat these tokens like passwords.
                `
            }
        ]
    }
}
