import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
  }

  try {
    const { prompt } = await req.json()

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.6,
    })

    return NextResponse.json({ result: completion.choices[0].message.content })
  } catch (error) {
    if (error instanceof Error) {
      if ('response' in error && typeof error.response === 'object' && error.response !== null) {
        const apiError = error.response as { status?: number; data?: unknown }
        console.error(apiError.status, apiError.data)
        return NextResponse.json({ error: apiError.data }, { status: apiError.status || 500 })
      } else {
        console.error(`Error with OpenAI API request: ${error.message}`)
        return NextResponse.json({ error: 'An error occurred during your request.' }, { status: 500 })
      }
    } else {
      console.error('An unknown error occurred')
      return NextResponse.json({ error: 'An unknown error occurred.' }, { status: 500 })
    }
  }
}