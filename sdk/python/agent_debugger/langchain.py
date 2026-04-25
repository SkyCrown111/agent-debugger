"""
LangChain Callback Handler for Agent Debugger

This module provides a LangChain callback handler that integrates with Agent Debugger
to track LLM calls, tool usage, and chain executions.

Usage:
    from agent_debugger import AgentDebugger
    from agent_debugger.langchain import AgentDebuggerCallbackHandler
    
    debugger = AgentDebugger(agent_id="my-agent")
    callback = AgentDebuggerCallbackHandler(debugger)
    
    # Use with LangChain
    llm = ChatOpenAI(callbacks=[callback])
    agent = initialize_agent(tools, llm, callbacks=[callback])
"""

import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Sequence
from dataclasses import dataclass, asdict

try:
    from langchain_core.callbacks import BaseCallbackHandler
    from langchain_core.outputs import LLMResult
    from langchain_core.agents import AgentAction, AgentFinish
    from langchain_core.messages import BaseMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    BaseCallbackHandler = object


class AgentDebuggerCallbackHandler(BaseCallbackHandler if LANGCHAIN_AVAILABLE else object):
    """
    LangChain Callback Handler for Agent Debugger
    
    Automatically tracks:
    - LLM calls (prompts, completions, token usage)
    - Tool calls (inputs, outputs, errors)
    - Chain executions
    - Agent actions and thoughts
    
    Example:
        >>> from agent_debugger import AgentDebugger
        >>> from agent_debugger.langchain import AgentDebuggerCallbackHandler
        >>> 
        >>> debugger = AgentDebugger(agent_id="langchain-agent")
        >>> callback = AgentDebuggerCallbackHandler(debugger)
        >>> 
        >>> # Use with LLM
        >>> llm = ChatOpenAI(callbacks=[callback])
        >>> 
        >>> # Use with Agent
        >>> agent = initialize_agent(tools, llm, callbacks=[callback])
        >>> agent.run("What is the weather?")
    """
    
    def __init__(self, debugger, verbose: bool = False):
        """
        Initialize the callback handler
        
        Args:
            debugger: AgentDebugger instance
            verbose: Whether to print debug information
        """
        if not LANGCHAIN_AVAILABLE:
            raise ImportError(
                "LangChain is not installed. "
                "Install it with: pip install langchain langchain-core"
            )
        
        super().__init__()
        self.debugger = debugger
        self.verbose = verbose
        self._llm_starts: Dict[str, dict] = {}
        self._tool_starts: Dict[str, dict] = {}
        self._chain_starts: Dict[str, dict] = {}
        self._agent_thoughts: List[dict] = []
    
    def _log(self, message: str):
        """Print debug message if verbose mode is enabled"""
        if self.verbose:
            print(f"[AgentDebugger] {message}")
    
    def _generate_id(self) -> str:
        """Generate unique ID"""
        return str(uuid.uuid4())
    
    def _get_timestamp(self) -> str:
        """Get ISO format timestamp"""
        return datetime.now().isoformat()
    
    # ==================== LLM Callbacks ====================
    
    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        **kwargs: Any
    ) -> None:
        """Called when LLM starts running"""
        run_id = str(kwargs.get("run_id", self._generate_id()))
        model = kwargs.get("invocation_params", {}).get("model_name", "unknown")
        
        self._llm_starts[run_id] = {
            "start_time": time.time(),
            "prompts": prompts,
            "model": model
        }
        
        # Record as thought
        prompt_preview = prompts[0][:200] + "..." if prompts[0] and len(prompts[0]) > 200 else prompts[0]
        self.debugger.think(
            content=f"LLM 调用开始\n模型: {model}\n提示词: {prompt_preview}",
            type="reasoning"
        )
        
        self._log(f"LLM started with model: {model}")
    
    def on_llm_end(
        self,
        response: LLMResult,
        **kwargs: Any
    ) -> None:
        """Called when LLM ends running"""
        run_id = str(kwargs.get("run_id", ""))
        
        if run_id in self._llm_starts:
            start_info = self._llm_starts.pop(run_id)
            duration = int((time.time() - start_info["start_time"]) * 1000)
            
            # Extract token usage
            token_usage = response.llm_output.get("token_usage", {}) if response.llm_output else {}
            input_tokens = token_usage.get("prompt_tokens", 0)
            output_tokens = token_usage.get("completion_tokens", 0)
            
            # Record token usage
            if input_tokens or output_tokens:
                self.debugger.tokens(
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    model=start_info.get("model", "unknown")
                )
            
            # Record completion thought
            generation = response.generations[0][0] if response.generations else None
            if generation:
                text = generation.text[:200] + "..." if len(generation.text) > 200 else generation.text
                self.debugger.think(
                    content=f"LLM 响应完成\n耗时: {duration}ms\n响应: {text}",
                    type="reasoning",
                    duration=duration
                )
            
            self._log(f"LLM ended, tokens: {input_tokens} + {output_tokens}")
    
    def on_llm_error(
        self,
        error: Exception,
        **kwargs: Any
    ) -> None:
        """Called when LLM errors"""
        run_id = str(kwargs.get("run_id", ""))
        
        if run_id in self._llm_starts:
            self._llm_starts.pop(run_id)
        
        self.debugger.error(
            message=f"LLM 错误: {str(error)}",
            context={"error_type": type(error).__name__}
        )
        
        self._log(f"LLM error: {error}")
    
    # ==================== Tool Callbacks ====================
    
    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        **kwargs: Any
    ) -> None:
        """Called when tool starts running"""
        run_id = str(kwargs.get("run_id", self._generate_id()))
        tool_name = serialized.get("name", kwargs.get("name", "unknown"))
        
        self._tool_starts[run_id] = {
            "start_time": time.time(),
            "tool_name": tool_name,
            "input": input_str
        }
        
        # Start tool call
        call_id = self.debugger.tool_start(
            tool_name=tool_name,
            params={"input": input_str}
        )
        self._tool_starts[run_id]["call_id"] = call_id
        
        self._log(f"Tool started: {tool_name}")
    
    def on_tool_end(
        self,
        output: str,
        **kwargs: Any
    ) -> None:
        """Called when tool ends running"""
        run_id = str(kwargs.get("run_id", ""))
        
        if run_id in self._tool_starts:
            start_info = self._tool_starts.pop(run_id)
            call_id = start_info.get("call_id")
            
            if call_id:
                self.debugger.tool_end(
                    call_id=call_id,
                    result=output
                )
            
            self._log(f"Tool ended: {start_info['tool_name']}")
    
    def on_tool_error(
        self,
        error: Exception,
        **kwargs: Any
    ) -> None:
        """Called when tool errors"""
        run_id = str(kwargs.get("run_id", ""))
        
        if run_id in self._tool_starts:
            start_info = self._tool_starts.pop(run_id)
            call_id = start_info.get("call_id")
            
            if call_id:
                self.debugger.tool_end(
                    call_id=call_id,
                    error=str(error)
                )
            
            self._log(f"Tool error: {error}")
    
    # ==================== Chain Callbacks ====================
    
    def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        **kwargs: Any
    ) -> None:
        """Called when chain starts running"""
        run_id = str(kwargs.get("run_id", self._generate_id()))
        chain_name = serialized.get("name", kwargs.get("name", "Chain"))
        
        self._chain_starts[run_id] = {
            "start_time": time.time(),
            "chain_name": chain_name,
            "inputs": inputs
        }
        
        self.debugger.think(
            content=f"Chain 开始执行: {chain_name}",
            type="planning"
        )
        
        self._log(f"Chain started: {chain_name}")
    
    def on_chain_end(
        self,
        outputs: Dict[str, Any],
        **kwargs: Any
    ) -> None:
        """Called when chain ends running"""
        run_id = str(kwargs.get("run_id", ""))
        
        if run_id in self._chain_starts:
            start_info = self._chain_starts.pop(run_id)
            duration = int((time.time() - start_info["start_time"]) * 1000)
            
            self.debugger.think(
                content=f"Chain 执行完成: {start_info['chain_name']}",
                type="planning",
                duration=duration
            )
            
            self._log(f"Chain ended: {start_info['chain_name']}")
    
    def on_chain_error(
        self,
        error: Exception,
        **kwargs: Any
    ) -> None:
        """Called when chain errors"""
        run_id = str(kwargs.get("run_id", ""))
        
        if run_id in self._chain_starts:
            self._chain_starts.pop(run_id)
        
        self.debugger.error(
            message=f"Chain 错误: {str(error)}",
            context={"error_type": type(error).__name__}
        )
        
        self._log(f"Chain error: {error}")
    
    # ==================== Agent Callbacks ====================
    
    def on_agent_action(
        self,
        action: AgentAction,
        **kwargs: Any
    ) -> None:
        """Called when agent takes an action"""
        thought = {
            "action": action.action,
            "tool": action.tool,
            "tool_input": action.tool_input,
            "log": action.log
        }
        
        self._agent_thoughts.append(thought)
        
        self.debugger.think(
            content=f"Agent 行动\n工具: {action.tool}\n输入: {action.tool_input}\n\n{action.log}",
            type="planning"
        )
        
        self._log(f"Agent action: {action.tool}")
    
    def on_agent_finish(
        self,
        finish: AgentFinish,
        **kwargs: Any
    ) -> None:
        """Called when agent finishes"""
        output = finish.return_values.get("output", "")
        log = finish.log
        
        self.debugger.think(
            content=f"Agent 完成\n输出: {output}\n\n{log}",
            type="reflection"
        )
        
        self._log("Agent finished")
    
    # ==================== Chat Model Callbacks ====================
    
    def on_chat_model_start(
        self,
        serialized: Dict[str, Any],
        messages: List[List[BaseMessage]],
        **kwargs: Any
    ) -> None:
        """Called when chat model starts"""
        run_id = str(kwargs.get("run_id", self._generate_id()))
        model = kwargs.get("invocation_params", {}).get("model_name", "unknown")
        
        # Convert messages to string representation
        prompts = []
        for msg_list in messages:
            for msg in msg_list:
                prompts.append(f"{msg.type}: {msg.content}")
        
        self._llm_starts[run_id] = {
            "start_time": time.time(),
            "prompts": prompts,
            "model": model,
            "message_count": sum(len(m) for m in messages)
        }
        
        self.debugger.think(
            content=f"Chat Model 调用\n模型: {model}\n消息数: {self._llm_starts[run_id]['message_count']}",
            type="reasoning"
        )
        
        self._log(f"Chat model started: {model}")
    
    # ==================== Retriever Callbacks ====================
    
    def on_retriever_start(
        self,
        serialized: Dict[str, Any],
        query: str,
        **kwargs: Any
    ) -> None:
        """Called when retriever starts"""
        run_id = str(kwargs.get("run_id", self._generate_id()))
        
        self.debugger.tool_start(
            tool_name="retriever",
            params={"query": query}
        )
        
        self._log(f"Retriever started: {query[:50]}...")
    
    def on_retriever_end(
        self,
        documents: Sequence[Any],
        **kwargs: Any
    ) -> None:
        """Called when retriever ends"""
        run_id = str(kwargs.get("run_id", ""))
        
        self.debugger.tool_end(
            call_id=run_id,
            result=f"Retrieved {len(documents)} documents"
        )
        
        self._log(f"Retriever ended: {len(documents)} documents")


def create_langchain_callback(debugger, verbose: bool = False) -> AgentDebuggerCallbackHandler:
    """
    Create a LangChain callback handler for Agent Debugger
    
    Args:
        debugger: AgentDebugger instance
        verbose: Whether to print debug information
    
    Returns:
        AgentDebuggerCallbackHandler instance
    
    Example:
        >>> from agent_debugger import AgentDebugger
        >>> from agent_debugger.langchain import create_langchain_callback
        >>> 
        >>> debugger = AgentDebugger(agent_id="my-agent")
        >>> callback = create_langchain_callback(debugger)
        >>> 
        >>> # Use with LangChain
        >>> from langchain.chat_models import ChatOpenAI
        >>> llm = ChatOpenAI(callbacks=[callback])
    """
    return AgentDebuggerCallbackHandler(debugger, verbose=verbose)
