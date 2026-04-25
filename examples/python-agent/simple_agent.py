"""
Agent Debugger 示例 - 简单的 AI Agent

这个示例展示如何使用 Agent Debugger SDK 来追踪 Agent 的思考过程和工具调用
"""

import time
import random
from agent_debugger import AgentDebugger, create_debugger


# 创建 debugger 实例
debugger = create_debugger(agent_id="demo-agent")


# ==================== 模拟工具函数 ====================

def web_search(query: str) -> list:
    """模拟网络搜索"""
    time.sleep(random.uniform(0.1, 0.3))
    return [
        {"title": f"Result 1 for {query}", "url": "https://example.com/1"},
        {"title": f"Result 2 for {query}", "url": "https://example.com/2"},
        {"title": f"Result 3 for {query}", "url": "https://example.com/3"},
    ]


def summarize(text: str) -> str:
    """模拟文本摘要"""
    time.sleep(random.uniform(0.2, 0.5))
    return f"Summary: {text[:50]}..."


def analyze_sentiment(text: str) -> dict:
    """模拟情感分析"""
    time.sleep(random.uniform(0.1, 0.2))
    return {
        "sentiment": random.choice(["positive", "negative", "neutral"]),
        "confidence": random.uniform(0.7, 0.99),
    }


# ==================== Agent 主逻辑 ====================

def run_agent(user_query: str):
    """
    运行 Agent 处理用户查询
    
    Args:
        user_query: 用户查询
    """
    print(f"\n{'='*60}")
    print(f"用户查询: {user_query}")
    print(f"{'='*60}\n")
    
    # Step 1: 分析用户意图
    with debugger.think_context("分析用户查询，识别核心意图", "reasoning"):
        time.sleep(0.2)
        intent = "search_and_summarize"
        print(f"✓ 识别意图: {intent}")
    
    # Step 2: 规划执行步骤
    with debugger.think_context("规划执行步骤", "planning"):
        time.sleep(0.15)
        steps = [
            "1. 搜索相关信息",
            "2. 分析搜索结果",
            "3. 生成摘要",
            "4. 返回答案",
        ]
        print(f"✓ 执行计划:\n  " + "\n  ".join(steps))
    
    # Step 3: 执行搜索
    with debugger.tool_context("web_search", {"query": user_query}) as ctx:
        print(f"\n→ 执行工具: web_search")
        results = web_search(user_query)
        ctx.success(results)
        print(f"✓ 搜索完成，找到 {len(results)} 条结果")
    
    # Step 4: 分析搜索结果
    with debugger.think_context("分析搜索结果质量", "reasoning"):
        time.sleep(0.1)
        print(f"✓ 分析完成，结果质量良好")
    
    # Step 5: 对每个结果进行情感分析
    sentiments = []
    for i, result in enumerate(results):
        with debugger.tool_context("analyze_sentiment", {"text": result["title"]}) as ctx:
            print(f"\n→ 执行工具: analyze_sentiment (结果 {i+1})")
            sentiment = analyze_sentiment(result["title"])
            ctx.success(sentiment)
            sentiments.append(sentiment)
            print(f"✓ 情感: {sentiment['sentiment']} ({sentiment['confidence']:.2f})")
    
    # Step 6: 生成摘要
    combined_text = " ".join([r["title"] for r in results])
    with debugger.tool_context("summarize", {"text": combined_text}) as ctx:
        print(f"\n→ 执行工具: summarize")
        summary = summarize(combined_text)
        ctx.success(summary)
        print(f"✓ 摘要生成完成")
    
    # Step 7: 反思执行过程
    with debugger.think_context("反思执行过程，评估结果质量", "reflection"):
        time.sleep(0.1)
        print(f"✓ 反思完成，执行过程顺利")
    
    # Step 8: 记录 Token 使用
    total_input = random.randint(300, 500)
    total_output = random.randint(150, 300)
    debugger.tokens(
        input_tokens=total_input,
        output_tokens=total_output,
        model="gpt-4"
    )
    print(f"\n📊 Token 使用: 输入 {total_input}, 输出 {total_output}")
    
    # 返回最终结果
    return {
        "query": user_query,
        "results": results,
        "sentiments": sentiments,
        "summary": summary,
    }


# ==================== 主程序 ====================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  Agent Debugger 示例 - AI Agent 演示")
    print("="*60)
    print("\n请确保 Agent Debugger 桌面应用正在运行 (ws://localhost:8765)")
    print("按 Ctrl+C 退出\n")
    
    try:
        # 测试查询列表
        queries = [
            "What are the latest AI breakthroughs?",
            "How does quantum computing work?",
            "Best practices for machine learning",
        ]
        
        for query in queries:
            result = run_agent(query)
            print(f"\n{'='*60}")
            print(f"最终答案: {result['summary']}")
            print(f"{'='*60}\n")
            
            time.sleep(2)  # 等待一段时间再处理下一个查询
        
        print("\n✅ 所有查询处理完成！")
        print("请在 Agent Debugger 中查看完整的思考流和工具调用记录")
        
    except KeyboardInterrupt:
        print("\n\n👋 用户中断，正在退出...")
    finally:
        debugger.disconnect()
        print("✅ 已断开与 Agent Debugger 的连接")
