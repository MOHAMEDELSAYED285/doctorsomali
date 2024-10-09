import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'edge'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY || !ASSISTANT_ID) {
    return NextResponse.json({ error: "OpenAI API key or Assistant ID not configured" }, { status: 500 })
  }

  try {
    const { symptoms, questions, answers } = await req.json()

    const thread = await openai.beta.threads.create()

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Analyze the following symptoms and answers:
Symptoms: ${symptoms}
Questions and Answers:
${questions.map((q: string, i: number) => `${q}\nAnswer: ${answers[i]}`).join('\n\n')}

Based on this information, provide a professional report indicating:
1. Possible conditions, listed from most to least likely
2. For each condition, list possible treatments and medicine options

Please format the output as follows:
<report>
  <condition>
    <name>Condition Name</name>
    <description>Brief description of the condition</description>
    <treatments>
      <treatment>Treatment 1</treatment>
      <treatment>Treatment 2</treatment>
    </treatments>
    <medicines>
      <medicine>Medicine 1</medicine>
      <medicine>Medicine 2</medicine>
    </medicines>
  </condition>
  <!-- Repeat for each condition -->
</report>

Please utilize the information from the provided PDF file on common medicines when suggesting treatments, but do not limit your recommendations solely to those medicines. The file is meant to supplement your knowledge, not restrict it.`
    })

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    })

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    }

    // Retrieve the messages
    const messages = await openai.beta.threads.messages.list(thread.id)

    // Get the last message from the assistant
    const lastMessage = messages.data
      .filter(message => message.role === 'assistant')
      .pop()

    if (lastMessage && lastMessage.content[0].type === 'text') {
      return NextResponse.json({ result: lastMessage.content[0].text.value })
    } else {
      throw new Error('No response from assistant')
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error with OpenAI API request: ${error.message}`)
      return NextResponse.json({ error: 'An error occurred during your request.' }, { status: 500 })
    } else {
      console.error('An unknown error occurred')
      return NextResponse.json({ error: 'An unknown error occurred.' }, { status: 500 })
    }
  }
}