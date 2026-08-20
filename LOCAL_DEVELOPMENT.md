# Local Development Guide

This guide helps you test the application locally before deploying to AWS.

## Prerequisites

- Python 3.12+
- pip
- AWS CLI configured with credentials
- Bedrock model access enabled (same as production)

## Setup

### 1. Install Python Dependencies

```bash
cd backend/monthly_savings_summary
pip install -r requirements.txt
```

### 2. Configure AWS Credentials

Ensure your AWS credentials are set up:

```bash
aws configure
# Enter your Access Key ID
# Enter your Secret Access Key
# Default region: ap-southeast-1
# Default output format: json
```

Verify connection:
```bash
aws sts get-caller-identity
```

## Running Locally

### Option 1: Flask Development Server

```bash
cd backend/monthly_savings_summary
python app.py
```

The server will run on `http://localhost:8080`

### Option 2: Open Frontend in Browser

1. Open `frontend/index.html` directly in your browser
2. Update `frontend/app.js` to use localhost:

```javascript
const STREAM_URLS = {
    monthly_savings_summary: 'http://localhost:8080',
};
```

### Option 3: Use Python HTTP Server

Serve frontend locally:

```bash
cd frontend
python -m http.server 8000
```

Then open `http://localhost:8000` and update app.js URLs to `http://localhost:8080`

## Testing

### Test the Lambda Function Locally

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{
    "financial_situation": "I earn $5000/month, have $2000 credit card debt, and $5000 savings.",
    "advice_topic": "Budgeting",
    "risk_tolerance": "Moderate",
    "monthly_income": 5000
  }'
```

### Test Streaming

Verify chunks are streaming (should show tokens appearing gradually):

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"financial_situation":"test","advice_topic":"Budgeting","risk_tolerance":"Moderate","monthly_income":5000}' \
  --no-buffer
```

### Test CORS

```bash
curl -X OPTIONS http://localhost:8080 \
  -H "Origin: http://localhost:8000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

You should see CORS headers in response.

## Debugging

### View Bedrock API Calls

Set environment variable:
```bash
export AWS_DEBUG=true
python app.py
```

### Check IAM Permissions

```bash
aws bedrock list-foundation-models --region ap-southeast-1
```

If error, check IAM role has `bedrock:InvokeModel` permission.

### Enable Verbose Logging

In `backend/monthly_savings_summary/app.py`, add:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Making Changes

### Frontend Changes

1. Edit `frontend/index.html`, `frontend/style.css`, or `frontend/app.js`
2. Refresh browser
3. No rebuild needed

### Backend Changes

1. Edit `backend/monthly_savings_summary/app.py`
2. Stop and restart Flask server
3. Test with curl

### Add New Endpoints

Example: Add a new AI feature

```python
@app.route('/new-feature', methods=['POST'])
def new_feature():
    data = request.get_json()
    # ... implementation
    return Response(stream_with_context(generate()), ...)
```

Then update frontend `app.js` to call it.

## Common Issues

### "ModuleNotFoundError: No module named 'flask'"

Install dependencies:
```bash
pip install -r backend/monthly_savings_summary/requirements.txt
```

### "NoCredentialsError" from Bedrock

Check AWS credentials:
```bash
aws sts get-caller-identity
```

If error, run `aws configure` again.

### CORS errors in browser console

Ensure Flask app is handling CORS. Check:
1. `@app.route(..., methods=['POST', 'OPTIONS'])`
2. Response headers include `Access-Control-Allow-Origin: *`
3. Both frontend and backend are running on correct ports

### Port 8080 already in use

Kill existing process:
```bash
# macOS/Linux
lsof -i :8080
kill -9 <PID>

# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 8080).OwningProcess | Stop-Process
```

## Testing the Full App

### Step-by-step local test:

1. **Start backend**:
   ```bash
   cd backend/monthly_savings_summary
   python app.py
   ```

2. **Start frontend** (new terminal):
   ```bash
   cd frontend
   python -m http.server 8000
   ```

3. **Edit frontend URL**:
   - Open `frontend/index.html` in editor
   - Find `const STREAM_URLS = {...}`
   - Change placeholder to `'http://localhost:8080'`
   - Refresh browser

4. **Test in browser**:
   - Go to `http://localhost:8000`
   - Fill in form
   - Click "Run All"
   - Watch streaming response appear
   - Test chat

## Database for Local Development

To add persistence (optional):

### SQLite (simple):
```python
import sqlite3
conn = sqlite3.connect('finance_advisor.db')
cursor = conn.cursor()
cursor.execute('''CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    user_id TEXT,
    messages TEXT,
    created_at TIMESTAMP
)''')
conn.commit()
```

### Or use DynamoDB locally:
```bash
docker pull amazon/dynamodb-local
docker run -p 8000:8000 amazon/dynamodb-local
```

Then configure boto3 to use local endpoint.

## Performance Testing

### Measure streaming latency:

```bash
time curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"financial_situation":"test","advice_topic":"Budgeting","risk_tolerance":"Moderate","monthly_income":5000}' \
  --no-buffer > /dev/null
```

### Load test with Apache Bench:

```bash
ab -n 10 -c 2 -p payload.json -T application/json http://localhost:8080/
```

## Building for Production

Before deploying, run:

```bash
# Verify SAM template
sam validate --template infra/template.yaml

# Build locally (mimics CI)
sam build --template infra/template.yaml

# Check built artifacts
ls -la .aws-sam/
```

## Updating Dependencies

To update Python packages safely:

```bash
pip list --outdated
pip install --upgrade flask boto3
pip freeze > backend/monthly_savings_summary/requirements.txt
```

Then test thoroughly before committing.

---

**Happy developing! 🚀**
