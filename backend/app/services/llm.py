import google.generativeai as genai
from app.core.config import settings
from app.core.logger import get_logger

logger = get_logger("app.llm")

def _get_mock_response(query: str, context: dict) -> str:
    """Fallback if no API key is provided."""
    query_lower = query.lower()
    
    if "hi" in query_lower or "hello" in query_lower:
        return f"Hello {context.get('name', 'there')}! I am the GigShield AI Assistant. How can I help you today?"
        
    if "claim" in query_lower:
        return "I see you're asking about claims. Your active policies automatically generate payouts when extreme weather or disruptions hit your working zones. Would you like to view your recent claims history?"
        
    if "policy" in query_lower or "coverage" in query_lower:
        return f"You currently have coverage for {context.get('covered_zones', 'your registered zones')}. Limit remaining: ₹{context.get('remaining_limit', 'unknown')}."
        
    if "flood" in query_lower or "rain" in query_lower or "heat" in query_lower:
        return "Disruptions like heavy rain, extreme heat, or civic emergencies are automatically verified by our AI triggers. If a trigger activates in your zone while you are working, a claim is instantly created for you."
    
    if "research" in query_lower or "deep" in query_lower or "analyze" in query_lower:
        return "🔍 Deep Research Mode: I can analyze your claims history, coverage patterns, and risk zones. Ask me about specific incidents, weather patterns affecting your earnings, or optimization tips!"
        
    return "I am an AI assistant integrated with GigShield. I can help answer questions about your policies, claims, or how the parametric insurance system protects your gig income."


def get_chat_response(query: str, context: dict, enable_research: bool = False) -> str:
    """Get AI chat response either from Gemini or Mock.
    
    Args:
        query: User's question
        context: Worker context (name, zones, limits)
        enable_research: If True, perform deep research analysis
        
    Returns:
        AI-generated response string
    """
    
    if not settings.GEMINI_API_KEY:
        logger.info("GEMINI_API_KEY not configured, using mock responses")
        return _get_mock_response(query, context)
    
    try:
        logger.debug(f"Configuring Gemini API with key starting with: {settings.GEMINI_API_KEY[:10]}...")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        
        # Use the verified working model (gemini-2.5-flash)
        model = genai.GenerativeModel('gemini-2.5-flash')
        logger.debug("Using model: gemini-2.5-flash")
        
        research_context = ""
        if enable_research:
            research_context = """

DEEP RESEARCH MODE - Provide comprehensive analysis:
- Analyze patterns in the user's data
- Suggest optimization strategies  
- Highlight risks and opportunities
- Use data-driven insights"""
        
        system_prompt = f"""
You are the GigShield AI Assistant, a helpful and concise guide for gig workers in India (delivery riders, drivers, etc.).
Your job is to answer questions about GigShield's parametric income insurance.

WORKER CONTEXT:
- Name: {context.get('name', 'Unknown User')}
- Covered Zones: {context.get('covered_zones', 'Unknown')}
- Remaining Payout Limit: ₹{context.get('remaining_limit', 0)}
- Active Claims: {context.get('active_claims', 0)}

GUIDELINES:
- Keep answers short (1-3 sentences max) and conversational
- Do not use complex formatting
- Do not hallucinate capabilities
- GigShield automatically pays out when weather (Rain, Heat, AQI) or civic events (Curfew, Floods) disrupt work in covered zones
- Be supportive and professional{research_context}
"""
        
        # Combine system prompt with user query
        full_prompt = system_prompt + "\n\nUser Question: " + query
        
        logger.debug(f"Sending request to Gemini API for query: {query[:100]}...")
        response = model.generate_content(full_prompt, generation_config=genai.types.GenerationConfig(temperature=0.7))
        
        if response.text:
            logger.info(f"Successfully received Gemini response")
            return response.text.strip()
        else:
            logger.warning("Gemini returned empty response")
            return "I apologize, but I wasn't able to process that properly. Please try again."
            
    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}", extra={"error_type": type(e).__name__})
        
        # Check for specific error types
        error_str = str(e).lower()
        if "api_key" in error_str or "unauthorized" in error_str or "403" in error_str:
            return "🔑 AI Assistant Offline: Please check that your GEMINI_API_KEY is set correctly in the backend environment."
        elif "timeout" in error_str or "connection" in error_str:
            return "🌐 Connection Error: I'm having trouble reaching the AI service. Please check your internet connection and try again."
        else:
            return f"⚠️ I'm having trouble right now. Please try again in a moment. (Error: {str(e)[:50]})"
