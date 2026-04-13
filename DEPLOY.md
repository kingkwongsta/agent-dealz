# Deployment Guide — Agent Dealz

Complete terminal-first instructions to deploy the backend on Google Cloud Run and the frontend on Vercel.

## Prerequisites

### 1. Install Google Cloud CLI

```bash
# macOS (Homebrew)
brew install --cask google-cloud-sdk

# Verify
gcloud --version
```

### 2. Install Docker Desktop

```bash
# macOS (Homebrew)
brew install --cask docker

# Then open Docker Desktop from Applications to start the daemon
open -a Docker

# Verify (wait for Docker Desktop to fully start)
docker --version
```

### 3. Install Vercel CLI

```bash
npm install -g vercel

# Verify
vercel --version
```

---

## Part 1: GCP Project Setup

### Step 1 — Authenticate and create a project

```bash
# Login to Google Cloud (opens browser)
gcloud auth login

# Create a new project (pick a unique ID)
gcloud projects create agent-dealz --name="Agent Dealz"

# Set it as your active project
gcloud config set project agent-dealz

# If the project ID is taken, use a unique suffix:
# gcloud projects create agent-dealz-12345 --name="Agent Dealz"
# gcloud config set project agent-dealz-12345
```

### Step 2 — Enable billing

Cloud Run and Firestore require a billing account. If you don't have one yet:

```bash
# List billing accounts
gcloud billing accounts list

# Link billing to your project (replace BILLING_ACCOUNT_ID)
gcloud billing projects link agent-dealz --billing-account=BILLING_ACCOUNT_ID
```

Or do it in the console: https://console.cloud.google.com/billing

### Step 3 — Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com
```

### Step 4 — Create Firestore database (Native Mode)

```bash
gcloud firestore databases create \
  --location=nam5 \
  --type=firestore-native
```

`nam5` is the multi-region US location (cheapest for US-based usage). The database auto-creates the `searches` and `results` collections when the app first writes to them — no schema setup needed.

---

## Part 2: Store Secrets

### Step 5 — Store OpenRouter API key in Secret Manager

```bash
# This will prompt you to paste your key, then press Ctrl+D to save
echo -n "YOUR_OPENROUTER_API_KEY" | gcloud secrets create openrouter-api-key --data-file=-
```

Replace `YOUR_OPENROUTER_API_KEY` with your actual key from https://openrouter.ai/keys

### Step 6 — Grant Cloud Run access to the secret

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe agent-dealz --format="value(projectNumber)")

# Grant the Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding openrouter-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Part 3: Deploy Backend to Cloud Run

### Step 7 — Configure Docker for GCR

```bash
gcloud auth configure-docker
```

### Step 8 — Build and push the container image

```bash
cd backend

# Build the image (this takes a few minutes the first time — Playwright + Chromium)
docker build -t gcr.io/agent-dealz/agent-dealz-backend .

# Push to Google Container Registry
docker push gcr.io/agent-dealz/agent-dealz-backend
```

If you're on Apple Silicon (M1/M2/M3/M4), build for linux/amd64:

```bash
docker build --platform linux/amd64 -t gcr.io/agent-dealz/agent-dealz-backend .
```

### Step 9 — Deploy to Cloud Run

```bash
gcloud run deploy agent-dealz-backend \
  --image gcr.io/agent-dealz/agent-dealz-backend \
  --region us-central1 \
  --platform managed \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 3 \
  --allow-unauthenticated \
  --set-env-vars "GCP_PROJECT_ID=agent-dealz" \
  --update-secrets "OPENROUTER_API_KEY=openrouter-api-key:latest"
```

### Step 10 — Get the service URL

```bash
gcloud run services describe agent-dealz-backend \
  --region us-central1 \
  --format "value(status.url)"
```

This prints something like: `https://agent-dealz-backend-xxxxx-uc.a.run.app`

### Step 11 — Test the backend

```bash
# Health check
curl https://agent-dealz-backend-xxxxx-uc.a.run.app/health

# Should return: {"status":"ok"}
```

---

## Part 4: Deploy Frontend to Vercel

### Step 12 — Login to Vercel

```bash
vercel login
```

### Step 13 — Deploy

```bash
cd frontend

# Set the backend URL as an environment variable
# Replace the URL with your actual Cloud Run URL from Step 10
vercel env add NEXT_PUBLIC_API_URL

# When prompted:
#   Value: https://agent-dealz-backend-xxxxx-uc.a.run.app
#   Environments: Production, Preview, Development

# Deploy to production
vercel --prod
```

### Step 14 — Verify

Open the URL Vercel gives you. You should see the Agent Dealz dashboard.

---

## Quick Reference: Using deploy.sh

Once everything above is set up, future deploys are a single command:

```bash
# From the repo root
GCP_PROJECT_ID=agent-dealz ./deploy.sh
```

This builds, pushes, and deploys the backend. For the frontend:

```bash
cd frontend && vercel --prod
```

---

## Troubleshooting

### "Permission denied" on Cloud Run
```bash
# Make sure the default compute service account has Firestore access
PROJECT_NUMBER=$(gcloud projects describe agent-dealz --format="value(projectNumber)")
gcloud projects add-iam-policy-binding agent-dealz \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### Docker build fails on Apple Silicon
```bash
# Always use --platform linux/amd64 for Cloud Run
docker build --platform linux/amd64 -t gcr.io/agent-dealz/agent-dealz-backend backend/
```

### Firestore "database not found"
```bash
# Verify the database exists
gcloud firestore databases list
```

### View Cloud Run logs
```bash
gcloud run services logs read agent-dealz-backend --region us-central1 --limit 50
```

### Update the OpenRouter API key
```bash
echo -n "NEW_KEY_HERE" | gcloud secrets versions add openrouter-api-key --data-file=-

# Redeploy to pick up the new secret version
gcloud run services update agent-dealz-backend --region us-central1 \
  --update-secrets "OPENROUTER_API_KEY=openrouter-api-key:latest"
```
