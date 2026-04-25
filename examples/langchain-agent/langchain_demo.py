"""
Agent Debugger 示例 - LangChain Agent 集成

这个示例展示如何将 Agent Debugger 与 LangChain Agent 集成
"""

import os
from langchain.chat_models import ChatOpenAI
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
from agent_debugger import AgentDebugger


# 创建 debugger 实例
debugger = AgentDebugger(agent_id="langchain-agent")

# 创建 LangChain Callback Handler
callback = debugger.create_langchain_callback()


# ==================== 定义工具 ====================

def search_tool(query: str) -> str:
    """搜索工具"""
    # 这里可以接入真实的搜索 API
    return f"搜索结果: 找到了关于 '{query}' 的 5 条相关信息"


def calculator_tool(expression: str) -> str:
    """计算器工具"""
    try:
        result = eval(expression)
        return f"计算结果: {result}"
    except Exception as e:
        return f"计算错误: {str(e)}"


def weather_tool(location: str) -> str:
    """天气工具"""
    # 这里可以接入真实的天气 API
    return f"{location} 的天气: 晴朗，温度 25°C"


# 创建 LangChain 工具
tools = [
    Tool(
        name="search",
        func=search_tool,
        description="搜索网络信息。输入: 搜索查询。输出: 搜索结果。"
    ),
    Tool(
        name="calculator",
        func=calculator_tool,
        description="执行数学计算。输入: 数学表达式。输出: 计算结果。"
    ),
    Tool(
        name="weather",
        func=weather_tool,
        description="查询天气信息。输入: 地点名称。输出: 天气信息。"
    ),
]


# ==================== 创建 Agent ====================

# 创建 LLM (使用 Callback)
llm = ChatOpenAI(
    model="gpt-4",
    temperature=0,
    callbacks=[callback]
)

# 创建 Agent
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    callbacks=[callback],
    verbose=True
)


# ==================== 运行 Agent ====================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  Agent Debugger 示例 - LangChain Agent")
    print("="*60)
    print("\n请确保:")
    print("1. Agent Debugger 桌面应用正在运行 (ws://localhost:8765)")
    print("2. 已设置 OPENAI_API_KEY 环境变量")
    print("\n按 Ctrl+C 退出\n")
    
    # 检查 API Key
    if not os.environ.get("OPENAI_API_KEY"):
        print("⚠️  请设置 OPENAI_API_KEY 环境变量")
        print("示例: export OPENAI_API_KEY='your-api-key'")
        debugger.disconnect()
        exit(1)
    
    try:
        # 测试查询
        queries = [
            "What is the weather in Beijing?",
            "Calculate 25 * 4 + 10",
            "Search for latest AI news and summarize",
        ]
        
        for query in queries:
            print(f"\n{'='*60}")
            print(f"查询: {query}")
            print(f"{'='*60}\n")
            
            result = agent.run(query)
            print(f"\n结果: {result}")
            
            # 记录额外的 Token 使用
            debugger.tokens(
                input_tokens=100,
                output_tokens=50,
                model="gpt-4"
            )
        
        print("\n✅ 所有查询处理完成！")
        print("请在 Agent Debugger 中查看完整的执行记录")
        
    except KeyboardInterrupt:
        print("\n\n👋 用户中断，正在退出...")
    finally:
        debugger.disconnect()
        print("✅ 已断开连接")