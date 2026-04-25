"""
OpenAI API 集成示例
展示如何将 Agent Debugger 与 OpenAI API 集成

使用实际的 agent_debugger.AgentDebugger 和 agent_debugger.openai API
"""

import time
from agent_debugger import AgentDebugger, create_debugger


def openai_tracker_example():
    """OpenAI API 追踪示例"""
    print("=== OpenAI API 追踪示例 ===")

    debugger = create_debugger("OpenAI Agent")
    if not debugger.connected:
        print("⚠ Agent Debugger 服务器未运行，跳过")
        return

    try:
        # 追踪 OpenAI 客户端
        # 需要先安装 openai: pip install openai
        client = debugger.track_openai(verbose=True)

        # 在实际代码中使用包装后的客户端:
        #
        # response = client.chat.completions.create(
        #     model="gpt-4",
        #     messages=[{"role": "user", "content": "Hello!"}]
        # )
        #
        # debugger 会自动记录思考、Token 使用和工具调用

        print("✓ OpenAI 追踪器创建成功")
        print("  使用: response = client.chat.completions.create(...)")
        print("  自动追踪思考、Token 使用和工具调用")

        # 模拟追踪过程
        debugger.think("OpenAI Chat Completion (gpt-4)\nPrompt: Hello!", type="reasoning")
        time.sleep(0.3)
        debugger.tokens(input_tokens=10, output_tokens=50, model="gpt-4")
        debugger.think("OpenAI Response: Hello! How can I help you today?", type="reflection")

        print("✓ Chat Completion 已追踪")

    finally:
        debugger.disconnect()
        print("✓ 已断开连接")


def main():
    """运行示例"""
    print("=" * 50)
    print("OpenAI API 集成示例")
    print("=" * 50)
    print("\n⚠ 请确保 Agent Debugger 服务器正在运行 (ws://localhost:8765)\n")

    openai_tracker_example()


if __name__ == "__main__":
    main()
