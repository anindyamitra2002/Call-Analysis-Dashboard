from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import datetime
import pytz # For timezone handling
import time

# Assuming call_logs_reader.py is in the same directory or accessible in PYTHONPATH
try:
    from call_logs_reader import fetch_call_logs
except ImportError:
    # Fallback for environments where direct import might be tricky without proper packaging
    # This is a simplified way to handle it for this example.
    # In a real project, ensure your module structure and PYTHONPATH are correct.
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from call_logs_reader import fetch_call_logs_from_source


app = FastAPI(title="Call Analytics API")

# CORS (Cross-Origin Resource Sharing) middleware
# Allows frontend (running on a different port) to communicate with this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for simplicity, restrict in production
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Define IST timezone
IST = pytz.timezone('Asia/Kolkata')

class CallLogEntry(BaseModel):
    id: str
    call_timestamp_utc: str # ISO format string from backend
    duration_seconds: int
    phone_number: str
    stt_language: str
    llm_model: str
    tts_provider: str
    stt_provider: str
    llm_provider: str
    tts_voice: str
    use_retrieval: bool
    # Make cost fields optional
    cost_stt_usd: float
    cost_tts_usd: float
    cost_llm_usd: float
    total_cost_usd: float
    # Make these fields required
    stt_model: str
    llm_temperature: float
    tts_language: str
    auto_end_call: bool
    background_sound: bool
    vad_min_silence: float
    allow_interruptions: bool
    # Keep these as optional
    system_prompt: Optional[str] = None
    first_message: Optional[str] = None
    transcript: Optional[List[Dict[str, str]]] = None
    audio_url: Optional[str] = None


def transform_log_data(raw_log: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw log data into a standardized format for the frontend.
    """
    # Extract metadata and timestamps
    metadata = raw_log.get('metadata', {})
    print("\n=== Debug Information ===")
    print("Raw metadata keys:", list(metadata.keys()))
    print("\nSpecific fields debug:")
    print("auto_end_call:", metadata.get('auto_end_call'))
    print("background_sound:", metadata.get('background_sound'))
    print("vad_min_silence:", metadata.get('vad_min_silence'))
    print("is_allow_interruptions:", metadata.get('is_allow_interruptions'))
    print("TTS_language:", metadata.get('TTS_language'))
    print("LLM_temperature:", metadata.get('LLM_temperature'))
    print("STT_model:", metadata.get('STT_model'))
    print("========================\n")
    
    start_time = datetime.datetime.fromisoformat(raw_log['call_timestamps']['start'])
    end_time = datetime.datetime.fromisoformat(raw_log['call_timestamps']['end'])
    duration_seconds = int(raw_log['call_duration']['total_seconds'])
    
    # Calculate costs per minute
    duration_minutes = duration_seconds / 60
    llm_cost = duration_minutes * float(metadata.get('LLM_cost_per_min', 0))
    stt_cost = duration_minutes * float(metadata.get('STT_cost_per_min', 0))
    tts_cost = duration_minutes * float(metadata.get('TTS_cost_per_min', 0))
    total_cost = duration_minutes * float(metadata.get('total_cost_per_min', 0))
    
    # Transform the data
    return {
        'id': raw_log.get('blob_name', str(start_time.timestamp())),  # Using timestamp as fallback ID
        'call_timestamp_utc': start_time.astimezone(pytz.utc).isoformat(),
        'duration_seconds': duration_seconds,
        'phone_number': metadata.get('phone_number', ''),
        'stt_language': metadata.get('STT_language', 'en-IN'),
        'llm_model': metadata.get('LLM_model', 'gpt-3.5-turbo'),
        'tts_provider': metadata.get('TTS_provider', 'azure'),
        'stt_provider': metadata.get('STT_provider', 'azure'),
        'llm_provider': metadata.get('LLM_provider', 'openai'),
        'tts_voice': metadata.get('TTS_voice', 'en-IN-NeerjaNeural'),
        'use_retrieval': metadata.get('use_retrieval', False),
        'cost_stt_usd': round(float(stt_cost), 4),
        'cost_tts_usd': round(float(tts_cost), 4),
        'cost_llm_usd': round(float(llm_cost), 4),
        'total_cost_usd': round(float(total_cost), 4),
        'system_prompt': metadata.get('LLM_system_prompt', ''),
        'first_message': metadata.get('first_message', ''),
        'transcript': raw_log.get('conversation_transcript', []),
        'audio_url': raw_log.get('audio_file', {}).get('sas_url', ''),
        # Add missing fields with proper type conversion and consistent naming
        'stt_model': metadata.get('STT_model', ''),
        'llm_temperature': float(metadata.get('LLM_temperature', 0.7)),
        'tts_language': metadata.get('TTS_language', ''),
        'auto_end_call': bool(metadata.get('auto_end_call', False)),
        'background_sound': bool(metadata.get('background_sound', False)),
        'vad_min_silence': float(metadata.get('vad_min_silence', 0)),
        'allow_interruptions': bool(metadata.get('is_allow_interruptions', False))
    }

@app.get("/api/call-logs", response_model=List[CallLogEntry])
async def get_call_logs(
    from_date_str: str = Query(..., description="Start date in YYYY-MM-DD format"),
    to_date_str: str = Query(..., description="End date in YYYY-MM-DD format")
):
    """
    Fetches call logs for a specified date range.
    Dates are interpreted in IST.
    Start date is set to start of day (00:00:00) and end date to end of day (23:59:59.999999).
    """
    try:
        # Convert input date strings to date objects
        from_date = datetime.datetime.strptime(from_date_str, "%Y-%m-%d").date()
        to_date = datetime.datetime.strptime(to_date_str, "%Y-%m-%d").date()

        # Create datetime objects for start and end of day in IST
        start_datetime = datetime.datetime.combine(from_date, datetime.time.min).replace(tzinfo=IST)
        end_datetime = datetime.datetime.combine(to_date, datetime.time.max).replace(tzinfo=IST)

    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")

    if start_datetime > end_datetime:
        raise HTTPException(status_code=400, detail="From Date cannot be after To Date.")

    try:
        # Fetch raw logs using datetime objects
        raw_logs = fetch_call_logs(start_datetime, end_datetime)
        
        # Transform the logs to match CallLogEntry model
        transformed_logs = [transform_log_data(log) for log in raw_logs]

        # Validate and return logs
        validated_logs = [CallLogEntry(**log) for log in transformed_logs]
        return validated_logs
        
    except Exception as e:
        # Log the exception e for debugging
        print(f"Error fetching logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch call logs: {str(e)}")

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # Run from the `backend` directory: `python main.py`
    uvicorn.run(app, host="0.0.0.0", port=8000)