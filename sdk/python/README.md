# Hermes Agent Debugger SDK (Python)

Python SDK for connecting AI Agents to [Hermes Agent Debugger](https://github.com/hermes/agent-debugger).

## Installation

```bash
pip install hermes-debugger
```

With optional integrations:
```bash
pip install hermes-debugger[openai,anthropic]
```

## Quick Start

### 1. Decorator Mode

```python
from hermes_debugger import Debugger

@Debugger.trace()
def my_agent_task():
    # Your agent logic here
    # All execution is automatically logged
    pass
```

### 2. Context Manager Mode

```python
from hermes_debugger import Debugger

with Debugger.session("my-agent") as session:
    # Log thoughts
    session.log_thought("Analyzing user request...", thought_type="reasoning")
    
    # Log tool calls
    tool_id = session.log_tool_call("read_file", {"path": "app.py"})
    # ... execute tool ...
    session.log_tool_result(tool_id, result="file content", duration=150)
    
    # Log token usage
    session.log_token_usage(
        input_tokens=100,
        output_tokens=200,
        model="gpt-4"
    )
    
    # Log errors
    session.log_error("Something went wrong", error_type="runtime")
```

### 3. Auto Integration

```python
from hermes_debugger import Debugger

# Install auto-tracing for OpenAI and Anthropic
debugger = Debugger.install()

# Now all LLM calls are automatically logged
import openai

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### 4. Direct Usage

```python
from hermes_debugger import create_debugger

debugger = create_debugger(
    agent_name="My Agent",
    server_url="ws://localhost:8765"
)

# Log thoughts directly
debugger.log_thought("Processing request...", duration=50)

# Log tool calls
tool_id = debugger.log_tool_call("search", {"query": "python"})
```

## API Reference

### Debugger

Main class for connecting to Hermes Agent Debugger.

**Constructor:**
- `server_url`: WebSocket server URL (default: `ws://localhost:8765`)
- `agent_name`: Name of your agent (default: `Python Agent`)
- `auto_connect`: Automatically connect on init (default: `True`)

**Methods:**
- `trace()`: Decorator for automatic function tracing
- `session()`: Create a debugging session context
- `install()`: Install auto-tracing for LLM libraries
- `log_thought()`: Log a thought
- `log_tool_call()`: Log a tool call
- `log_error()`: Log an error
- `disconnect()`: Disconnect from debugger

### DebuggerSession

Context manager for debugging sessions.

**Methods:**
- `log_thought(content, type, duration, tokens)`: Log agent thought
- `log_tool_call(name, params)`: Start logging a tool call
- `log_tool_result(tool_id, result, error, duration)`: Complete tool call logging
- `log_token_usage(input_tokens, output_tokens, model)`: Log token usage
- `log_error(message, error_type, stack_trace, context)`: Log an error

### Thought Types

- `reasoning`: Step-by-step reasoning
- `planning`: Planning and strategy
- `reflection`: Self-reflection and evaluation

### Error Types

- `runtime`: Runtime errors
- `api`: API errors
- `tool`: Tool execution errors
- `network`: Network errors
- `validation`: Validation errors

## Examples

### OpenAI Integration

```python
from hermes_debugger import Debugger
import openai

debugger = Debugger.install(agent_name="OpenAI Agent")

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Write a function"}]
)

# Automatically logs:
# - Session start/end
# - Thought: "调用 OpenAI: gpt-4"
# - Token usage
# - Tool call result
```

### Custom Agent

```python
from hermes_debugger import Debugger
import time

@Debugger.trace(agent_name="Custom Agent")
def process_request(user_input: str):
    with Debugger.session() as session:
        # Step 1: Analyze
        start = time.time()
        session.log_thought(f"Analyzing: {user_input}", "reasoning")
        
        # Step 2: Plan
        session.log_thought("Creating execution plan...", "planning")
        
        # Step 3: Execute tools
        tool_id = session.log_tool_call("web_search", {"query": user_input})
        time.sleep(0.5)  # Simulate search
        session.log_tool_result(tool_id, result=["result1", "result2"], duration=500)
        
        # Step 4: Reflect
        session.log_thought("Reviewing results...", "reflection")
        
        return "Done"
```

### LangChain Integration

```python
from hermes_debugger import Debugger
from langchain.chat_models import ChatOpenAI
from langchain.schema import HumanMessage

debugger = Debugger.install()

# Create a traced callback
class DebuggerCallback:
    def on_llm_start(self, serialized, prompts, **kwargs):
        debugger.log_thought(f"LLM starting: {prompts}")
    
    def on_llm_end(self, response, **kwargs):
        debugger.log_thought("LLM completed")

llm = ChatOpenAI(callbacks=[DebuggerCallback()])
```

## Configuration

Environment variables:
- `HERMES_DEBUGGER_URL`: Debugger server URL (default: `ws://localhost:8765`)
- `HERMES_AGENT_NAME`: Agent name (default: `Python Agent`)
- `HERMES_DISABLED`: Set to `true` to disable all logging

## License

MIT
