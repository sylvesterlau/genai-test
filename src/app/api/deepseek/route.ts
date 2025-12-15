import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "请提供 prompt" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const apiUrl =
      process.env.DEEPSEEK_API_URL ||
      "https://api.deepseek.com/v1/chat/completions";

    if (!apiKey) {
      return NextResponse.json(
        { error: "未配置 DEEPSEEK_API_KEY 环境变量" },
        { status: 500 }
      );
    }

    // 读取 system role prompt
    const systemRolePath = path.join(process.cwd(), "prompts/system_role.md");
    let systemPrompt = "";

    try {
      systemPrompt = fs.readFileSync(systemRolePath, "utf-8");
    } catch (error) {
      console.error("读取 system_role.md 失败:", error);
      // 如果文件不存在，使用空字符串或默认值
    }

    // 读取 Monzo 写作风格指南
    const monzoTonePath = path.join(
      process.cwd(),
      "prompts/monzo_tone_of_voice.md"
    );
    let monzoTonePrompt = "";

    try {
      monzoTonePrompt = fs.readFileSync(monzoTonePath, "utf-8");
    } catch (error) {
      console.error("读取 monzo_tone_of_voice.md 失败:", error);
    }

    // 调用 DeepSeek API
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          ...(systemPrompt
            ? [
                {
                  role: "system",
                  content: systemPrompt,
                },
              ]
            : []),
          ...(monzoTonePrompt
            ? [
                {
                  role: "system",
                  content: `Writing Style Guide:\n\n${monzoTonePrompt}`,
                },
              ]
            : []),
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: `DeepSeek API 错误: ${errorData.error?.message || "未知错误"}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const responseText = data.choices?.[0]?.message?.content || "没有返回内容";

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("API 错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
