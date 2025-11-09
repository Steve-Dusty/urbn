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
