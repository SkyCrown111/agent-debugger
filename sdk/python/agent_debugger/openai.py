"""
OpenAI Integration for Agent Debugger

自动追踪 OpenAI API 调用的思考、工具调用和 Token 使用

Usage:
    from agent_debugger import AgentDebugger
    from agent_debugger.openai import track_openai
    
    debugger = AgentDebugger(agent_id="my-openai-agent")
    client = track_openai(debugger)
    
    # 正常使用 OpenAI API，自动追踪
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": "Hello!"}]
    )
"""

import time
import traceback
from typing import Any, Dict, List, Optional, Callable
from functools import wraps

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class OpenAITracker:
    """
    OpenAI API 调用追踪器
    
    自动追踪 OpenAI API 调用，记录思考、工具调用和 Token 使用
    
    Example:
        >>> from agent_debugger import AgentDebugger
        >>> from agent_debugger.openai import OpenAITracker
        >>> 
        >>> debugger = AgentDebugger(agent_id="my-agent")
        >>> tracker = OpenAITracker(debugger)
        >>> client = tracker.wrap_client(openai.OpenAI())
    """
    
    def __init__(self, debugger, verbose: bool = False):
        """
        初始化 OpenAI 追踪器
        
        Args:
            debugger: AgentDebugger 实例
            verbose: 是否打印详细日志
        """
        if not OPENAI_AVAILABLE:
            raise ImportError("openai is required. Install with: pip install openai")
        
        self.debugger = debugger
        self.verbose = verbose
    
    def wrap_client(self, client):
        """
        包装 OpenAI 客户端，自动追踪所有 API 调用
        
        Args:
            client: OpenAI 客户端实例
        
        Returns:
            包装后的客户端
        
        Example:
            >>> client = openai.OpenAI()
            >>> wrapped_client = tracker.wrap_client(client)
        """
        return WrappedOpenAIClient(client, self.debugger, self.verbose)
    
    def track_chat_completion(
        self,
        func: Callable,
        model: str,
        messages: List[Dict],
        **kwargs
    ):
        """
        追踪 Chat Completion 调用
        
        Args:
            func: 原始 API 调用函数
            model: 模型名称
            messages: 消息列表
            **kwargs: 其他参数
        
        Returns:
            API 响应
        """
        start_time = time.time()
        
        # 记录思考
        prompt_preview = str(messages[-1].get("content", ""))[:300] if messages else ""
        self.debugger.think(
            content=f"OpenAI Chat Completion ({model})\nPrompt: {prompt_preview}",
            type="reasoning"
        )
        
        try:
            response = func()
            
            # 计算 Token 使用
            if hasattr(response, "usage") and response.usage:
                self.debugger.tokens(
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                    model=model
                )
            
            # 记录响应
            if hasattr(response, "choices") and response.choices:
                content = response.choices[0].message.content or ""
                self.debugger.think(
                    content=f"OpenAI Response: {content[:500]}",
                    type="reflection"
                )
            
            if self.verbose:
                duration = int((time.time() - start_time) * 1000)
                print(f"[OpenAI] Chat Completion: {model} ({duration}ms)")
            
            return response
            
        except Exception as e:
            self.debugger.error(
                message=f"OpenAI API Error: {str(e)}",
                stack=traceback.format_exc(),
                context={"model": model, "messages_count": len(messages)}
            )
            raise
    
    def track_function_call(
        self,
        func: Callable,
        model: str,
        messages: List[Dict],
        tools: List[Dict],
        **kwargs
    ):
        """
        追踪 Function Calling 调用
        
        Args:
            func: 原始 API 调用函数
            model: 模型名称
            messages: 消息列表
            tools: 工具定义列表
            **kwargs: 其他参数
        
        Returns:
            API 响应
        """
        start_time = time.time()
        
        # 记录工具定义
        tool_names = [t.get("function", {}).get("name", "unknown") for t in tools]
        self.debugger.think(
            content=f"OpenAI Function Call ({model})\nTools: {', '.join(tool_names)}",
            type="planning"
        )
        
        try:
            response = func()
            
            # 记录 Token 使用
            if hasattr(response, "usage") and response.usage:
                self.debugger.tokens(
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                    model=model
                )
            
            # 记录工具调用
            if hasattr(response, "choices") and response.choices:
                message = response.choices[0].message
                if hasattr(message, "tool_calls") and message.tool_calls:
                    for tool_call in message.tool_calls:
                        self.debugger.tool(
                            tool_name=tool_call.function.name,
                            params={"arguments": tool_call.function.arguments},
                            status="pending"
                        )
            
            return response
            
        except Exception as e:
            self.debugger.error(
                message=f"OpenAI Function Call Error: {str(e)}",
                stack=traceback.format_exc(),
                context={"model": model, "tools": tool_names}
            )
            raise


