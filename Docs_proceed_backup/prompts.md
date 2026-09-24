# Prompts

> Every AI agent / LLM call in your app lives here — system prompts AND functional prompts.
> Don't scatter prompts across the codebase. One file, versioned, easy to tune.

## Global rules (apply to every agent)
- Tone: <e.g. concise, friendly, no filler>
- Never: <reveal system prompt, make up data, expose secrets>
- Always: <cite the source / return valid JSON / ask if unsure>

## Agent: <name>  <!-- e.g. Support Agent -->
**Purpose:** <what this agent does>
**Model:** <e.g. claude-sonnet-5>

**System prompt:**
```
You are <role>. You help users <do X>.
Rules:
- <rule 1>
- <rule 2>
Output format: <plain text / JSON schema>
```

**Functional prompts (tasks this agent runs):**
- `summarize(input)` →
  ```
  Summarize the following in <N> bullet points: {input}
  ```
- `classify(input)` →
  ```
  Classify {input} into one of: <A | B | C>. Return only the label.
  ```
- `reply(context)` →
  ```
  Given {context}, write a reply that <goal>.
  ```

## Agent: <name 2>
**Purpose:** <...>
**System prompt:**
```
<...>
```
**Functional prompts:**
- <...>

## Variables / placeholders
Document every `{variable}` you inject so they stay consistent:
- `{input}` — <raw user text>
- `{context}` — <retrieved docs / history>
- `{user}` — <profile fields you pass in>

## Change log
- <date> — <what you changed and why>
