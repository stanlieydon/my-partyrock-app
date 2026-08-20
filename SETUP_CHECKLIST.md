# Complete Setup Checklist

Use this checklist to ensure everything is configured correctly before deployment.

## Phase 1: AWS Account Preparation

- [ ] **Verify AWS Account Access**
  - [ ] Log in to AWS Console
  - [ ] Note your Account ID (12-digit number, top-right menu)
  - [ ] Region: **ap-southeast-1** (Singapore)

- [ ] **Enable Bedrock Model Access**
  - [ ] Go to AWS Console → Search "Bedrock"
  - [ ] Navigate to **Model Access** (left sidebar)
  - [ ] Search for: `anthropic.claude-haiku-4-5-20251001-v1:0`
  - [ ] Click the model name
  - [ ] Click **Request access**
  - [ ] Region: **ap-southeast-1**
  - [ ] Use case: "Personal Finance AI Advisor"
  - [ ] Click **Submit**
  - [ ] ⏱️ Wait for "Access Granted" (usually 5-15 minutes)
  - [ ] Verify status changes from "Not available" to "Access Granted"

## Phase 2: AWS Credentials & S3 Setup

- [ ] **Create IAM User for Deployment** (if needed)
  - [ ] AWS Console → **IAM** → **Users** → **Create user**
  - [ ] Username: `github-deploy` (example)
  - [ ] Permissions: Attach policies:
    - [ ] `AWSCloudFormationFullAccess`
    - [ ] `AWSLambda_FullAccess`
    - [ ] `AmazonS3FullAccess`
    - [ ] `IAMFullAccess` (for creating roles)

- [ ] **Generate Access Keys**
  - [ ] Go to IAM User → **Security credentials** tab
  - [ ] Click **Create access key**
  - [ ] Choose "Command Line Interface (CLI)"
  - [ ] Accept and generate
  - [ ] **Download .csv** or copy Key ID + Secret Key
  - [ ] ⚠️ **SAVE SECURELY** - Never commit to Git!

- [ ] **Create SAM Deployment S3 Bucket**
  - [ ] AWS Console → **S3** → **Create bucket**
  - [ ] Name: `sam-deploy-smart-ai-finance-<ACCOUNT-ID>` (globally unique)
  - [ ] Region: **ap-southeast-1**
  - [ ] **Uncheck** "Block all public access" (CloudFormation needs access)
  - [ ] Create bucket
  - [ ] **Note bucket name** - you'll need it for secrets

## Phase 3: GitHub Repository Setup

- [ ] **Fork or Clone Repository**
  - [ ] Clone this project to your machine
  - [ ] Or push to your own GitHub repository

- [ ] **Create GitHub Secrets**
  - [ ] Go to GitHub repo → **Settings**
  - [ ] Left sidebar → **Secrets and variables** → **Actions**
  - [ ] Click **New repository secret** for each:

    | Secret Name | Value |
    |-------------|-------|
    | `AWS_ACCESS_KEY_ID` | From Phase 2 |
    | `AWS_SECRET_ACCESS_KEY` | From Phase 2 |
    | `SAM_DEPLOY_BUCKET` | Bucket name from Phase 2 |

  - [ ] Verify all 3 secrets are set and values are correct
  - [ ] ⚠️ Don't expose these secrets - GitHub will mask them in logs

## Phase 4: Code Verification

- [ ] **Check Frontend Configuration**
  - [ ] Open `frontend/app.js`
  - [ ] Line with `const STREAM_URLS = {...}`
  - [ ] Verify placeholder: `'__URL_MONTHLY_SAVINGS_SUMMARY__'`
  - [ ] ✅ Should match: `monthly_savings_summary`

- [ ] **Check Backend Dependencies**
  - [ ] `backend/monthly_savings_summary/requirements.txt` contains:
    - [ ] `flask>=3.0.0`
    - [ ] `boto3>=1.34.0`
    - [ ] `flask-cors>=4.0.0`

- [ ] **Check Infrastructure Template**
  - [ ] `infra/template.yaml` contains:
    - [ ] `Transform: AWS::Serverless-2016-10-31`
    - [ ] `AppBedrockRole` with Bedrock permissions
    - [ ] `MonthlySavingsSummaryFunction` with RESPONSE_STREAM
    - [ ] `FrontendBucket` for static hosting
    - [ ] Outputs: `MonthlySavingsSummaryUrl`, `WebsiteUrl`, `BucketName`

- [ ] **Check GitHub Actions Workflow**
  - [ ] `.github/workflows/deploy.yml` exists
  - [ ] Triggers: `push` to `main` + `workflow_dispatch`
  - [ ] Steps include: checkout, AWS config, SAM build, SAM deploy
  - [ ] Uses correct secrets and region

