"""
City Data Collection Agent - Uses Tavily API to gather city statistics
Collects: Population, Housing Units, Traffic Flow, GDP Growth
"""

import os
from typing import Dict, Any, Generator
import google.generativeai as genai
from dotenv import load_dotenv
import requests
import json
from .thoughts_stream_agent import emit_thought, AgentType, ThoughtType

# Load environment variables
load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Tavily API configuration
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
TAVILY_API_URL = "https://api.tavily.com/search"


def search_tavily(query: str, search_depth: str = "advanced") -> Dict[str, Any]:
    """
    Search using Tavily API

    Args:
        query: Search query string
        search_depth: "basic" or "advanced" (default: advanced for more detailed results)

    Returns:
        Dictionary with search results
    """
    headers = {
        "Content-Type": "application/json"
    }

    payload = {
        "api_key": TAVILY_API_KEY,
        "query": query,
        "search_depth": search_depth,
        "include_answer": True,
        "include_raw_content": False,
        "max_results": 5
    }

    try:
        response = requests.post(TAVILY_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Tavily API error: {e}")
        return {"error": str(e), "results": []}


def extract_city_from_parsed_context(document_context: str) -> str:
    """
    Extract city name from ALREADY PARSED document context
    Parser agent already extracted this - we just need to find it

    Args:
        document_context: Already parsed document text from parser agent

    Returns:
        City name as string
    """
    # Simple extraction - parser already did the hard work
    # Just look for city name in the parsed context
    lines = document_context.split('\n')
    for line in lines:
        if 'city' in line.lower() or 'francisco' in line.lower() or 'diego' in line.lower():
            # Common city names
            cities = ['San Francisco', 'San Diego', 'Los Angeles', 'New York', 'Chicago',
                     'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'Dallas']
            for city in cities:
                if city.lower() in line.lower():
                    return city

    # Fallback: use Gemini but only if absolutely needed
    model = genai.GenerativeModel("models/gemini-2.0-flash-exp")
    prompt = f"Extract ONLY the city name from this text. Return just the city name: {document_context[:500]}"
    response = model.generate_content(prompt)
    return response.text.strip()


def collect_city_data(city: str) -> Dict[str, Any]:
    """
    Collect comprehensive city data using Tavily searches + Gemini for structured extraction

    Args:
        city: City name to search for

    Returns:
        Dictionary with all collected metrics
    """
    print(f"\n🔍 Collecting data for: {city}")

    data = {
        "city": city,
        "population": None,
        "housing_units": None,
        "traffic_flow": None,
        "gdp_growth": None,
        "raw_sources": []
    }

    # Search queries for each metric
    queries = {
        "population": f"{city} current population 2024 2025 statistics",
        "housing_units": f"{city} total housing units residential statistics 2024",
        "traffic_flow": f"{city} traffic flow patterns daily vehicle count congestion statistics",
        "gdp_growth": f"{city} GDP growth rate economic growth 2024 2025"
    }

    # Collect data for each metric
    for metric, query in queries.items():
        print(f"  → Searching: {metric}...")
        emit_thought(
            AgentType.CITY_DATA,
            ThoughtType.ACTION,
            f"Searching for {metric.replace('_', ' ')} in {city}...",
            {"city": city, "metric": metric}
        )
        result = search_tavily(query, search_depth="advanced")

        if "error" not in result and result.get("results"):
            # Store raw results
            data["raw_sources"].append({
                "metric": metric,
                "query": query,
                "answer": result.get("answer", ""),
                "results": result.get("results", [])[:3]  # Top 3 results
            })

            # Extract the answer if available
            if result.get("answer"):
                data[metric] = result["answer"]

    return data


def extract_simple_numbers(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract SIMPLE numbers from raw data - no strings, just numbers

    Returns:
        Dict with actual numbers, not text descriptions
    """
    import re

    result = {
        "population_number": None,
        "housing_number": None,
        "traffic_percentage": None,
        "gdp_percentage": None
    }

    # Also check the direct metric values (not just raw_sources)
    # This ensures we extract from both answer field and direct metric field

    # Extract from raw sources
    for source in raw_data.get('raw_sources', []):
        metric = source['metric']
        answer = source.get('answer', '')

        if metric == 'population':
            # Look for first number in millions or exact
            match = re.search(r'(\d+\.?\d*)\s*million', answer, re.I)
            if match:
                result["population_number"] = int(float(match.group(1)) * 1000000)
            else:
                match = re.search(r'(\d{1,3}(?:,\d{3})+)', answer)
                if match:
                    result["population_number"] = int(match.group(1).replace(',', ''))

        elif metric == 'housing_units':
            # Look for ALL numbers and find the largest (total housing units, not just new permits)
            # Pattern: look for numbers like "8,782" or "108,036" or "600,000"
            numbers = re.findall(r'(\d{1,3}(?:,\d{3})+)', answer)
            if numbers:
                # Convert to integers and get the largest (likely the total stock)
                num_values = [int(n.replace(',', '')) for n in numbers]
                result["housing_number"] = max(num_values)

        elif metric == 'traffic_flow':
            # Look for percentage first, then try "reduced" or "decreased" indicators
            match = re.search(r'(\d+(?:\.\d+)?)%', answer)
            if match:
                result["traffic_percentage"] = float(match.group(1))
            else:
                # Look for phrases like "reduced traffic" and assign a default congestion level
                if 'reduced' in answer.lower() or 'decreased' in answer.lower():
                    result["traffic_percentage"] = 15.0  # Moderate congestion
                elif 'congestion' in answer.lower():
                    result["traffic_percentage"] = 35.0  # Higher congestion

        elif metric == 'gdp_growth':
            # Look for percentage - prioritize growth rate percentages
            matches = re.findall(r'(\d+(?:\.\d+)?)%', answer)
            if matches:
                # Find the smallest reasonable GDP growth rate (typically 0.5% - 5%)
                percentages = [float(m) for m in matches]
                reasonable_growth = [p for p in percentages if 0.1 <= p <= 10.0]
                if reasonable_growth:
                    result["gdp_percentage"] = reasonable_growth[0]

    # Fallback: also check direct metric values if raw_sources didn't populate everything
    if not result["population_number"] and raw_data.get('population'):
        text = raw_data['population']
        match = re.search(r'(\d+\.?\d*)\s*million', text, re.I)
        if match:
            result["population_number"] = int(float(match.group(1)) * 1000000)
        else:
            match = re.search(r'(\d{1,3}(?:,\d{3})+)', text)
            if match:
                result["population_number"] = int(match.group(1).replace(',', ''))

    if not result["housing_number"] and raw_data.get('housing_units'):
        text = raw_data['housing_units']
        numbers = re.findall(r'(\d{1,3}(?:,\d{3})+)', text)
        if numbers:
            num_values = [int(n.replace(',', '')) for n in numbers]
            result["housing_number"] = max(num_values)

    if not result["traffic_percentage"] and raw_data.get('traffic_flow'):
        text = raw_data['traffic_flow']
        match = re.search(r'(\d+(?:\.\d+)?)%', text)
        if match:
            result["traffic_percentage"] = float(match.group(1))
        else:
            # Fallback heuristic for traffic without percentages
            if 'reduced' in text.lower() or 'decreased' in text.lower():
                result["traffic_percentage"] = 15.0
            elif 'congestion' in text.lower() or 'heavy' in text.lower():
                result["traffic_percentage"] = 35.0

    if not result["gdp_percentage"] and raw_data.get('gdp_growth'):
        text = raw_data['gdp_growth']
        matches = re.findall(r'(\d+(?:\.\d+)?)%', text)
        if matches:
            percentages = [float(m) for m in matches]
            reasonable_growth = [p for p in percentages if 0.1 <= p <= 10.0]
            if reasonable_growth:
                result["gdp_percentage"] = reasonable_growth[0]

    return result


def extract_numbers_with_llm(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Use Gemini with JSON mode to extract ONLY numbers - NO TEXT ALLOWED
    """
    model = genai.GenerativeModel(
        "models/gemini-2.0-flash-exp",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.1
        }
    )

    result = {
        "population_number": None,
        "housing_number": None,
        "traffic_percentage": None,
        "gdp_percentage": None
    }

    print("\n🤖 Using LLM with JSON mode to extract numbers...")

    # Build a single prompt for ALL metrics at once
    all_texts = {}
    for source in raw_data.get('raw_sources', []):
        metric = source['metric']
        answer = source.get('answer', '')
        if answer:
            all_texts[metric] = answer

    if not all_texts:
        return result

    try:
        # Single prompt for all metrics - forces JSON output
        prompt = f"""You are a data extraction bot. Extract ONLY numbers from the following city data texts.

Return VALID JSON with this EXACT structure:
{{
  "population_number": <integer or null>,
  "housing_number": <integer or null>,
  "traffic_percentage": <float or null>,
  "gdp_percentage": <float or null>
}}

RULES:
1. population_number: Extract the city population as an integer (e.g., 1409359 for "1.4 million" or "1,409,359")
2. housing_number: Extract the LARGEST housing number mentioned (total stock, not new units)
3. traffic_percentage: Extract or estimate congestion % (0-100). If text says "reduced traffic" use 15, "heavy congestion" use 45
4. gdp_percentage: Extract GDP growth rate (0.1-10.0). If text says "healthy growth" use 2.5, "strong" use 3.0

EXAMPLES:
Input: {{"population": "San Diego's population in 2025 is 1,409,359"}}
Output: {{"population_number": 1409359, "housing_number": null, "traffic_percentage": null, "gdp_percentage": null}}

Input: {{"housing_units": "Permitted 8,782 new homes, city aims to approve 108,036 units by 2029"}}
Output: {{"population_number": null, "housing_number": 108036, "traffic_percentage": null, "gdp_percentage": null}}

Input: {{"traffic_flow": "Traffic patterns show reduced traffic due to COVID-19"}}
Output: {{"population_number": null, "housing_number": null, "traffic_percentage": 15.0, "gdp_percentage": null}}

Input: {{"gdp_growth": "GDP growth expected to be healthy at 2.3% due to investment"}}
Output: {{"population_number": null, "housing_number": null, "traffic_percentage": null, "gdp_percentage": 2.3}}

NOW EXTRACT FROM THIS DATA:
{json.dumps(all_texts, indent=2)}

Return ONLY the JSON object:"""

        response = model.generate_content(prompt)
        extracted_data = json.loads(response.text)

        # Validate and populate result
        if extracted_data.get("population_number"):
            result["population_number"] = int(extracted_data["population_number"])
            print(f"  ✓ Population: {result['population_number']:,}")
            emit_thought(
                AgentType.CITY_DATA,
                ThoughtType.OBSERVATION,
                f"Population: {result['population_number']:,}",
                {"metric": "population", "value": result["population_number"]}
            )

        if extracted_data.get("housing_number"):
            result["housing_number"] = int(extracted_data["housing_number"])
            print(f"  ✓ Housing Units: {result['housing_number']:,}")
            emit_thought(
                AgentType.CITY_DATA,
                ThoughtType.OBSERVATION,
                f"Housing units: {result['housing_number']:,}",
                {"metric": "housing", "value": result["housing_number"]}
            )

        if extracted_data.get("traffic_percentage"):
            result["traffic_percentage"] = float(extracted_data["traffic_percentage"])
            print(f"  ✓ Traffic: {result['traffic_percentage']}%")
            emit_thought(
                AgentType.CITY_DATA,
                ThoughtType.OBSERVATION,
                f"Traffic congestion: {result['traffic_percentage']}%",
                {"metric": "traffic", "value": result["traffic_percentage"]}
            )

        if extracted_data.get("gdp_percentage"):
            result["gdp_percentage"] = float(extracted_data["gdp_percentage"])
            print(f"  ✓ GDP Growth: {result['gdp_percentage']}%")
            emit_thought(
                AgentType.CITY_DATA,
                ThoughtType.OBSERVATION,
                f"GDP growth: {result['gdp_percentage']}%",
                {"metric": "gdp", "value": result["gdp_percentage"]}
            )


    except Exception as e:
        print(f"  ✗ Failed to extract numbers: {e}")

    return result


def synthesize_city_data(raw_data: Dict[str, Any]) -> str:
    """
    Use Gemini to synthesize and structure the collected data

    Args:
        raw_data: Raw data collected from Tavily searches

    Returns:
        Formatted, synthesized report as string
    """
    model = genai.GenerativeModel("models/gemini-2.0-flash-exp")

    prompt = f"""
    You are a city data analyst. Synthesize the following search results into a clear, structured report.

    City: {raw_data['city']}

    Raw Data from Web Searches:
    {json.dumps(raw_data['raw_sources'], indent=2)}

    Create a report with these sections:

    1. **Population**: Current population, recent trends, growth rate
    2. **Housing Units**: Total housing units, vacancy rates, housing stock info
    3. **Traffic Flow**: Daily traffic patterns, congestion levels, vehicle counts
    4. **GDP Growth**: Recent economic growth rates, key sectors, trends

    For each metric:
    - Extract specific numbers with units
    - Note the time period (year/quarter)
    - Cite source URLs when possible
    - If data is unavailable, clearly state "Data not found"

    Format as clean markdown with bullet points.
    """

    response = model.generate_content(prompt)
    return response.text


def city_data_agent_stream(city: str = None, document_context: str = None) -> Generator[str, None, None]:
    """
    Streaming version of city data agent - yields progress updates

    Args:
        city: City name (optional - will be extracted from document if not provided)
        document_context: ALREADY PARSED document context from parser agent

    Yields:
        Status updates and final report chunks
    """
    try:
        # Step 1: Determine city (parser already did the extraction)
        if not city and document_context:
            yield f"📄 Using parsed document context...\n\n"
            city = extract_city_from_parsed_context(document_context)
            yield f"✅ City identified: **{city}**\n\n"
        elif not city:
            yield "❌ Error: No city provided and no document context available\n"
            return

        # Step 2: Collect data
        yield f"🔍 Collecting data for {city}...\n\n"
        raw_data = collect_city_data(city)

        yield f"✅ Data collection complete. Processing results...\n\n"

        # Step 3: Synthesize
        yield f"🤖 Synthesizing city data report...\n\n"
        report = synthesize_city_data(raw_data)

        # Step 4: Stream the final report
        yield "---\n\n"
        yield f"# City Data Report: {city}\n\n"
        yield report
        yield f"\n\n---\n\n"
        yield f"✅ Report complete!\n"

    except Exception as e:
        yield f"❌ Error in city data agent: {str(e)}\n"


def collect_city_data_sync(city: str = None, document_context: str = None) -> Dict[str, Any]:
    """
    Synchronous version of city data agent - returns complete result

    Args:
        city: City name (optional - will be extracted from document if not provided)
        document_context: ALREADY PARSED document context from parser agent

    Returns:
        Dictionary with status, city, and report
    """
    try:
        # Step 1: Determine city (parser already did the extraction)
        if not city and document_context:
            city = extract_city_from_parsed_context(document_context)
        elif not city:
            return {
                "status": "error",
                "message": "No city provided and no document context available",
                "city": None,
                "report": None
            }

        # Step 2: Collect data
        raw_data = collect_city_data(city)

        # Step 3: Extract simple numbers using LLM (more reliable than regex)
        simple_numbers = extract_numbers_with_llm(raw_data)

        # Step 4: Synthesize report
        report = synthesize_city_data(raw_data)

        return {
            "status": "success",
            "city": city,
            "report": report,
            "numbers": simple_numbers,  # Simple numbers for frontend - NO PARSING NEEDED
            "raw_data": raw_data
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "city": city if city else None,
            "report": None
        }


# For testing
if __name__ == "__main__":
    # Test with San Francisco
    print("Testing City Data Agent with San Francisco...")

    for chunk in city_data_agent_stream(city="San Francisco"):
        print(chunk, end="", flush=True)
