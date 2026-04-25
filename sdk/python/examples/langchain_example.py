"""
LangChain 集成示例
展示如何将 Agent Debugger 与 LangChain Agent 集成

使用实际的 agent_debugger.AgentDebugger 和 AgentDebuggerCallbackHandler API
"""

import time
from agent_debugger import AgentDebugger, create_debugger


def langchain_callback_example():
    """LangChain Callback Handler 示例"""
    print("=== LangChain Callback Handler 示例 ===")

    debugger = create_debugger("LangChain Agent")
    if not debugger.connected:
        print("⚠ Agent Debugger 服务器未运行，跳过")
        return

    try:
        # 创建 LangChain Callback Handler
        callback = debugger.create_langchain_callback()

        # 在实际 LangChain 代码中使用:
        #
        # from langchain.chat_models import ChatOpenAI
        # from langchain.agents import initialize_agent, AgentType
        #
        # llm = ChatOpenAI(model="gpt-4", callbacks=[callback])
        # agent = initialize_agent(tools, llm, callbacks=[callback])
        #
        # result = agent.run("你的问题")

        print("✓ Callback Handler 创建成功")
        print("  在 LangChain 中使用: llm = ChatOpenAI(callbacks=[callback])")

        # 手动模拟追踪以演示功能
        callback.on_llm_start(
            {"name": "ChatOpenAI"},
            ["What is the capital of France?"],
            invocation_params={"model_name": "gpt-4"}
        )
        time.sleep(0.3)

        # 模拟 LLM 响应
        class MockLLMResult:
            def __init__(self):
                self.llm_output = {
                    "token_usage": {
                        "prompt_tokens": 10,
                        "completion_tokens": 8
                    }
                }
                self.generations = [[type("Gen", (), {"text": "The capital of France is Paris."})()]]

        callback.on_llm_end(MockLLMResult())
        print("✓ LLM 调用已追踪")

        # 追踪工具调用
        callback.on_tool_start({"name": "search"}, "France capital")
        time.sleep(0.2)
        callback.on_tool_end('{"result": "Paris"}')
        print("✓ 工具调用已追踪")

        # 追踪 Agent 思考
        class MockAgentAction:
            tool = "search"
            tool_input = "France capital"
            log = "我需要搜索法国首都的信息"

        callback.on_agent_action(MockAgentAction())
        print("✓ Agent 行动已追踪")

    finally:
        debugger.disconnect()
        print("✓ 已断开连接")


def main():
    """运行示例"""
    print("=" * 50)
    print("LangChain 集成示例")
    print("=" * 50)
    print("\n⚠ 请确保 Agent Debugger 服务器正在运行 (ws://localhost:8765)\n")

    langchain_callback_example()


if __name__ == "__main__":
    main()
