# Visual Guide: Smart AI Personal Finance Advisor

This guide shows screenshots, diagrams, and visual references for deployment.

---

## Application UI (What Users See)

```
┌─────────────────────────────────────────────────────────────┐
│                    💰 Smart AI Personal Finance Advisor      │
│          Get personalized financial guidance powered by AI   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Welcome to Your AI Finance Advisor                           │
│                                                              │
│ Share your financial situation, select an advice topic, and │
│ let our AI provide tailored recommendations. You can follow │
│ up with specific questions in the chat below.               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Your Financial Profile                                       │
│                                                              │
│ Financial Situation                                          │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Describe your debts, savings, expenses, goals...         │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ Advice Topic                  Risk Tolerance                │
│ ┌─────────────────────────────┐ ┌──────────────────────────┐ │
│ │ Budgeting         ▼         │ │ Moderate         ▼       │ │
│ └─────────────────────────────┘ └──────────────────────────┘ │
│                                                              │
│ Monthly Income ($)                                           │
│ ├─────────────┬─────────┤  5000                             │
│ └─────────────────────────┘                                 │
│                                                              │
│              [           Run All           ]                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📊 Monthly Savings Summary                                   │
│                                                              │
│ ## Financial Snapshot                                        │
│ Based on your $5000/month income and reported expenses...    │
│                                                              │
│ ## Key Recommendations                                       │
│ • Create a monthly budget using 50/30/20 rule               │
│ • Pay off high-interest credit card debt first              │
│ • Build 3-month emergency fund                              │
│                                                              │
│ [scrollable panel - 340px height]                           │
│                                                              │
│ ▓▓▓▓                                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 💬 Finance Advisor Chat                                      │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                         │ │
│ │      Hello! I'm your AI Finance Advisor. Ask me        │ │
│ │      anything about the recommendations above or       │ │
│ │      your personal finances.                           │ │
│ │                                                         │ │
│ │ ┌───────────────────────────────────────────────────┐ │ │
│ │ │ How should I prioritize paying off my debt?      │ │ │
│ │ └───────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │      First, stop adding to credit card debt. Then       │ │
│ │      consider avalanche method (high interest first)    │ │
│ │      or snowball method (smallest balance first)...     │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────┐  [   Send   ]          │
│ │ Ask a follow-up question...     │                         │
│ └─────────────────────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Loads: frontend/index.html                            │  │
│  │  CSS: style.css                                        │  │
│  │  JS: app.js                                            │  │
│  │                                                        │  │
│  │  User fills form + clicks "Run All"                    │  │
│  │  fetch(STREAM_URL, {method: 'POST', body: JSON})      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS Request
                       ▼
         ┌─────────────────────────────┐
         │  AWS S3 BUCKET              │
         │  ┌───────────────────────┐  │
         │  │ Serves static files:  │  │
         │  │ - index.html          │  │
         │  │ - style.css           │  │
         │  │ - app.js              │  │
         │  └───────────────────────┘  │
         │                             │
         │ Public Read Access          │
         │ Website URL endpoint        │
         └─────────────────────────────┘

         ┌─────────────────────────────────────────────────────┐
         │  AWS LAMBDA FUNCTION (monthly_savings_summary)      │
         │  ┌───────────────────────────────────────────────┐  │
         │  │ Runtime: Python 3.12                          │  │
         │  │ Handler: run.sh (Flask app)                   │  │
         │  │                                               │  │
         │  │ Route: POST /                                 │  │
         │  │ ┌─────────────────────────────────────────┐   │  │
         │  │ │ receive request JSON                    │   │  │
         │  │ │ build prompt with user context          │   │  │
         │  │ │ call bedrock_client.invoke_model_       │   │  │
         │  │ │   with_response_stream()                │   │  │
         │  │ │ yield chunks as they arrive             │   │  │
         │  │ │ return Response(..., streaming=True)    │   │  │
         │  │ └─────────────────────────────────────────┘   │  │
         │  │                                               │  │
         │  │ Memory: 256MB                                 │  │
         │  │ Timeout: 60 seconds                           │  │
         │  │ Streaming: Response Stream Invocation         │  │
         │  │ URL: <FUNCTION_URL>                           │  │
         │  └───────────────────────────────────────────────┘  │
         │                                                     │
         │ IAM Role: AppBedrockRole                            │
         │ ├─ AWSLambdaBasicExecutionRole                     │
         │ └─ bedrock:InvokeModelWithResponseStream           │
         └─────────────────────────────────────────────────────┘
                            │ API Call
                            ▼
                  ┌────────────────────────┐
                  │  Amazon Bedrock API    │
                  │                        │
                  │ Model:                 │
                  │ claude-haiku-4-5-...   │
                  │ (Global Inference)     │
                  │                        │
                  │ Input: JSON messages   │
                  │ Output: Text stream    │
                  │                        │
                  │ Region: ap-southeast-1 │
                  └────────────────────────┘
```

