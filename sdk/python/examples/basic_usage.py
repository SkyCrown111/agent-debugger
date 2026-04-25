"""
Agent Debugger Python SDK 使用示例

使用实际的 agent_debugger.AgentDebugger 同步 API
"""

import time
import random
from agent_debugger import AgentDebugger, create_debugger


def basic_example():
    """基础使用示例"""
    print("=== 基础使用示例 ===")

    debugger = create_debugger("Basic Agent")

    if not debugger.connected:
        print("⚠ Agent Debugger 服务器未运行，跳过连接")
        return

    try:
        # 发送思考过程
        debugger.think("正在分析用户的请求，需要确定最佳的处理策略...", type="reasoning")
        print("✓ 已发送思考")

        # 记录规划
        debugger.think(
            "制定执行计划：1. 搜索相关信息 2. 分析结果 3. 生成回答",
            type="planning"
        )
        print("✓ 已发送规划")

        # 模拟工具调用
        debugger.tool("web_search", {"query": "AI Agent 开发"},
                      result={"results": ["结果1", "结果2"]}, duration=500)
        print("✓ 已发送工具调用")

        # 发送 Token 使用
        debugger.tokens(input_tokens=100, output_tokens=200, model="gpt-4")
        print("✓ 已发送 Token 使用")

        # 发送反思
        debugger.think("执行结果良好，用户需求得到满足", type="reflection")
        print("✓ 已发送反思")

    finally:
        debugger.disconnect()
        print("✓ 已断开连接")


def context_manager_example():
    """上下文管理器示例"""
    print("\n=== 上下文管理器示例 ===")

    debugger = AgentDebugger("Context Manager Agent")
    if not debugger.connected:
        return

    try:
        # 使用思考上下文管理器（自动计算耗时）
        with debugger.think_context("正在分析问题...") as thought:
            time.sleep(0.1)
        print("✓ 思考上下文执行完成")

        # 使用工具上下文管理器
        with debugger.tool_context("calculate", {"expression": "2 + 2"}):
            result = 2 + 2
            time.sleep(0.1)
        print("✓ 工具上下文执行完成，结果:", result)

    finally:
        debugger.disconnect()


def tool_decorator_example():
    """装饰器示例"""
    print("\n=== 装饰器示例 ===")

    debugger = AgentDebugger("Decorator Agent")
    if not debugger.connected:
        return

    @debugger.trace_tool("search")
    def search_web(query: str):
        time.sleep(0.3)
        return {"results": [f"结果 for {query}"]}

    try:
        result = search_web("AI Agent")
        print(f"✓ 搜索完成: {result}")
    finally:
        debugger.disconnect()


def error_handling_example():
    """错误处理示例"""
    print("\n=== 错误处理示例 ===")

    debugger = AgentDebugger("Error Handling Agent")
    if not debugger.connected:
        return

    try:
        # 模拟工具调用并记录错误
        try:
            if random.random() > 0.3:
                raise ValueError("模拟的错误")
            debugger.tool("risky_operation", {"param": "value"},
                          result="操作成功")
            print("✓ 操作成功")
        except ValueError as e:
            debugger.error(str(e), context={"operation": "risky_operation"})
            print(f"✗ 操作失败: {e}")
    finally:
        debugger.disconnect()


def main():
    """运行所有示例"""
    print("=" * 50)
    print("Agent Debugger Python SDK 示例")
    print("=" * 50)
    print("\n⚠ 请确保 Agent Debugger 服务器正在运行 (ws://localhost:8765)\n")

    basic_example()
    time.sleep(0.5)
    context_manager_example()
    time.sleep(0.5)
    tool_decorator_example()
    time.sleep(0.5)
    error_handling_example()


if __name__ == "__main__":
    main()
