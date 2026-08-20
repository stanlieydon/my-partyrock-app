# Quick Start Guide (5 Minutes)

Fast-track to deployment. Full details in SETUP_CHECKLIST.md.

## Prerequisite: Bedrock Model Access

**This is critical - do this first:**

1. AWS Console → Search **Bedrock**
2. **Model Access** (left sidebar)
3. Search: `anthropic.claude-haiku-4-5-20251001-v1:0`
4. Click **Request access**
5. Region: **ap-southeast-1**
6. Submit form
7. ⏳ **Wait 5-15 minutes** for "Access Granted" status

**Don't proceed until this shows "Access Granted"**

---

## Step 1: Create AWS Resources (3 minutes)

### Create S3 Bucket for SAM

```bash
# Replace ACCOUNT_ID with your 12-digit AWS Account ID
aws s3 mb s3://sam-deploy-smart-ai-finance-$(date +%s) --region ap-southeast-1
```

**Save the bucket name** - you'll need it next.

### Verify AWS Credentials

```bash
aws sts get-caller-identity
```

Should return your Account ID. If error, run `aws configure`.

---

## Step 2: Configure GitHub Secrets (2 minutes)

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** for each:

   - **AWS_ACCESS_KEY_ID** - From AWS IAM
   - **AWS_SECRET_ACCESS_KEY** - From AWS IAM  
   - **SAM_DEPLOY_BUCKET** - The bucket name from Step 1

**How to get AWS credentials if you don't have them:**
- AWS Console → **IAM** → **Users** → **Your user** → **Security credentials**
- **Create access key** → **Command Line Interface**
- Copy Key ID and Secret Key

---

## Step 3: Deploy (Press Button)

### Push to GitHub

```bash
git add .
git commit -m "Deploy Smart AI Finance Advisor"
git push origin main
```

Or: GitHub repo → **Actions** → **Deploy Smart AI Finance Advisor** → **Run workflow**

⏳ **Wait 3-5 minutes** for deployment to complete.

---

## Step 4: Get URLs & Test (1 minute)

### View Deployment Outputs

1. GitHub repo → **Actions** → Latest workflow run
2. Scroll to end → Look for **Deployment Summary**
3. Copy the **Website URL**

### Open & Test

1. Paste Website URL into browser
2. Fill in test data:
   - Situation: "I earn $5000/month, have $2000 debt"
   - Topic: "Budgeting"
   - Risk: "Moderate"
   - Income: 5000
3. Click **Run All**
4. Watch AI response stream in ✅

---

## ✅ You're Live!

Share the Website URL with users.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Access Denied" from Bedrock | Go back to prerequisite - wait for model access approval |
| GitHub Actions fails | Check GitHub Secrets (Settings → Secrets) - all 3 must be set |
| Lambda timeout (>30s) | It's normal for first response. Bedrock may be warming up |
| No response | Check browser console (F12) for error messages |

---

## Next: Local Testing (Optional)

Want to test locally before deploying?

```bash
cd backend/monthly_savings_summary
pip install -r requirements.txt
python app.py

# In another terminal
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"financial_situation":"test","advice_topic":"Budgeting","risk_tolerance":"Moderate","monthly_income":5000}'
```

---

## Detailed Guides

- **Full Deployment**: See DEPLOYMENT.md
- **Architecture**: See ARCHITECTURE.md
- **Checklist**: See SETUP_CHECKLIST.md
- **Local Dev**: See LOCAL_DEVELOPMENT.md

---

**🚀 Enjoy your AI Finance Advisor!**