---

## Data Flow Diagram

```
Step 1: User Action
┌─────────────┐
│ User fills  │
│ form        │
└──────┬──────┘
       │ Click "Run All"
       ▼
┌─────────────────────────────────────────┐
│ JavaScript collects form data:          │
│ - financial_situation (text)            │
│ - advice_topic (dropdown)               │
│ - risk_tolerance (dropdown)             │
│ - monthly_income (number)               │
└──────┬──────────────────────────────────┘
       │
       ▼ JSON POST to Lambda
┌─────────────────────────────────────────┐
│ Lambda receives request                 │
│ Validates required fields               │
│ Builds prompt with context:             │
│                                         │
│ "User Financial Profile:                │
│  - Situation: {financial_situation}     │
│  - Income: ${monthly_income}            │
│  - Risk: {risk_tolerance}               │
│  - Topic: {advice_topic}                │
│                                         │
│  Provide structured advice with:        │
│  - Financial Snapshot                   │
│  - Key Recommendations                  │
│  - Quick Tips                           │
│  - Warnings                             │
│  - Next Steps"                          │
└──────┬──────────────────────────────────┘
       │
       ▼ Invoke with Response Stream
┌─────────────────────────────────────────┐
│ Bedrock Claude Haiku 4.5                │
│ Generates response token-by-token       │
│ Streams back via event stream:          │
│                                         │
│ "## Financial Snapshot\nBased..."       │
│ "on your $5000 monthly income"          │
│ "and debt situation...\n\n"             │
│ "## Key Recommendations\n"              │
│ "- Create budget using 50/30/20"        │
│ ...                                     │
└──────┬──────────────────────────────────┘
       │ Response Stream (chunks)
       ▼
┌──────────────────────────────────────────────┐
│ Lambda Response Streaming                    │
│ Yields chunks to client in real-time         │
│                                              │
│ Chunk 1: "## Financial "                     │
│ Chunk 2: "Snapshot\n"                        │
│ Chunk 3: "Based on your..."                  │
│ Chunk 4: " income and debt..."               │
└──────┬───────────────────────────────────────┘
       │ HTTPS Stream
       ▼
┌──────────────────────────────────────────────┐
│ JavaScript Receives Stream                   │
│                                              │
│ const reader = response.body.getReader();    │
│ const decoder = new TextDecoder();           │
│                                              │
│ while (true) {                               │
│   const {done, value} = await reader.read(); │
│   if (done) break;                           │
│   buffer += decoder.decode(value);           │
│   process each complete line                 │
│ }                                            │
└──────┬───────────────────────────────────────┘
       │ Lines to render
       ▼
┌──────────────────────────────────────────────┐
│ Markdown Rendering                           │
│                                              │
│ For each line:                               │
│ 1. Parse markdown:                           │
│    "## Section" → <h2>Section</h2>           │
│    "**bold**" → <strong>bold</strong>        │
│    "*italic*" → <em>italic</em>              │
│                                              │
│ 2. Create element:                           │
│    <span class="md-line">...</span>          │
│                                              │
│ 3. Add animation:                            │
│    @keyframes fadeInLine { ... }             │
│                                              │
│ 4. Append to panel                           │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ User Sees Text Appearing                     │
│ Token-by-token animation                     │
│ Markdown formatting applied                  │
│ Auto-scroll to bottom                        │
└──────────────────────────────────────────────┘
```

