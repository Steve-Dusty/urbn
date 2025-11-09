from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from pathlib import Path
import shutil
import json
from simulation_agents.orchestrate import orchestrate
from simulation_agents.simple_chat_agent import refresh_documents

app = FastAPI(title="Urban Planning Simulation API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Documents directory
DOCUMENTS_DIR = Path(__file__).parent / "documents"
DOCUMENTS_DIR.mkdir(exist_ok=True)


class OrchestrationRequest(BaseModel):
    action: str
    message: str = ""
    session_id: str = "default"
    city: str = ""
    stream: bool = False
    simulation_type: str = "Urban Traffic"
    granularity: str = "Macro"
    time_horizon: int = 10


@app.get("/")
def read_root():
    return {"message": "Urban Planning Simulation API", "status": "running"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document to the documents folder."""
    try:
        file_path = DOCUMENTS_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Refresh document context and run parser
        refresh_documents()

        # Auto-run parser to extract structured data
        print(f"🔄 Auto-running parser for uploaded file: {file.filename}")
        parse_result = orchestrate(action="parse")
        print(f"✅ Parser completed for {file.filename}")

        return {
            "status": "success",
            "message": f"File '{file.filename}' uploaded and parsed successfully",
            "filename": file.filename,
            "path": str(file_path),
            "parsed": True
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")


@app.get("/orchestrate")
@app.post("/orchestrate")
async def run_orchestrate(request: OrchestrationRequest = None):
    """
    Main orchestration endpoint. ALL actions go through here.

    GET /orchestrate - Default parse action
    POST /orchestrate - Specify action (parse, chat, scrape)
    """
    try:
        # Default to parse for GET requests
        if request is None:
            result = orchestrate(action="parse")
            return result

        # Handle different actions
        if request.action == "chat":
            # Chat action returns streaming generator
            def generate_response():
                for chunk in orchestrate(
                    action="chat",
                    message=request.message,
                    session_id=request.session_id
                ):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            return StreamingResponse(
                generate_response(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                }
            )

        elif request.action == "city_data":
            # City data action - check if streaming or sync
            if request.stream:
                # Streaming mode for real-time updates
                def generate_city_data():
                    for chunk in orchestrate(
                        action="city_data",
                        city=request.city,
                        stream=True
                    ):
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"

                return StreamingResponse(
                    generate_city_data(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "X-Accel-Buffering": "no",
                    }
                )
            else:
                # Synchronous mode - return complete result
                result = orchestrate(
                    action="city_data",
                    city=request.city,
                    stream=False
                )
                return result

        elif request.action == "policy_analysis":
            # Policy analysis action - check if streaming or sync
            if request.stream:
                # Streaming mode for real-time updates
                def generate_policy_analysis():
                    for chunk in orchestrate(
                        action="policy_analysis",
                        file_name=request.message,  # Use message field for file name
                        stream=True
                    ):
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"

                return StreamingResponse(
                    generate_policy_analysis(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "X-Accel-Buffering": "no",
                    }
                )
            else:
                # Synchronous mode - return complete result
                result = orchestrate(
                    action="policy_analysis",
                    file_name=request.message,
                    stream=False
                )
                return result

        elif request.action == "thoughts_stream":
            # Return recent agent thoughts
            result = orchestrate(
                action="thoughts_stream",
                limit=20,  # Get last 20 thoughts
                agent_type=request.message  # Optional: filter by agent type
            )
            return result

        elif request.action == "run_simulation":
            # Simulation stream action - streams real-time simulation updates
            def generate_simulation():
                try:
                    print(f"🎬 Starting simulation stream: {request.simulation_type}, {request.granularity}")
                    result = orchestrate(
                        action="run_simulation",
                        simulation_type=request.simulation_type,
                        granularity=request.granularity,
                        time_horizon=request.time_horizon
                    )
                    
                    # Check if result is a generator
                    import types
                    if isinstance(result, types.GeneratorType):
                        print("✅ Result is a generator, streaming...")
                        for chunk in result:
                            print(f"📊 Yielding chunk: {chunk.get('type', 'unknown')}")
                            yield f"data: {json.dumps(chunk)}\n\n"
                    elif hasattr(result, '__iter__') and not isinstance(result, (str, dict, list)):
                        print("✅ Result is iterable, streaming...")
                        for chunk in result:
                            print(f"📊 Yielding chunk: {chunk.get('type', 'unknown')}")
                            yield f"data: {json.dumps(chunk)}\n\n"
                    else:
                        print(f"⚠️ Result is not a generator: {type(result)}, value: {result}")
                        # If it's not a generator, wrap it
                        yield f"data: {json.dumps(result)}\n\n"
                except Exception as e:
                    print(f"❌ Error in simulation stream: {e}")
                    import traceback
                    traceback.print_exc()
                    yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

            return StreamingResponse(
                generate_simulation(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                }
            )

        else:
            # Other actions return dict
            result = orchestrate(action=request.action)
            return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in orchestration: {str(e)}")


@app.get("/documents")
def list_documents():
    """List all documents in the documents folder."""
    try:
        files = list(DOCUMENTS_DIR.glob("*"))
        return {
            "status": "success",
            "count": len(files),
            "documents": [f.name for f in files if f.is_file()]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
