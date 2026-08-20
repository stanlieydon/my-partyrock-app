# Architecture Documentation

## System Design

```
┌──────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Frontend (HTML/CSS/JS - Static SPA)                   │  │
│  │  - React-free, vanilla JS for simplicity               │  │
│  │  - Real-time streaming via fetch() + ReadableStream   │  │
│  │  - Markdown rendering with fade-in animations         │  │
│  │  - Responsive mobile-first design                      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────┬───────────────────────────────────────────┘
                   │ HTTPS
        ┌──────────▼──────────┐
        │   AWS S3 Bucket     │
        │  Static Hosting     │
        │  Public Read Access │
        └──────────────────────┘

        ┌──────────────────────────────────────────────────┐
        │   NETWORK (HTTPS/REST)                           │
        └──────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│              AWS LAMBDA (Streaming)                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MonthlySavingsSummaryFunction                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │ Flask App (Python 3.12)                          │   │  │
│  │  │  - POST / endpoint                               │   │  │
│  │  │  - CORS headers on every response                │   │  │
│  │  │  - Stream Bedrock chunks via Response()          │   │  │
│  │  │  - 60s timeout, 256MB memory                      │   │  │
│  │  │                                                  │   │  │
│  │  │ Invoked as: RESPONSE_STREAM mode                 │   │  │
│  │  │ Runtime: Python 3.12 + Lambda Web Adapter       │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                         │  │
│  │ Role: AppBedrockRole (IAM)                             │  │
│  │  - AWSLambdaBasicExecutionRole (CloudWatch Logs)       │  │
│  │  - bedrock:InvokeModelWithResponseStream action        │  │
│  │                                                         │  │
│  │ Layers:                                                │  │
│  │  - arn:aws:lambda:ap-southeast-1:753240598075:        │  │
│  │    layer:LambdaAdapterLayerX86:27                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │  │
│ Function URL Config:                                       │  │
│  - No authentication required (NONE)                       │  │
│  - Response streaming enabled                             │  │
│  - Auto-generated HTTPS endpoint                          │  │
└────────────────────────────────────────────────────────────────┘
                         │
                    HTTPS/REST
                         │
        ┌────────────────▼───────────────────┐
        │   Amazon Bedrock                   │
        │                                    │
        │ Model: claude-haiku-4-5-20251001   │
        │ Inference: global (cross-region)   │
        │ API: InvokeModelWithResponseStream │
        │                                    │
        │ Input: Messages + JSON             │
        │ Output: Streaming text chunks      │
        └────────────────────────────────────┘
```

## Data Flow

### 1. User Submits Form
```
User fills in:
  - Financial Situation (text)
  - Advice Topic (dropdown)
  - Risk Tolerance (dropdown)
  - Monthly Income (slider/number)
         ↓
User clicks "Run All" button
         ↓
JavaScript collects form data into JSON object
```

### 2. Frontend Calls Lambda
```
fetch(STREAM_URLS.monthly_savings_summary, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(payload)
})
         ↓
Lambda Function URL HTTPS endpoint receives request
         ↓
RESPONSE_STREAM mode activates (not traditional HTTP response)
```

### 3. Backend Processes Request
```
Flask app receives POST / request
         ↓
Extracts JSON: financial_situation, advice_topic, etc.
         ↓
Builds system prompt for Claude:
  - User's financial context
  - Requested topic
  - Risk tolerance
  - Expected output format (sections)
         ↓
Calls bedrock_client.invoke_model_with_response_stream()
```

### 4. Bedrock Streams Response
```
Bedrock returns event stream:
  {
    "delta": {
      "type": "content_block_delta",
      "text": "## Financial Snapshot\n..."
    }
  }
         ↓
Each chunk ~20-100 tokens
         ↓
Flask yields chunk to client
```

### 5. Frontend Streams to UI
```
JavaScript fetch().body.getReader() reads stream
         ↓
TextDecoder converts bytes to UTF-8 strings
         ↓
Buffer incomplete lines (split by \n)
         ↓
For each complete line:
  - Parse markdown formatting
  - Wrap in <span class="md-line">
  - Add fade-in animation
  - Append to output panel
         ↓
User sees text appearing token-by-token in real-time
```

### 6. Chat Follow-Up
```
User types question in chat input
         ↓
JavaScript adds user message to conversationHistory array
         ↓
Sends POST to same Lambda with:
  - is_chat_followup: true
  - conversation_history: [prev messages]
         ↓
Backend includes conversation context in prompt
         ↓
Bedrock generates contextual response
         ↓
Response streams into chat bubble
```

## Component Details

### Frontend (S3 Static)

**Files:**
- `frontend/index.html` - Semantic HTML structure
- `frontend/style.css` - Responsive mobile-first CSS
- `frontend/app.js` - Streaming + markdown rendering logic

**Key Features:**
- No build step required (vanilla JS)
- Responsive grid layout
- 340px fixed-height scrollable panels for AI output
- Real-time streaming with TextDecoder
- Markdown rendering per line with animations
- Chat conversation history storage (in-memory)

**Streaming Implementation:**
```javascript
const response = await fetch(url, {method: 'POST', body: JSON.stringify(payload)});
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, {stream: true});
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep incomplete line
    
    for (const line of lines) {
        renderMarkdownLine(container, line);
    }
}
```

### Backend (Lambda + Flask)

**File:**
- `backend/monthly_savings_summary/app.py`

**Key Features:**
- Flask microframework
- CORS headers on every response (including OPTIONS)
- Stream-based response via `stream_with_context(generate())`
- Bedrock API client with cross-region support
- Error handling with meaningful messages

