"""
Policy Document Analysis Agent
Extracts policy intent, simulation parameters, and provides structured analysis
for dashboard display (left modal - Policy Analysis box)
"""

import os
import json
from typing import Dict, Any, Generator
import google.generativeai as genai
from dotenv import load_dotenv
from .document_manager import upload_documents_to_gemini, get_parsed_context

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def analyze_policy_document_stream(file_name: str = None) -> Generator[str, None, None]:
    """
    Streaming analysis of policy document with live updates

    Args:
        file_name: Specific file to analyze (optional, analyzes all if None)

    Yields:
        Analysis chunks and progress updates
    """
    try:
        yield "🤖 **POLICY ANALYSIS AGENT ACTIVATED**\n\n"

        # Get uploaded files
        uploaded_files = upload_documents_to_gemini()

        if not uploaded_files:
            yield "❌ Error: No policy documents found\n"
            return

        # Get the first file or specific file
        target_file = uploaded_files[0]
        if file_name:
            target_file = next((f for f in uploaded_files if file_name in f.name), uploaded_files[0])

        yield f"📄 Analyzing: **{target_file.name}**\n\n"
        yield "🔍 Extracting policy intent...\n\n"

        # Use Gemini with streaming
        model = genai.GenerativeModel("models/gemini-2.0-flash-exp")

        prompt = """
        You are a policy analysis expert for urban planning simulations.

        Analyze this policy document and provide a comprehensive analysis with:

        ## 1. POLICY INTENT (2-3 sentences)
        What is the main goal of this policy? What problem does it solve?

        ## 2. KEY CHANGES
        - **Zoning Changes**: New zoning rules, density requirements
        - **Building Regulations**: Height limits, setbacks, parking requirements
        - **Infrastructure**: Roads, transit, utilities
        - **Housing**: Affordable housing requirements, total units

        ## 3. SIMULATION PARAMETERS
        Extract these specific values for simulation:
        - **Target City/Area**: Which city or neighborhood
        - **Timeline**: Implementation period
        - **Housing Units**: Total new units planned
        - **Budget**: Total cost or investment
        - **Population Impact**: Expected population change

        ## 4. GEOGRAPHIC SCOPE
        - **Affected Areas**: Streets, neighborhoods, districts
        - **Map Visualization**: What should be highlighted on the map?

        ## 5. IMPACT PREDICTIONS
        - **Traffic**: Expected traffic changes
        - **Housing Affordability**: Will it increase or decrease housing supply?
        - **Economic Impact**: GDP, jobs, investment

        Format as clean markdown with clear sections and bullet points.
        Be specific with numbers and locations.
        """

        # Stream the response
        response = model.generate_content([target_file, prompt], stream=True)

        for chunk in response:
            if chunk.text:
                yield chunk.text

        yield "\n\n✅ **Analysis Complete!**\n"

    except Exception as e:
        yield f"\n❌ Error in policy analysis: {str(e)}\n"


def analyze_policy_document_sync(file_name: str = None) -> Dict[str, Any]:
    """
    Synchronous policy analysis with structured JSON output

    Args:
        file_name: Specific file to analyze

    Returns:
        Dictionary with structured analysis data
    """
    try:
        # Get uploaded files
        uploaded_files = upload_documents_to_gemini()

        if not uploaded_files:
            return {
                "status": "error",
                "message": "No policy documents found",
                "analysis": None
            }

        target_file = uploaded_files[0]
        if file_name:
            target_file = next((f for f in uploaded_files if file_name in f.name), uploaded_files[0])

        print(f"📄 Analyzing policy document: {target_file.name}")

        # Use JSON mode for structured extraction
        model = genai.GenerativeModel(
            "models/gemini-2.0-flash-exp",
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        )

        prompt = f"""
        Extract structured policy analysis from this document.

        Return VALID JSON with this EXACT structure:
        {{
          "policy_intent": "Brief description of policy goal",
          "target_city": "City name",
          "affected_areas": ["List", "of", "areas"],
          "timeline": "Implementation timeline",
          "key_metrics": {{
            "housing_units": <number or null>,
            "budget": <number or null>,
            "population_impact": <number or null>
          }},
          "zoning_changes": ["List of zoning changes"],
          "building_regulations": ["List of building regulation changes"],
          "infrastructure_projects": ["List of infrastructure projects"],
          "impact_predictions": {{
            "traffic": "Expected traffic impact",
            "housing_affordability": "Expected housing impact",
            "economic": "Expected economic impact"
          }},
          "map_highlights": ["What to show on map"]
        }}

        RULES:
        - Be specific with numbers and locations
        - Extract actual values from the document
        - Use null if data not available
        - Keep descriptions concise but informative

        NOW EXTRACT:
        """

        response = model.generate_content([target_file, prompt])
        analysis_data = json.loads(response.text)

        # Also get a markdown summary for display
        summary_model = genai.GenerativeModel("models/gemini-2.0-flash-exp")
        summary_prompt = """
        Provide a 3-5 sentence executive summary of this policy document.
        Focus on: What changes? Where? When? Expected impact?
        """

        summary_response = summary_model.generate_content([target_file, summary_prompt])

        return {
            "status": "success",
            "file_name": target_file.name,
            "analysis": analysis_data,
            "summary": summary_response.text.strip(),
            "structured_data": analysis_data  # For frontend to use directly
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "analysis": None
        }


# For testing
if __name__ == "__main__":
    print("Testing Policy Analysis Agent...\n")

    # Test sync version
    result = analyze_policy_document_sync()

    if result["status"] == "success":
        print(f"✅ Analysis successful!")
        print(f"\nFile: {result['file_name']}")
        print(f"\nSummary:\n{result['summary']}")
        print(f"\nStructured Data:\n{json.dumps(result['structured_data'], indent=2)}")
    else:
        print(f"❌ Error: {result['message']}")