- [ ] **Check .gitignore**
  - [ ] Includes: `__pycache__/`, `.env`, `venv/`, `.aws-sam/`, `build/`
  - [ ] Won't accidentally commit AWS credentials or build artifacts

## Phase 5: Local Testing (Optional but Recommended)

- [ ] **Setup Python Environment**
  - [ ] `python --version` → Should be 3.12+
  - [ ] Create virtual environment: `python -m venv venv`
  - [ ] Activate: `. venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)

- [ ] **Install Backend Dependencies**
  - [ ] `cd backend/monthly_savings_summary`
  - [ ] `pip install -r requirements.txt`
  - [ ] Verify no errors

- [ ] **Test AWS Credentials**
  - [ ] `aws sts get-caller-identity`
  - [ ] Should return your Account ID
  - [ ] If error: Run `aws configure` with your credentials

- [ ] **Verify Bedrock Access**
  - [ ] `aws bedrock list-foundation-models --region ap-southeast-1`
  - [ ] Should list Claude models
  - [ ] If error: Check Phase 1 - Model Access may still be pending

- [ ] **Test Flask Locally** (Optional)
  - [ ] `cd backend/monthly_savings_summary && python app.py`
  - [ ] In another terminal: `curl -X POST http://localhost:8080 -H "Content-Type: application/json" -d '{"financial_situation":"test","advice_topic":"Budgeting","risk_tolerance":"Moderate","monthly_income":5000}'`
  - [ ] Should see streaming text response
  - [ ] Press Ctrl+C to stop server

## Phase 6: Deploy to AWS

### Option A: GitHub Actions (Recommended)

- [ ] **Push to Main Branch**
  - [ ] `git add .`
  - [ ] `git commit -m "Deploy Smart AI Finance Advisor"`
  - [ ] `git push origin main`

- [ ] **Monitor GitHub Actions**
  - [ ] Go to GitHub repo → **Actions** tab
  - [ ] Click running workflow "Deploy Smart AI Finance Advisor"
  - [ ] Watch for blue ✅ checkmarks on each step
  - [ ] ⏱️ Wait 3-5 minutes for completion
  - [ ] Look for "Deployment Summary" at end with URLs
  - [ ] ❌ If failed, check logs for error messages

### Option B: Manual SAM Deploy

