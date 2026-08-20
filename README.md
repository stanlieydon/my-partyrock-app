# Smart AI Personal Finance Advisor

A production-grade AWS serverless application that provides personalized financial guidance using Amazon Bedrock and Claude AI.

## Architecture

- **Frontend**: Static SPA hosted on S3 (HTML/CSS/JS)
- **Backend**: Python Flask on AWS Lambda with streaming responses
- **AI**: Amazon Bedrock with Claude Haiku 4.5
- **Deployment**: AWS SAM + GitHub Actions
- **Region**: ap-southeast-1

## Features

- Real-time token-by-token streaming from Bedrock
- Markdown rendering with animations
- Responsive mobile/desktop UI
- File upload support for document analysis
- Multi-topic financial advice (Budgeting, Investing, etc.)
- Interactive chat for follow-up questions
- Risk tolerance-based recommendations

## Pre-Deployment Checklist

Before deploying, you must:

1. **Enable Bedrock Model Access**
   - Go to AWS Console → Bedrock → Model Access
   - Request access to: `global.anthropic.claude-haiku-4-5-20251001-v1:0-20260217-v1:0`
   - Region: ap-southeast-1
   - Note: First-time accounts must submit a use-case form (usually auto-approved)

2. **Create SAM Deployment Bucket**
   - S3 bucket for CloudFormation artifacts
   - Add to GitHub Secrets as `SAM_DEPLOY_BUCKET`

3. **Set GitHub Secrets**
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SAM_DEPLOY_BUCKET`

## Deployment

Push to `main` branch or use GitHub Actions `workflow_dispatch` to trigger deployment.

## Project Structure

```
.
├── frontend/
│   ├── index.html          # Main app UI
│   ├── style.css           # Responsive styling
│   └── app.js              # Client-side logic
├── backend/
│   └── monthly_savings_summary/
│       ├── app.py          # Flask streaming handler
│       ├── run.sh          # Lambda startup script
│       └── requirements.txt
├── infra/
│   └── template.yaml       # SAM infrastructure template
├── .github/workflows/
│   └── deploy.yml          # CI/CD pipeline
└── README.md
```

## Local Development

```bash
# Install dependencies
pip install -r backend/monthly_savings_summary/requirements.txt

# Run Flask locally (for testing)
cd backend/monthly_savings_summary
python app.py

# Test with curl
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"financial_situation":"...", "monthly_income":5000, ...}'
```
