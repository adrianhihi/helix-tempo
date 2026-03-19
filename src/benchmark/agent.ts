import type { HumanEvalTask } from './humaneval.js';

// ── Mock solutions for when no API key is available ─────────────────

const MOCK_SOLUTIONS: Record<string, string> = {
  has_close_elements: `    for idx, elem in enumerate(numbers):\n        for idx2, elem2 in enumerate(numbers):\n            if idx != idx2:\n                distance = abs(elem - elem2)\n                if distance < threshold:\n                    return True\n    return False`,
  separate_paren_groups: `    result = []\n    current = ''\n    depth = 0\n    for c in paren_string:\n        if c == '(':\n            depth += 1\n            current += c\n        elif c == ')':\n            depth -= 1\n            current += c\n            if depth == 0:\n                result.append(current)\n                current = ''\n    return result`,
  truncate_number: `    return number % 1.0`,
  below_zero: `    balance = 0\n    for op in operations:\n        balance += op\n        if balance < 0:\n            return True\n    return False`,
  mean_absolute_deviation: `    mean = sum(numbers) / len(numbers)\n    return sum(abs(x - mean) for x in numbers) / len(numbers)`,
};

function getMockSolution(task: HumanEvalTask): string {
  if (MOCK_SOLUTIONS[task.entry_point]) {
    return MOCK_SOLUTIONS[task.entry_point];
  }
  // Generic mock for tasks without specific solutions
  return `    # Solution for ${task.entry_point}\n    pass  # Implementation would go here\n    return None`;
}

// ── Solve a task via OpenAI API ─────────────────────────────────────

export async function solveTask(task: HumanEvalTask): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Mock mode — simulate API delay and return canned solution
    await new Promise(r => setTimeout(r, 200 + Math.random() * 400));
    return getMockSolution(task);
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Complete the following Python function. Return ONLY the function body (the indented code inside the function), no explanation, no markdown fences.',
        },
        { role: 'user', content: task.prompt },
      ],
      max_tokens: 512,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices[0].message.content;
}

export const isMockMode = !process.env.OPENAI_API_KEY;