**Flask Implementation:**
```python
@app.route('/', methods=['POST', 'OPTIONS'])
def handle_request():
    if request.method == 'OPTIONS':
        return Response(headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type'
        })
    
    def generate():
        for chunk in stream_bedrock_response(prompt):
            yield chunk
    
    return Response(
        stream_with_context(generate()),
        content_type='text/plain; charset=utf-8'
    )
```

**Bedrock Integration:**
```python
response = bedrock_client.invoke_model_with_response_stream(
    modelId='global.anthropic.claude-haiku-4-5-20251001-v1:0-20260217-v1:0',
    body=json.dumps({
        'model': MODEL_ID,
        'max_tokens': 2000,
        'messages': [{'role': 'user', 'content': prompt}]
    })
)

for event in response.get('body'):
    if 'chunk' in event:
        chunk_data = json.loads(event['chunk']['bytes'])
        if 'delta' in chunk_data and 'text' in chunk_data['delta']:
            yield chunk_data['delta']['text']
```

### Infrastructure (SAM)

**File:**
- `infra/template.yaml`

**Key Resources:**

1. **AppBedrockRole** (IAM Role)
   - Allows Lambda to assume this role
   - Attaches AWSLambdaBasicExecutionRole for CloudWatch Logs
   - Custom policy: bedrock:InvokeModel + bedrock:InvokeModelWithResponseStream
   - Resources: Global inference profile ARN + foundation model ARNs

2. **MonthlySavingsSummaryFunction** (Lambda)
   - CodeUri: Points to Flask app
   - Handler: run.sh (shell script)
   - Runtime: python3.12
   - Layers: LambdaAdapterLayerX86 (converts HTTP to Lambda events)
   - Environment: AWS_LAMBDA_EXEC_WRAPPER, AWS_LWA_INVOKE_MODE
   - FunctionUrlConfig: RESPONSE_STREAM enabled, public NONE auth
   - Timeout: 60s, Memory: 256MB

3. **FrontendBucket** (S3)
   - Public read access (BlockPublicAcls: false)
   - Static website hosting enabled
   - index.html as IndexDocument
   - Versioning enabled (for rollback)

4. **FrontendBucketPolicy** (S3 Policy)
   - Allows s3:GetObject for all users
   - Enables public read of static files

### Deployment (GitHub Actions)

**File:**
- `.github/workflows/deploy.yml`

**Pipeline Steps:**

1. **Checkout** - Pull code from git
2. **Configure AWS** - Use GitHub Secrets for credentials
3. **Setup Python 3.12** - Prepare environment
4. **Setup SAM** - Install AWS SAM CLI
5. **SAM Build** - Package Flask app + dependencies
6. **SAM Deploy** - Create/update CloudFormation stack
7. **Extract Outputs** - Read Lambda + S3 URLs from stack
8. **Update Frontend** - Replace placeholder URLs with real endpoints
9. **Sync to S3** - Upload frontend to bucket
10. **Summary** - Display deployment details

## Scaling Considerations

### Current Limits (with defaults):
- Lambda: 256MB memory, 60s timeout
- Bedrock: Default quota (usually sufficient for MVP)
- S3: Unlimited requests
- Concurrent users: Limited by Lambda concurrency

### Scale Up:

1. **Increase Lambda Memory**
   - Edit `infra/template.yaml` MemorySize
   - Increases CPU proportionally
   - Costs: ~$0.0000167 per GB-second

2. **Add Lambda Concurrency Reservation**
   ```yaml
   ReservedConcurrentExecutions: 100
   ```

3. **Bedrock Throughput**
   - Use provisioned throughput instead of on-demand
   - SAM template: Add ModelInvocationConfig

4. **CloudFront CDN**
   - Cache frontend assets globally
   - Reduce S3 direct requests

5. **DynamoDB for History**
   - Replace in-memory conversation history
   - Persistent user sessions
   - Enable multi-device access

## Security Considerations

### Current Implementation:
- ✅ CORS headers (public API - by design)
- ✅ HTTPS only (Lambda Function URL + S3 HTTPS)
- ✅ No authentication (public app)
- ✅ Input validation (required fields checked)
- ✅ IAM roles (least privilege for Bedrock)

### Recommended Additions:
- Add API key authentication (for production)
- Implement rate limiting (AWS API Gateway)
- Add AWS WAF for DDoS protection
- Enable CloudTrail for audit logging
- Encrypt conversation history in database
- Add CORS domain restrictions (whitelist specific domains)

## Monitoring & Observability

### CloudWatch Logs:
```
/aws/lambda/smart-ai-finance-advisor-monthly-savings
```

### Metrics:
- Lambda duration, errors, throttles
- Bedrock token count, latency
- S3 request count

### Alarms (optional to add):
- Lambda errors > 5/min
- Duration > 30s
- Bedrock availability

## Cost Optimization

### Current Model (On-Demand):
- Lambda: $0.20 per 1M requests
- Bedrock: Claude Haiku ~$0.80 per 1M input tokens, $2.40 per 1M output tokens
- S3: $0.023 per GB storage, $0.0007 per 1K requests

### Optimize:
1. Cache responses (CloudFront)
2. Compress JavaScript bundle
3. Use Lambda layers for common dependencies
4. Consider Bedrock provisioned throughput for high volume
5. S3 lifecycle policies (archive old logs)

---

**Architecture designed for simplicity, reliability, and cost-efficiency.**