- [ ] **Install AWS SAM CLI**
  - [ ] `brew install aws-sam-cli` (Mac)
  - [ ] Or download from [aws.amazon.com/serverless/sam](https://aws.amazon.com/serverless/sam/)

- [ ] **Build SAM Template**
  - [ ] `sam build --template infra/template.yaml`
  - [ ] Should create `.aws-sam/build` directory

- [ ] **Deploy Stack**
  ```bash
  sam deploy \
    --stack-name smart-ai-personal-finance-advisor \
    --s3-bucket <SAM_DEPLOY_BUCKET> \
    --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
    --region ap-southeast-1 \
    --no-confirm-changeset
  ```
  - [ ] Wait for "Successfully created/updated stack"

- [ ] **Get Outputs**
  ```bash
  aws cloudformation describe-stacks \
    --stack-name smart-ai-personal-finance-advisor \
    --region ap-southeast-1 \
    --query 'Stacks[0].Outputs' \
    --output table
  ```
  - [ ] Note the three URLs

## Phase 7: Update Frontend with Lambda URLs

- [ ] **Get Lambda Function URL**
  - [ ] From deployment output: `MonthlySavingsSummaryUrl`
  - [ ] Should look like: `https://xxxxx.lambda-url.ap-southeast-1.on.aws/`

- [ ] **Update Frontend**
  - [ ] Open `frontend/index.html` (or `frontend_build/index.html` if automated)
  - [ ] Find: `const STREAM_URLS = {`
  - [ ] Replace `__URL_MONTHLY_SAVINGS_SUMMARY__` with actual Lambda URL
  - [ ] Should look like:
    ```javascript
    const STREAM_URLS = {
        monthly_savings_summary: 'https://xxxxx.lambda-url.ap-southeast-1.on.aws/',
    };
    ```

- [ ] **Upload to S3**
  - [ ] Manual: `aws s3 sync frontend/ s3://<BUCKET-NAME>/ --delete --cache-control no-cache`
  - [ ] Or: GitHub Actions handles this automatically

## Phase 8: Test the Live Application

- [ ] **Access Website**
  - [ ] Get Website URL from deployment output
  - [ ] Should look like: `http://smart-ai-finance-advisor-<ACCOUNT-ID>.s3-website-ap-southeast-1.amazonaws.com/`
  - [ ] Open in browser (might take a few seconds first time)
  - [ ] ✅ Should see Finance Advisor homepage

- [ ] **Fill Test Form**
  - [ ] Financial Situation: "I have $5000 savings, $2000 credit card debt, earning $5000/month"
  - [ ] Advice Topic: "Budgeting"
  - [ ] Risk Tolerance: "Moderate"
  - [ ] Monthly Income: "5000"

- [ ] **Test "Run All" Button**
  - [ ] Click "Run All"
  - [ ] Loading spinner appears
  - [ ] ⏱️ Wait 5-15 seconds
  - [ ] Text streams in gradually (token-by-token)
  - [ ] Should show structured advice with headers and bullet points
  - [ ] ❌ If error: Check browser console (F12 → Console tab)

- [ ] **Test Chat Follow-up**
  - [ ] In chat input: "How should I prioritize my debt?"
  - [ ] Click Send
  - [ ] Response streams into chat bubble
  - [ ] Previous exchange remains in chat history

- [ ] **Test on Mobile**
  - [ ] Open same URL on phone
  - [ ] Layout should be responsive
  - [ ] All buttons/inputs should be usable

## Phase 9: Verify Logging & Monitoring

- [ ] **Check CloudWatch Logs**
  ```bash
  aws logs tail /aws/lambda/smart-ai-finance-advisor-monthly-savings --follow
  ```
  - [ ] Should show execution logs from Lambda
  - [ ] No ERROR level messages

- [ ] **Check S3 Bucket Contents**
  ```bash
  aws s3 ls s3://<BUCKET-NAME>/
  ```
  - [ ] Should show: `index.html`, `style.css`, `app.js`

- [ ] **Check CloudFormation Stack**
  ```bash
  aws cloudformation describe-stacks \
    --stack-name smart-ai-personal-finance-advisor \
    --region ap-southeast-1
  ```
  - [ ] Status should be `CREATE_COMPLETE` or `UPDATE_COMPLETE`

## Phase 10: Cleanup & Documentation

- [ ] **Remove Sensitive Files**
  - [ ] ✅ Verify no AWS credentials in code
  - [ ] ✅ Verify `.gitignore` prevents accidental commits
  - [ ] Remove any local `.env` files

- [ ] **Document Custom Changes**
  - [ ] If you modified prompts, document in PROMPTS.md
  - [ ] If you added features, update README.md

- [ ] **Create DNS/Domain (Optional)**
  - [ ] Point custom domain to S3 website endpoint
  - [ ] Or CloudFront distribution (for HTTPS + caching)

- [ ] **Enable Backup**
  - [ ] S3 versioning: Already enabled in template
  - [ ] Consider cross-region replication

- [ ] **Set Cost Alerts** (Optional but Recommended)
  - [ ] AWS Console → **Billing** → **Budgets**
  - [ ] Create budget: $10/month
  - [ ] Alert if exceeded

## Troubleshooting Checklist

| Problem | Solution |
|---------|----------|
| "Bedrock model not found" | ✅ Check Phase 1 - Model Access status must be "Access Granted" |
| "Access Denied" from Bedrock | ✅ Verify IAM role has bedrock:InvokeModel permission |
| Lambda timeout | ✅ Increase timeout in infra/template.yaml, check Bedrock latency |
| "CORS error" in browser | ✅ Flask app has CORS headers, frontend URL matches backend |
| S3 sync fails | ✅ Check AWS credentials, bucket name, region |
| GitHub Actions fails | ✅ Verify all 3 secrets are set correctly, check logs |
| No response from Lambda | ✅ Check Lambda logs: `aws logs tail /aws/lambda/...` |
| "File not found" from S3 | ✅ Run `aws s3 sync frontend/ s3://bucket/ --delete` again |

## Success Indicators

- ✅ GitHub Actions workflow completes successfully (green checkmark)
- ✅ CloudFormation stack status is `CREATE_COMPLETE`
- ✅ Website loads in browser and displays Finance Advisor interface
- ✅ "Run All" button produces streaming text output within 10 seconds
- ✅ Chat sends and receives responses
- ✅ CloudWatch logs show successful Lambda invocations
- ✅ No JavaScript errors in browser console (F12)
- ✅ S3 bucket contains frontend files (index.html, style.css, app.js)

## Next Steps (Post-Deployment)

1. **Monitor first week** - Watch CloudWatch logs for any errors
2. **Test with real users** - Get feedback on UI/UX
3. **Add authentication** - Implement Cognito for user accounts
4. **Add database** - DynamoDB for conversation history
5. **Scale Bedrock** - Provision throughput for production traffic
6. **Add custom domain** - Point to CloudFront for global delivery
7. **Enable WAF** - Protect with AWS Web Application Firewall

---

**You're ready to deploy! Follow the checklist above for a smooth deployment experience. 🚀**
