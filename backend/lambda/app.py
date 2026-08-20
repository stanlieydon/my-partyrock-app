import json
import base64
import boto3
from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "allow_headers": ["Content-Type"]}})

bedrock_client = boto3.client('bedrock-runtime', region_name='ap-southeast-1')

MODEL_ID = 'global.anthropic.claude-haiku-4-5-20251001-v1:0-20260217-v1:0'


def build_prompt(financial_situation, advice_topic, risk_tolerance, monthly_income, is_chat_followup=False, conversation_history=None):
    """Build the prompt for Bedrock based on inputs."""
    
    if is_chat_followup and conversation_history:
        # Format conversation history for context
        history_text = ""
        for msg in conversation_history[:-1]:  # Exclude the last message (current user query)
            role = "User" if msg['role'] == 'user' else "Advisor"
            history_text += f"\n{role}: {msg['content']}"
        
        prompt = f"""You are an expert AI Personal Finance Advisor. 

User's Financial Context:
- Situation: {financial_situation}
- Monthly Income: ${monthly_income}
- Risk Tolerance: {risk_tolerance}
- Topic Focus: {advice_topic}

Previous Conversation:
{history_text}

Continue providing helpful, personalized financial advice based on the new question. Be specific, actionable, and consider their stated risk tolerance and financial situation."""
    else:
        # Initial AI response
        prompt = f"""You are an expert Personal AI Finance Advisor. Analyze the user's financial situation and provide structured, actionable advice.

User Financial Profile:
- Financial Situation: {financial_situation}
- Monthly Income: ${monthly_income}
- Risk Tolerance: {risk_tolerance}
- Requested Advice Topic: {advice_topic}

Provide a structured financial summary with these sections:

## Financial Snapshot
Summarize their current situation briefly.

## Key Recommendations
List 3-5 specific, actionable recommendations for {advice_topic} that match their {risk_tolerance} risk tolerance.

## Quick Tips
Provide 2-3 quick wins they can implement this month.

## Warnings
Highlight any potential financial risks based on their situation.

## Next Steps
Outline 1-2 concrete actions to take in the next 30 days.

Be practical, specific, and consider their monthly income of ${monthly_income} in all recommendations."""

    return prompt


def stream_bedrock_response(prompt, system_instruction=None):
    """Stream response from Bedrock using invoke_model_with_response_stream."""
    
    messages = [
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    body = {
        "model": MODEL_ID,
        "max_tokens": 2000,
        "messages": messages
    }
    
    if system_instruction:
        body["system"] = system_instruction
    
    try:
        response = bedrock_client.invoke_model_with_response_stream(
            modelId=MODEL_ID,
            body=json.dumps(body)
        )
        
        for event in response.get('body', []):
            if 'chunk' in event:
                chunk = event['chunk']
                chunk_data = json.loads(chunk.get('bytes', b'{}'))
                
                if 'delta' in chunk_data and 'text' in chunk_data['delta']:
                    text = chunk_data['delta']['text']
                    yield text
                    
    except Exception as e:
        raise Exception(f"Bedrock API error: {str(e)}")


def generate_ai_response(financial_situation, advice_topic, risk_tolerance, monthly_income, is_chat_followup=False, conversation_history=None):
    """Generator that yields streaming text from AI."""
    
    prompt = build_prompt(
        financial_situation=financial_situation,
        advice_topic=advice_topic,
        risk_tolerance=risk_tolerance,
        monthly_income=monthly_income,
        is_chat_followup=is_chat_followup,
        conversation_history=conversation_history
    )
    
    for chunk in stream_bedrock_response(prompt):
        yield chunk


@app.route('/', methods=['POST', 'OPTIONS'])
def handle_request():
    """Handle POST requests for AI-generated financial advice."""
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = Response()
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS'
        return response
    
    try:
        data = request.get_json()
        
        # Extract inputs
        financial_situation = data.get('financial_situation', '')
        advice_topic = data.get('advice_topic', 'General Financial Planning')
        risk_tolerance = data.get('risk_tolerance', 'Moderate')
        monthly_income = data.get('monthly_income', 0)
        is_chat_followup = data.get('is_chat_followup', False)
        conversation_history = data.get('conversation_history', [])
        
        # Validate required fields
        if not financial_situation:
            return Response(
                "Error: financial_situation is required",
                status=400,
                content_type="text/plain; charset=utf-8"
            )
        
        # Stream the response
        def generate():
            try:
                for chunk in generate_ai_response(
                    financial_situation=financial_situation,
                    advice_topic=advice_topic,
                    risk_tolerance=risk_tolerance,
                    monthly_income=monthly_income,
                    is_chat_followup=is_chat_followup,
                    conversation_history=conversation_history
                ):
                    yield chunk
            except Exception as e:
                yield f"\n\nError generating response: {str(e)}"
        
        response = Response(
            stream_with_context(generate()),
            content_type="text/plain; charset=utf-8"
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS'
        
        return response
        
    except Exception as e:
        response = Response(
            f"Error: {str(e)}",
            status=500,
            content_type="text/plain; charset=utf-8"
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response


if __name__ == '__main__':
    # Flask will be wrapped by Lambda adapter, listening on PORT
    app.run(host='0.0.0.0', port=8080, debug=False)