---

## Deployment Pipeline

```
Step 1: Developer
┌─────────────────────────────┐
│ 1. Make code changes        │
│ 2. git add .                │
│ 3. git commit -m "..."      │
│ 4. git push origin main     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ GitHub Repository           │
│ (Webhook triggers workflow) │
└──────────────┬──────────────┘
               │
               ▼
Step 2: GitHub Actions
┌─────────────────────────────────────────────┐
│ 1. [Checkout] Code retrieved                │
│ 2. [AWS Config] Credentials set             │
│ 3. [Setup Python] 3.12 environment          │
│ 4. [SAM Build] Template validated           │
│    - Compiles Flask app                     │
│    - Bundles dependencies                   │
│    - Creates build artifacts                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│ 5. [SAM Deploy] Creates CloudFormation      │
│    stack-name: smart-ai-personal-finance-   │
│                advisor                      │
│    s3-bucket: sam-deploy-XXX                │
│    capabilities: CAPABILITY_IAM              │
│    region: ap-southeast-1                   │
│                                             │
│    Creates:                                 │
│    ├─ Lambda function                       │
│    ├─ IAM role                              │
│    ├─ S3 bucket                             │
│    └─ Function URL                          │
└──────────────┬──────────────────────────────┘
               │
               ▼
Step 3: AWS Resources Created
┌─────────────────────────────────────────────┐
│ CloudFormation Stack Status:                │
│ • CREATE_COMPLETE ✅                        │
│                                             │
│ Outputs:                                    │
│ • MonthlySavingsSummaryUrl:                 │
│   https://xxxxx.lambda-url.ap-southeast-1. │
│   on.aws/                                   │
│                                             │
│ • WebsiteUrl:                               │
│   http://smart-ai-finance-advisor-XXXX.    │
│   s3-website-ap-southeast-1.amazonaws.com  │
│                                             │
│ • BucketName:                               │
│   smart-ai-finance-advisor-XXXX            │
└──────────────┬──────────────────────────────┘
               │
               ▼
Step 4: Frontend URL Update
┌─────────────────────────────────────────────┐
│ GitHub Actions:                             │
│ 1. Extract Lambda URL from outputs          │
│ 2. Read frontend/index.html                 │
│ 3. Replace placeholder:                     │
│    __URL_MONTHLY_SAVINGS_SUMMARY__          │
│    WITH: https://xxxxx.lambda-url...       │
│ 4. Sync to S3 bucket                        │
│    aws s3 sync frontend/ s3://bucket/ ...  │
└──────────────┬──────────────────────────────┘
               │
               ▼
Step 5: Application Live
┌──────────────────────────────────────────────┐
│ ✅ Deployment Complete                       │
│                                              │
│ Website accessible:                          │
│ http://smart-ai-finance-advisor-XXXX.       │
│ s3-website-ap-southeast-1.amazonaws.com    │
│                                              │
│ Lambda streaming to:                         │
│ https://xxxxx.lambda-url.ap-southeast-1.   │
│ on.aws/                                      │
│                                              │
│ Ready for users! 🚀                          │
└──────────────────────────────────────────────┘
```

---

## File Organization

