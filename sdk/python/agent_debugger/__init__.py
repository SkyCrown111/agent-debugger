# Agent Debugger Python SDK

"""
Agent Debugger Python SDK - 用于将 Python Agent 连接到 Agent Debugger

使用方法:
    from agent_debugger import AgentDebugger
    
    debugger = AgentDebugger(agent_id="my-agent")
    
    # 记录思考
    debugger.think("正在分析用户需求...", type="reasoning")
    
    # 记录工具调用
    result = debugger.tool("search", {"query": "AI news"})
    
    # 记录 Token 使用
    debugger.tokens(input_tokens=100, output_tokens=50, model="gpt-4")
"""

import json
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Literal
from dataclasses import dataclass, asdict
import websocket
import threading
from contextlib import contextmanager


@dataclass
class Thought:
    """思考记录"""
    id: str
    agentId: str
    timestamp: str
    content: str
    type: Literal["reasoning", "planning", "reflection"]
    duration: Optional[int] = None
    tokens: Optional[int] = None


@dataclass
class ToolCall:
    """工具调用记录"""
    id: str
    agentId: str
    timestamp: str
    toolName: str
    params: Dict[str, Any]
    result: Optional[Any] = None
    status: Literal["pending", "success", "error"] = "pending"
    duration: Optional[int] = None
    error: Optional[str] = None


@dataclass
class TokenUsage:
    """Token 使用记录"""
    id: str
    agentId: str
    timestamp: str
    inputTokens: int
    outputTokens: int
    model: str


