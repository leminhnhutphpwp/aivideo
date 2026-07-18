import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        suggestion: "Tôi gợi ý bạn nên sử dụng ánh sáng Cinematic tương phản cao (Teal & Orange). Thử góc máy thấp để tăng sự kịch tính."
      });
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const fullPrompt = `Bạn là chuyên gia điện ảnh 3D. Dự án: ${context}. Yêu cầu: ${prompt}. Gợi ý góc máy và ánh sáng bằng tiếng Việt, súc tích.`;
    const result = await model.generateContent(fullPrompt);
    return NextResponse.json({ suggestion: result.response.text() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ suggestion: "Hãy thử dùng ánh sáng volumetric để tạo chiều sâu cho phân cảnh." });
  }
}
