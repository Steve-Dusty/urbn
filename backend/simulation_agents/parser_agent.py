"""
Parser Agent - Extracts structured information from policy documents.

Uses document_manager to access uploaded files (no duplicate uploads).
Stores parsed context back in document_manager for other agents to use.
"""

import os
import google.generativeai as genai
from pathlib import Path
from dotenv import load_dotenv
from .document_manager import upload_documents_to_gemini, set_parsed_context, get_documents_dir

load_dotenv()

# Configure Google GenAI
API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)


def parse_documents():
    """
    Parse all documents using Gemini and store structured results.

    Returns:
        Structured summary of all documents
    """
    # Get uploaded files from document manager (no duplicate uploads!)
    uploaded_files = upload_documents_to_gemini()

    if not uploaded_files:
        return "No documents found in the documents folder"

    print(f"\n{'='*60}")
    print(f"📋 PARSER AGENT: Analyzing {len(uploaded_files)} document(s)")
    print(f"{'='*60}\n")

    results = []
    model = genai.GenerativeModel("models/gemini-2.0-flash")

    for uploaded_file in uploaded_files:
        file_name = Path(uploaded_file.name).name
        print(f"📄 Processing: {file_name}")

        try:
            # Use Gemini to extract structured information
            prompt = """
            Analyze this policy document and provide structured information for urban planning simulation:

            Extract:
            1. **Document Summary** (2-3 sentences)
            2. **Key Policy Changes**:
               - Zoning changes
               - Building regulations
               - Infrastructure projects
               - Demographic impacts
            3. **Geographic Data**:
               - Locations mentioned (addresses, neighborhoods, streets)
               - Coordinates if available
               - Affected areas
            4. **Quantitative Metrics**:
               - Numbers (housing units, budgets, population, etc.)
               - Timelines
               - Impact projections
            5. **Simulation Relevance**:
               - How this affects map visualization
               - What should be highlighted on the map

            Format as structured text with clear sections.
            """

            response = model.generate_content([uploaded_file, prompt])
            parsed_content = response.text

            # Store in document manager for other agents
            set_parsed_context(file_name, parsed_content)

            result = f"""
{'='*60}
Document: {file_name}
{'='*60}

{parsed_content}

"""
            results.append(result)
            print(f"✅ Parsed: {file_name}\n")

        except Exception as e:
            error_msg = f"❌ Error parsing {file_name}: {str(e)}"
            results.append(error_msg)
            print(f"{error_msg}\n")

    full_result = "\n".join(results)

    print(f"{'='*60}")
    print("✅ PARSER AGENT: Completed")
    print(f"{'='*60}\n")

    return full_result


if __name__ == "__main__":
    # Test the parser agent
    result = parse_documents()
    print(result)