@dataclass
class ErrorLog:
    """错误日志"""
    id: str
    agentId: str
    timestamp: str
    message: str
    stack: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AgentDebugger:
    """
    Agent Debugger 客户端
    
    用于将 Python Agent 连接到 Agent Debugger 桌面应用
    
    Example:
        >>> debugger = AgentDebugger(agent_id="my-agent")
        >>> debugger.connect()
        >>> 
        >>> # 记录思考
        >>> debugger.think("分析用户需求", type="reasoning")
        >>> 
        >>> # 记录工具调用
        >>> with debugger.tool_context("search", {"query": "AI"}) as ctx:
        >>>     result = perform_search("AI")
        >>>     ctx.success(result)
        >>> 
        >>> debugger.disconnect()
    """
    
    def __init__(
        self,
        agent_id: str = "default-agent",
        server_url: str = "ws://localhost:8765",
        auto_connect: bool = True
    ):
        """
        初始化 Agent Debugger 客户端
        
        Args:
            agent_id: Agent 唯一标识符
            server_url: Agent Debugger 服务器地址
            auto_connect: 是否自动连接
        """
        self.agent_id = agent_id
        self.server_url = server_url
        self.ws: Optional[websocket.WebSocket] = None
        self.connected = False
        self._pending_tool_calls: Dict[str, ToolCall] = {}
        
        if auto_connect:
            self.connect()
    
    def connect(self) -> bool:
        """
        连接到 Agent Debugger 服务器
        
        Returns:
            是否连接成功
        """
        try:
            self.ws = websocket.create_connection(self.server_url)
            self.connected = True
            return True
        except Exception as e:
            print(f"[AgentDebugger] 连接失败: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """断开连接"""
        if self.ws:
            self.ws.close()
            self.ws = None
        self.connected = False
    
    def _send(self, event_type: str, data: Dict[str, Any]):
        """发送事件到服务器"""
        if not self.connected or not self.ws:
            return
        
        message = {
            "type": event_type,
            "data": data
        }
        
        try:
            self.ws.send(json.dumps(message))
        except Exception as e:
            print(f"[AgentDebugger] 发送失败: {e}")
    
    def _generate_id(self) -> str:
        """生成唯一 ID"""
        return str(uuid.uuid4())
    
    def _get_timestamp(self) -> str:
        """获取 ISO 格式时间戳"""
        return datetime.now().isoformat()
    
    # ==================== 思考记录 ====================
    
    def think(
        self,
        content: str,
        type: Literal["reasoning", "planning", "reflection"] = "reasoning",
        duration: Optional[int] = None,
        tokens: Optional[int] = None
    ) -> Thought:
        """
        记录一次思考
        
        Args:
            content: 思考内容
            type: 思考类型 (reasoning/planning/reflection)
            duration: 耗时（毫秒）
            tokens: Token 数量
        
        Returns:
            Thought 对象
        
        Example:
            >>> debugger.think("用户想要搜索 AI 新闻", type="reasoning")
        """
        thought = Thought(
            id=self._generate_id(),
            agentId=self.agent_id,
            timestamp=self._get_timestamp(),
            content=content,
            type=type,
            duration=duration,
            tokens=tokens
        )
        
        self._send("thought", asdict(thought))
        return thought
    
    @contextmanager
    def think_context(
        self,
        content: str,
        type: Literal["reasoning", "planning", "reflection"] = "reasoning"
    ):
        """
        思考上下文管理器，自动计算耗时
        
        Args:
            content: 思考内容
            type: 思考类型
        
        Yields:
            Thought 对象
        
        Example:
            >>> with debugger.think_context("分析需求") as thought:
            >>>     # 执行思考逻辑
            >>>     time.sleep(0.1)
            >>> # 自动记录耗时
        """
        start_time = time.time()
        thought = Thought(
            id=self._generate_id(),
            agentId=self.agent_id,
            timestamp=self._get_timestamp(),
            content=content,
            type=type
        )
        
        try:
            yield thought
        finally:
            duration = int((time.time() - start_time) * 1000)
            thought.duration = duration
            self._send("thought", asdict(thought))
    
    # ==================== 工具调用 ====================
    
    def tool_start(
        self,
        tool_name: str,
        params: Dict[str, Any]
    ) -> str:
        """
        开始工具调用（返回调用 ID）
        
        Args:
            tool_name: 工具名称
            params: 调用参数
        
        Returns:
            调用 ID
        
        Example:
            >>> call_id = debugger.tool_start("search", {"query": "AI"})
            >>> result = perform_search("AI")
            >>> debugger.tool_end(call_id, result=result)
        """
        tool_call = ToolCall(
            id=self._generate_id(),
            agentId=self.agent_id,
            timestamp=self._get_timestamp(),
            toolName=tool_name,
            params=params,
            status="pending"
        )
        
        self._pending_tool_calls[tool_call.id] = tool_call
        self._send("tool_call", asdict(tool_call))
        return tool_call.id
    
    def tool_end(
        self,
        call_id: str,
        result: Optional[Any] = None,
        error: Optional[str] = None
    ):
        """
        结束工具调用
        
        Args:
            call_id: 调用 ID
            result: 返回结果
            error: 错误信息
        """
        if call_id not in self._pending_tool_calls:
            return
        
        tool_call = self._pending_tool_calls.pop(call_id)
        tool_call.status = "error" if error else "success"
        tool_call.result = result
        tool_call.error = error
        tool_call.duration = int(
            (datetime.now() - datetime.fromisoformat(tool_call.timestamp)).total_seconds() * 1000
        )
        
        self._send("tool_call_update", asdict(tool_call))
    
    def tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        result: Optional[Any] = None,
        error: Optional[str] = None,
        duration: Optional[int] = None
    ) -> ToolCall:
        """
        记录一次完整的工具调用
        
        Args:
            tool_name: 工具名称
            params: 调用参数
            result: 返回结果
            error: 错误信息
            duration: 耗时（毫秒）
        
        Returns:
            ToolCall 对象
        
        Example:
            >>> debugger.tool("search", {"query": "AI"}, result=["news1", "news2"])
        """
        tool_call = ToolCall(
            id=self._generate_id(),
            agentId=self.agent_id,
            timestamp=self._get_timestamp(),
            toolName=tool_name,
            params=params,
            result=result,
            status="error" if error else "success",
            duration=duration,
            error=error
        )
        
        self._send("tool_call", asdict(tool_call))
        return tool_call
    
    @contextmanager
    def tool_context(
        self,
        tool_name: str,
        params: Dict[str, Any]
    ):
        """
        工具调用上下文管理器，自动计算耗时
        
        Args:
            tool_name: 工具名称
            params: 调用参数
        
        Yields:
            ToolCallContext 对象
        
        Example:
            >>> with debugger.tool_context("search", {"query": "AI"}) as ctx:
            >>>     result = perform_search("AI")
            >>>     ctx.success(result)
        """
        call_id = self.tool_start(tool_name, params)
        ctx = ToolCallContext(self, call_id)
        
        try:
            yield ctx
        except Exception as e:
            ctx.error(str(e))
            raise
    
    # ==================== Token 使用 ====================
    
    def tokens(
        self,
        input_tokens: int,
        output_tokens: int,
        model: str = "unknown"
    ) -> TokenUsage:
        """
        记录 Token 使用
        
        Args:
            input_tokens: 输入 Token 数量
            output_tokens: 输出 Token 数量
            model: 模型名称
        
        Returns:
            TokenUsage 对象
        
        Example:
            >>> debugger.tokens(input_tokens=100, output_tokens=50, model="gpt-4")
        """
        usage = TokenUsage(
            id=self._generate_id(),
            agentId=self.agent_id,
            timestamp=self._get_timestamp(),
            inputTokens=input_tokens,
            outputTokens=output_tokens,
            model=model
        )
        
        self._send("token_usage", asdict(usage))
        return usage
    
    # ==================== 错误记录 ====================
    
    def error(
        self,
        message: str,
        stack: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> ErrorLog:
        """
        记录错误
        
        Args:
            message: 错误消息
            stack: 堆栈信息
            context: 上下文数据
        
        Returns:
            ErrorLog 对象
        
        Example:
            >>> try:
            >>>     risky_operation()
            >>> except Exception as e:
            >>>     debugger.error(str(e), stack=traceback.format_exc())
        """
        error_log = ErrorLog(
            id=self._generate_id(),
            agentId=self.agent_id,
            timestamp=self._get_timestamp(),
            message=message,
            stack=stack,
            context=context
        )
        
        self._send("error", asdict(error_log))
        return error_log
    
    # ==================== 装饰器 ====================
    
    def trace_tool(self, tool_name: str):
        """
        工具调用追踪装饰器
        
        Args:
            tool_name: 工具名称
        
        Example:
            >>> @debugger.trace_tool("search")
            >>> def search(query: str):
            >>>     return perform_search(query)
        """
        def decorator(func):
            def wrapper(*args, **kwargs):
                params = {"args": args, "kwargs": kwargs}
                with self.tool_context(tool_name, params) as ctx:
                    result = func(*args, **kwargs)
                    ctx.success(result)
                    return result
            return wrapper
        return decorator
    
    # ==================== LangChain 集成 ====================
    
    def create_langchain_callback(self, verbose: bool = False):
        """
        创建 LangChain Callback Handler
        
        Returns:
            AgentDebuggerCallbackHandler 实例
        
        Example:
            >>> from agent_debugger import AgentDebugger
            >>> debugger = AgentDebugger(agent_id="my-agent")
            >>> callback = debugger.create_langchain_callback()
            >>> llm = ChatOpenAI(callbacks=[callback])
        """
        from .langchain import AgentDebuggerCallbackHandler
        return AgentDebuggerCallbackHandler(self, verbose=verbose)
    
    def track_openai(self, client=None, verbose: bool = False):
        """
        追踪 OpenAI API 调用
        
        Args:
            client: OpenAI 客户端实例（可选）
            verbose: 是否打印详细日志
        
        Returns:
            包装后的 OpenAI 客户端
        
        Example:
            >>> debugger = AgentDebugger(agent_id="my-agent")
            >>> client = debugger.track_openai()
            >>> response = client.chat.completions.create(...)
        """
        from .openai import track_openai
        return track_openai(self, client, verbose)


class ToolCallContext:
    """工具调用上下文"""
    
    def __init__(self, debugger: AgentDebugger, call_id: str):
        self.debugger = debugger
        self.call_id = call_id
        self._finished = False
    
    def success(self, result: Any = None):
        """标记调用成功"""
        if self._finished:
            return
        self.debugger.tool_end(self.call_id, result=result)
        self._finished = True
    
    def error(self, error: str):
        """标记调用失败"""
        if self._finished:
            return
        self.debugger.tool_end(self.call_id, error=error)
        self._finished = True


# ==================== LangChain 集成 ====================

class AgentDebuggerCallbackHandler:
    """
    LangChain Callback Handler for Agent Debugger
    
    自动追踪 LangChain Agent 的思考、工具调用和 Token 使用
    """
    
    def __init__(self, debugger: AgentDebugger):
        self.debugger = debugger
    
    def on_llm_start(self, serialized, prompts, **kwargs):
        """LLM 开始"""
        model = kwargs.get("invocation_params", {}).get("model", "unknown")
        self._current_model = model
    
    def on_llm_end(self, response, **kwargs):
        """LLM 结束"""
        if hasattr(response, "llm_output") and response.llm_output:
            token_usage = response.llm_output.get("token_usage", {})
            if token_usage:
                self.debugger.tokens(
                    input_tokens=token_usage.get("prompt_tokens", 0),
                    output_tokens=token_usage.get("completion_tokens", 0),
                    model=getattr(self, "_current_model", "unknown")
                )
    
    def on_chain_start(self, serialized, inputs, **kwargs):
        """Chain 开始"""
        pass
    
    def on_chain_end(self, outputs, **kwargs):
        """Chain 结束"""
        pass
    
    def on_tool_start(self, serialized, input_str, **kwargs):
        """工具开始"""
        tool_name = serialized.get("name", "unknown")
        self._current_tool_call = self.debugger.tool_start(
            tool_name, 
            {"input": input_str}
        )
    
    def on_tool_end(self, output, **kwargs):
        """工具结束"""
        if hasattr(self, "_current_tool_call"):
            self.debugger.tool_end(self._current_tool_call, result=output)
    
    def on_tool_error(self, error, **kwargs):
        """工具错误"""
        if hasattr(self, "_current_tool_call"):
            self.debugger.tool_end(self._current_tool_call, error=str(error))
    
    def on_agent_action(self, action, **kwargs):
        """Agent 动作"""
        self.debugger.think(
            content=f"Action: {action.tool}\nInput: {action.tool_input}",
            type="planning"
        )
    
    def on_agent_finish(self, finish, **kwargs):
        """Agent 完成"""
        self.debugger.think(
            content=f"Final Answer: {finish.return_values.get('output', '')}",
            type="reflection"
        )


# ==================== 便捷函数 ====================

def create_debugger(
    agent_id: str = "default-agent",
    server_url: str = "ws://localhost:8765"
) -> AgentDebugger:
    """
    创建 Agent Debugger 客户端
    
    Args:
        agent_id: Agent 唯一标识符
        server_url: Agent Debugger 服务器地址
    
    Returns:
        AgentDebugger 实例
    
    Example:
        >>> debugger = create_debugger("my-agent")
        >>> debugger.think("Hello, Agent Debugger!")
    """
    return AgentDebugger(agent_id=agent_id, server_url=server_url)


__all__ = [
    "AgentDebugger",
    "ToolCallContext",
    "AgentDebuggerCallbackHandler",
    "create_debugger",
    "Thought",
    "ToolCall",
    "TokenUsage",
    "ErrorLog",
]
