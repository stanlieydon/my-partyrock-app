# Deployment Guide: Smart AI Personal Finance Advisor

This guide walks you through deploying the full AI-powered personal finance advisor on AWS.

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** configured locally (`aws configure`)
3. **Git** for version control
4. **GitHub account** for CI/CD

## Step 1: Enable Bedrock Model Access

The application uses Claude Haiku 4.5 via Amazon Bedrock's cross-region inference profile.

### In AWS Console:

1. Go to **Amazon Bedrock** → **Model Access**
2. Search for `anthropic.claude-haiku-4-5-20251001-v1:0`
3. Click the model and request access
4. Select region: **ap-southeast-1**
5. For first-time accounts, submit use-case form (usually auto-approved within minutes)
6. Wait for "Access Granted" status

⏱️ **Time**: 5-15 minutes typically

## Step 2: Create SAM Deployment Bucket

SAM needs an S3 bucket to store CloudFormation artifacts.

```bash
# Replace ACCOUNT_ID with your 12-digit AWS Account ID
aws s3 mb s3://sam-deploy-smart-ai-finance-$(date +%s) \
  --region ap-southeast-1

# Note the bucket name - you'll need this for GitHub secrets
```

## Step 3: Set Up GitHub Secrets

The GitHub Actions workflow needs AWS credentials and the SAM bucket name.

1. Go to your GitHub repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

   | Name | Value |
   |------|-------|
   | `AWS_ACCESS_KEY_ID` | Your AWS Access Key |
   | `AWS_SECRET_ACCESS_KEY` | Your AWS Secret Access Key |
   | `SAM_DEPLOY_BUCKET` | The S3 bucket name from Step 2 |

### Getting AWS Credentials:

1. AWS Console → **IAM** → **Users** → Your user
2. **Security credentials** → **Create access key**
3. Copy Key ID and Secret Key
4. ⚠️ **Never commit these to Git** - always use GitHub Secrets

## Step 4: Deploy via GitHub Actions

### Option A: Automatic (Recommended)
Push to the `main` branch:
```bash
git add .
git commit -m "Deploy AI Finance Advisor"
git push origin main
```

### Option B: Manual Trigger
1. Go to **Actions** → **Deploy Smart AI Finance Advisor**
2. Click **Run workflow** → **Run workflow**

### Monitor Deployment:
1. Go to **Actions** tab in GitHub
2. Click the running workflow
3. Watch logs in real-time
4. Check for ✅ **Deployment Summary** at the end

⏱️ **Time**: 3-5 minutes

## Step 5: Test the Application

Once deployment completes, you'll see:
```
✅ Deployment Complete!

🌐 Website URL: https://smart-ai-finance-advisor-ACCOUNT-ID.s3-website-ap-southeast-1.amazonaws.com
⚡ Lambda Endpoint: https://XXXXX.lambda-url.ap-southeast-1.on.aws/
📦 S3 Bucket: smart-ai-finance-advisor-ACCOUNT-ID
```

### Test Workflow:

1. **Open the Website URL** in your browser
2. **Fill in test data**:
   - Financial Situation: "I have $5000 in savings, $2000 in credit card debt, earning $5000/month"
   - Advice Topic: Budgeting
   - Risk Tolerance: Moderate
   - Monthly Income: 5000
3. **Click "Run All"**
4. **Wait for AI response** (should stream in ~10 seconds)
5. **Test chat** - Ask a follow-up question like "How should I prioritize paying off debt?"

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Your Users                                         │
└────────────────┬────────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │   S3 Frontend    │  (HTML/CSS/JS)
        │  (Public Read)   │
        └────────┬─────────┘
                 │
    ┌────────────┴───────────────┐
    │                            │
┌───▼────────────────┐  ┌───────▼──────────────────┐
│ Lambda Function    │  │ Amazon Bedrock API      │
│ (Flask Streaming)  │─►│ (Claude Haiku 4.5)      │
│ monthly_savings_*  │  │ Global Inference        │
└────────────────────┘  └────────────────────────┘
    (RESPONSE_STREAM)
```

## Monitoring & Logs

### View Lambda Logs:
```bash
aws logs tail /aws/lambda/smart-ai-finance-advisor-monthly-savings --follow
```

### Check S3 Bucket:
```bash
aws s3 ls s3://smart-ai-finance-advisor-ACCOUNT-ID/
```

### View Stack Events:
```bash
aws cloudformation describe-stack-events \
  --stack-name smart-ai-personal-finance-advisor \
  --region ap-southeast-1
```

## Troubleshooting

### Issue: "Bedrock model not found"
- ✅ Check Bedrock Model Access in AWS Console (Step 1)
- ✅ Verify region is ap-southeast-1
- ✅ Wait 5-10 minutes after requesting access

### Issue: "Access Denied" to Bedrock
- ✅ Check IAM role permissions (AppBedrockRole in SAM template)
- ✅ Ensure role has InvokeModel + InvokeModelWithResponseStream actions

### Issue: Lambda timeout
- ✅ Increase timeout in `infra/template.yaml` (currently 60s)
- ✅ Check Bedrock API performance

### Issue: S3 bucket creation failed
- ✅ Bucket name must be globally unique
- ✅ Try adding timestamp: `sam-deploy-smart-ai-$(date +%s)`

### Issue: GitHub Actions fails to deploy
- ✅ Verify AWS credentials in GitHub Secrets
- ✅ Check SAM_DEPLOY_BUCKET exists and is accessible
- ✅ Review workflow logs in Actions tab

## Optional: CloudFront CDN

To add CloudFront caching for faster global delivery:

1. AWS Console → **CloudFront** → **Create distribution**
2. Origin: Your S3 website endpoint
3. Enable caching for `.html`, `.css`, `.js`
4. Update DNS to point to CloudFront domain

Then uncomment the CloudFront invalidation step in `.github/workflows/deploy.yml`.

## Costs

Rough **monthly costs** (per-user estimates vary):

- **S3**: $0.50-$2 (storage + requests)
- **Lambda**: $0.20-$1 (per 1M invocations)
- **Bedrock**: $0.50-$3 (pay-per-token)
- **CloudFormation**: Free
- **Total**: ~$1-6/month for light usage

[AWS Pricing Calculator](https://calculator.aws/)

## Next Steps

1. **Customize styling** - Edit `frontend/style.css`
2. **Add more topics** - Update dropdown in `frontend/index.html`
3. **Implement user auth** - Add Cognito for user persistence
4. **Add database** - DynamoDB to store conversation history
5. **Scale Bedrock** - Use provisioned throughput for high volume

## Support

For issues or questions:
- Check AWS Bedrock documentation
- Review CloudFormation error messages in AWS Console
- Check GitHub Actions workflow logs

---

**Happy Deploying! 🚀**