```
Smart AI Personal Finance Advisor/
│
├── 📄 Documentation
│   ├── README.md                    ← Start here
│   ├── QUICK_START.md               ← 5-minute deploy
│   ├── DEPLOYMENT.md                ← Detailed steps
│   ├── SETUP_CHECKLIST.md           ← Verify everything
│   ├── LOCAL_DEVELOPMENT.md         ← Test locally
│   ├── ARCHITECTURE.md              ← System design
│   ├── PROJECT_OVERVIEW.md          ← Everything
│   ├── BUILD_SUMMARY.md             ← What was built
│   └── VISUAL_GUIDE.md              ← This file
│
├── 🎨 Frontend
│   ├── index.html                   ← UI structure
│   ├── style.css                    ← Responsive design
│   └── app.js                       ← Streaming logic
│
├── 🐍 Backend
│   └── monthly_savings_summary/
│       ├── app.py                   ← Flask + Bedrock
│       ├── requirements.txt         ← Dependencies
│       └── run.sh                   ← Startup script
│
├── ☁️  Infrastructure
│   └── infra/
│       └── template.yaml            ← SAM + CloudFormation
│
├── 🔄 CI/CD
│   └── .github/workflows/
│       └── deploy.yml               ← GitHub Actions
│
└── ⚙️  Config
    └── .gitignore                   ← Git ignore rules
```

---

## Deployment Decision Tree

```
                    START: Ready to Deploy?
                           │
            ┌──────────────┴──────────────┐
            │                             │
       Have AWS                      Need AWS
       Account?                      Account?
            │                             │
           YES                           NO
            │                             │
            ▼                             ▼
    AWS Console →                  Create AWS
    Bedrock Access                 Free Account
            │                             │
            │◄────────────────────────────┘
            │
    Bedrock Model
    Access Granted?
            │
       NO  │  YES
       ┌───┴────┐
       │        │
       ▼        ▼
    WAIT   Continue
   (5-15       │
    min)   Credentials ready?
            │
        NO  │  YES
        ┌───┴────────┐
        │            │
        ▼            ▼
    Get from    GitHub Secrets
    IAM User    Configured?
        │            │
        └────┬───────┘
             │
         NO  │  YES
         ┌───┴────┐
         │        │
         ▼        ▼
       STOP   Ready to
       (Add    Deploy
      creds)    │
               ▼
         Push to main branch
               │
               ▼
      GitHub Actions runs
      (3-5 minutes)
               │
      ┌────────┴─────────┐
      │                  │
    PASS              FAIL
      │                  │
      ▼                  ▼
   SUCCESS         Check logs
      │            Fix issues
      │                  │
      ▼                  │
 Get URLs           Retry push
      │                  │
      ▼                  └──→ SUCCESS
  Open website URL
  in browser
      │
      ▼
   Test App
      │
  ✅ LIVE!
```

---

## Status Dashboard (After Deployment)

```
┌─────────────────────────────────────────────────────────────┐
│  Smart AI Personal Finance Advisor - Status Dashboard       │
│                                                              │
│  ✅ Website Running                                          │
│     URL: http://smart-ai-finance-advisor-123456789.         │
│          s3-website-ap-southeast-1.amazonaws.com            │
│     Status: Accessible ✅                                    │
│     Response Time: 234ms                                    │
│                                                              │
│  ✅ Lambda Function Active                                   │
│     Name: smart-ai-finance-advisor-monthly-savings         │
│     Endpoint: https://xxxxx.lambda-url.ap-southeast-1.     │
│               on.aws/                                       │
│     Status: Running ✅                                       │
│     Memory: 256MB                                           │
│     Timeout: 60s                                            │
│                                                              │
│  ✅ Bedrock Model Connected                                  │
│     Model: claude-haiku-4-5-20251001-v1:0                   │
│     Region: ap-southeast-1                                  │
│     Access: Granted ✅                                       │
│     Last Request: 2 min ago                                 │
│                                                              │
│  ✅ S3 Bucket Healthy                                        │
│     Name: smart-ai-finance-advisor-123456789               │
│     Objects: 3 (index.html, style.css, app.js)             │
│     Size: 245KB                                             │
│     Status: Accessible ✅                                    │
│                                                              │
│  ✅ CloudWatch Logging                                       │
│     Log Group: /aws/lambda/smart-ai-finance-advisor-...    │
│     Logs: 42 entries                                        │
│     Errors: 0                                               │
│     Last Entry: 2 min ago                                   │
│                                                              │
│  ✅ Stack: CREATE_COMPLETE                                   │
│     Last Update: Today at 2:34 PM                           │
│     Drift: None                                             │
│                                                              │
│  📊 Metrics (Last Hour)                                      │
│     Lambda Invocations: 14                                  │
│     Avg Duration: 8.2s                                      │
│     Errors: 0                                               │
│     Throttles: 0                                            │
│     S3 Requests: 28                                         │
│     Bedrock Tokens: ~12,400                                 │
│     Estimated Cost: $0.004                                  │
│                                                              │
│  💰 Estimated Monthly Cost                                   │
│     At current usage: $0.84                                 │
│     Projected 1000 users: $8.40                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Quick Reference: Command Line

```bash
# Enable Bedrock Model Access
aws bedrock list-foundation-models --region ap-southeast-1

