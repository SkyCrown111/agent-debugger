"""
Agent Debugger Python SDK 测试
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from agent_debugger import (
    AgentDebuggerClient,
    AgentConfig,
    ThoughtType,
    create_client,
)


@pytest.fixture
def mock_websocket():
    """Mock WebSocket 连接"""
    ws = MagicMock()
    ws.send = MagicMock()
    ws.close = MagicMock()
    return ws


@pytest.mark.asyncio
async def test_client_creation():
    """测试客户端创建"""
    client = create_client("Test Agent")
    assert client.config.agent_name == "Test Agent"
    assert client.config.server_url == "ws://localhost:8765"


@pytest.mark.asyncio
async def test_client_with_custom_config():
    """测试自定义配置"""
    client = create_client(
        agent_name="Custom Agent",
        server_url="ws://custom-server:9000",
        metadata={"version": "1.0"}
    )
    assert client.config.agent_name == "Custom Agent"
    assert client.config.server_url == "ws://custom-server:9000"
    assert client.config.metadata == {"version": "1.0"}


@pytest.mark.asyncio
async def test_send_thought():
    """测试发送思考过程"""
    client = create_client("Thought Agent")
    
    # Mock 连接
    client._ws = MagicMock()
    client._connected = True
    client._ws.send = MagicMock()
    
    client.send_thought(
        content="Test thought",
        thought_type=ThoughtType.REASONING,
        duration=100,
        tokens=50
    )
    
    # 验证消息发送
    assert client._ws.send.called
    message = client._ws.send.call_args[0][0]
    assert "thought" in message


@pytest.mark.asyncio
async def test_tool_call_flow():
    """测试工具调用流程"""
    client = create_client("Tool Agent")
    
    # Mock 连接
    client._ws = MagicMock()
    client._connected = True
    client._ws.send = MagicMock()
    
    # 开始工具调用
    tool_id = client.start_tool_call("test_tool", {"param": "value"})
    assert tool_id is not None
    
    # 结束工具调用
    client.end_tool_call(tool_id, result={"output": "success"})
    
    # 验证两条消息发送
    assert client._ws.send.call_count >= 2


@pytest.mark.asyncio
async def test_token_usage():
    """测试 Token 使用记录"""
    client = create_client("Token Agent")
    
    # Mock 连接
    client._ws = MagicMock()
    client._connected = True
    client._ws.send = MagicMock()
    
    client.send_token_usage(
        input_tokens=100,
        output_tokens=200,
        model="gpt-4"
    )
    
    assert client._ws.send.called


@pytest.mark.asyncio
async def test_error_reporting():
    """测试错误报告"""
    client = create_client("Error Agent")
    
    # Mock 连接
    client._ws = MagicMock()
    client._connected = True
    client._ws.send = MagicMock()
    
    client.send_error(
        message="Test error",
        stack="Test stack trace",
        context={"operation": "test"}
    )
    
    assert client._ws.send.called


@pytest.mark.asyncio
async def test_thought_context_manager():
    """测试思考上下文管理器"""
    client = create_client("Context Agent")
    
    # Mock 连接
    client._ws = MagicMock()
    client._connected = True
    client._ws.send = MagicMock()
    
    async with client.thought_context(ThoughtType.PLANNING) as thought:
        thought.write("Step 1\n")
        thought.write("Step 2\n")
    
    # 退出时自动发送
    assert client._ws.send.called


@pytest.mark.asyncio
async def test_tool_context_manager():
    """测试工具上下文管理器"""
    client = create_client("Tool Context Agent")
    
    # Mock 连接
    client._ws = MagicMock()
    client._connected = True
    client._ws.send = MagicMock()
    
    async with client.tool_context("test_tool", {"input": "test"}):
        # 执行一些操作
        await asyncio.sleep(0.1)
    
    # 退出时自动发送结果
    assert client._ws.send.called


def test_thought_types():
    """测试思考类型枚举"""
    assert ThoughtType.REASONING.value == "reasoning"
    assert ThoughtType.PLANNING.value == "planning"
    assert ThoughtType.REFLECTION.value == "reflection"
    assert ThoughtType.OBSERVATION.value == "observation"
    assert ThoughtType.ACTION.value == "action"


def test_agent_config():
    """测试 Agent 配置"""
    config = AgentConfig(
        id="test-id",
        name="Test Agent",
        metadata={"type": "test"}
    )
    assert config.id == "test-id"
    assert config.name == "Test Agent"
    assert config.metadata == {"type": "test"}