class WrappedOpenAIClient:
    """包装后的 OpenAI 客户端"""
    
    def __init__(self, client, debugger, verbose: bool = False):
        self._client = client
        self._tracker = OpenAITracker(debugger, verbose)
        self.chat = WrappedChatCompletions(client.chat, self._tracker)
        self.completions = WrappedCompletions(client.completions, self._tracker)
        self.embeddings = WrappedEmbeddings(client.embeddings, self._tracker)
        
        # 透传其他属性
        self.models = client.models
        self.files = client.files
        self.fine_tuning = client.fine_tuning
        self.images = client.images
        self.audio = client.audio
        self.moderations = client.moderations
        self.assistants = client.assistants
        self.threads = client.threads
        self.beta = client.beta


class WrappedChatCompletions:
    """包装 Chat Completions API"""
    
    def __init__(self, chat, tracker: OpenAITracker):
        self._chat = chat
        self._tracker = tracker
        self.completions = self
    
    def create(self, **kwargs):
        """创建 Chat Completion，自动追踪"""
        model = kwargs.get("model", "unknown")
        messages = kwargs.get("messages", [])
        tools = kwargs.get("tools", None)
        
        def call_api():
            return self._chat.completions.create(**kwargs)
        
        if tools:
            return self._tracker.track_function_call(
                call_api, model, messages, tools
            )
        else:
            return self._tracker.track_chat_completion(
                call_api, model, messages
            )
    
    # 透传其他方法
    def __getattr__(self, name):
        return getattr(self._chat.completions, name)


class WrappedCompletions:
    """包装 Legacy Completions API"""
    
    def __init__(self, completions, tracker: OpenAITracker):
        self._completions = completions
        self._tracker = tracker
    
    def create(self, **kwargs):
        """创建 Completion，自动追踪"""
        model = kwargs.get("model", "unknown")
        prompt = kwargs.get("prompt", "")
        
        self._tracker.debugger.think(
            content=f"OpenAI Completion ({model})\nPrompt: {str(prompt)[:300]}",
            type="reasoning"
        )
        
        start_time = time.time()
        
        try:
            response = self._completions.create(**kwargs)
            
            if hasattr(response, "usage") and response.usage:
                self._tracker.debugger.tokens(
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=response.usage.completion_tokens,
                    model=model
                )
            
            return response
            
        except Exception as e:
            self._tracker.debugger.error(
                message=f"OpenAI Completion Error: {str(e)}",
                stack=traceback.format_exc()
            )
            raise


class WrappedEmbeddings:
    """包装 Embeddings API"""
    
    def __init__(self, embeddings, tracker: OpenAITracker):
        self._embeddings = embeddings
        self._tracker = tracker
    
    def create(self, **kwargs):
        """创建 Embedding，自动追踪"""
        model = kwargs.get("model", "unknown")
        input_text = kwargs.get("input", "")
        
        self._tracker.debugger.think(
            content=f"OpenAI Embedding ({model})\nInput: {str(input_text)[:200]}",
            type="reasoning"
        )
        
        start_time = time.time()
        
        try:
            response = self._embeddings.create(**kwargs)
            
            if hasattr(response, "usage") and response.usage:
                self._tracker.debugger.tokens(
                    input_tokens=response.usage.prompt_tokens,
                    output_tokens=0,
                    model=model
                )
            
            return response
            
        except Exception as e:
            self._tracker.debugger.error(
                message=f"OpenAI Embedding Error: {str(e)}",
                stack=traceback.format_exc()
            )
            raise


def track_openai(debugger, client=None, verbose: bool = False):
    """
    追踪 OpenAI API 调用
    
    Args:
        debugger: AgentDebugger 实例
        client: OpenAI 客户端实例（可选，默认创建新客户端）
        verbose: 是否打印详细日志
    
    Returns:
        包装后的 OpenAI 客户端
    
    Example:
        >>> from agent_debugger import AgentDebugger
        >>> from agent_debugger.openai import track_openai
        >>> 
        >>> debugger = AgentDebugger(agent_id="my-agent")
        >>> client = track_openai(debugger)
        >>> 
        >>> response = client.chat.completions.create(
        ...     model="gpt-4",
        ...     messages=[{"role": "user", "content": "Hello!"}]
        ... )
    """
    if not OPENAI_AVAILABLE:
        raise ImportError("openai is required. Install with: pip install openai")
    
    if client is None:
        client = openai.OpenAI()
    
    tracker = OpenAITracker(debugger, verbose)
    return tracker.wrap_client(client)


def openai_tool_decorator(debugger, tool_name: str):
    """
    OpenAI Function Calling 工具装饰器
    
    Args:
        debugger: AgentDebugger 实例
        tool_name: 工具名称
    
    Returns:
        装饰器函数
    
    Example:
        >>> from agent_debugger.openai import openai_tool_decorator
        >>> 
        >>> @openai_tool_decorator(debugger, "search")
        >>> def search(query: str) -> str:
        ...     return perform_search(query)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            with debugger.tool_context(tool_name, {"args": args, "kwargs": kwargs}) as ctx:
                result = func(*args, **kwargs)
                ctx.success(result)
                return result
        return wrapper
    return decorator


__all__ = [
    "OpenAITracker",
    "track_openai",
    "openai_tool_decorator",
]