# Check Stack Status
aws cloudformation describe-stacks \
  --stack-name smart-ai-personal-finance-advisor \
  --region ap-southeast-1

# View Lambda Logs
aws logs tail /aws/lambda/smart-ai-finance-advisor-monthly-savings \
  --follow --region ap-southeast-1

# Test Lambda Directly
curl -X POST <LAMBDA_URL> \
  -H "Content-Type: application/json" \
  -d '{"financial_situation":"test","advice_topic":"Budgeting","risk_tolerance":"Moderate","monthly_income":5000}'

# List S3 Bucket Contents
aws s3 ls s3://smart-ai-finance-advisor-<ACCOUNT-ID>/

# Deploy Manually
sam build --template infra/template.yaml
sam deploy --stack-name smart-ai-personal-finance-advisor \
  --s3-bucket <SAM_DEPLOY_BUCKET> \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --region ap-southeast-1 \
  --no-confirm-changeset

# Sync Frontend to S3
aws s3 sync frontend/ s3://smart-ai-finance-advisor-<ACCOUNT-ID>/ \
  --delete --cache-control no-cache
```

---

## Checklist: What You'll See

### During Deployment (GitHub Actions)

- ✅ "Checkout code" - Green checkmark
- ✅ "Configure AWS credentials" - Green checkmark
- ✅ "Setup Python" - Green checkmark
- ✅ "Setup SAM CLI" - Green checkmark
- ✅ "Build SAM template" - Green checkmark
- ✅ "Deploy SAM stack" - Green checkmark (3-5 min)
- ✅ "Get Stack Outputs" - Shows URLs
- ✅ "Update Frontend" - Shows URL replacement
- ✅ "Deploy Frontend to S3" - Green checkmark
- ✅ "Deployment Summary" - Shows Website URL + Lambda URL

### After Deployment (Web Browser)

- ✅ Website loads (no 404 error)
- ✅ Finance Advisor welcome message visible
- ✅ Form fields editable
- ✅ Fill form and click "Run All"
- ✅ Loading spinner appears
- ✅ Text streams in (token-by-token)
- ✅ Headers and formatting visible
- ✅ Chat sends messages
- ✅ Response appears in chat bubble
- ✅ No JavaScript errors (F12 console)

### In AWS Console

- ✅ CloudFormation → Stack "smart-ai-personal-finance-advisor" exists
- ✅ Lambda → Function "smart-ai-finance-advisor-monthly-savings" exists
- ✅ S3 → Bucket "smart-ai-finance-advisor-<ACCOUNT-ID>" exists
- ✅ Bedrock → Model Access shows "Access Granted"
- ✅ CloudWatch Logs → Log group exists with recent entries

---

**Everything you see in this guide confirms successful deployment. You're ready to go! 🚀**
