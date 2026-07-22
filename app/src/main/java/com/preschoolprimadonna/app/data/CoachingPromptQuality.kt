package com.preschoolprimadonna.app.data

private const val COACHING_PROMPT_GUIDANCE =
    "Describe what is happening at your center, the outcome you want, and one relevant detail or number."

private val genericCoachingPrompts = listOf(
    Regex("^(help|help me|i need help|give me advice|advise me|what should i do|what do i do|tell me something)[.!?]*$", RegexOption.IGNORE_CASE),
    Regex("^(fix|solve)\\s+(this|it|things?)[.!?]*$", RegexOption.IGNORE_CASE),
    Regex("^(i don't know|idk|not sure|whatever)[.!?]*$", RegexOption.IGNORE_CASE),
    Regex("^(it|this|that|things?)\\s+(is|are|isn't|aren't|was|were|won't|doesn't)\\s+(bad|broken|working|right|wrong|good)[.!?]*$", RegexOption.IGNORE_CASE)
)

internal fun obviousCoachingPromptIssue(prompt: String): String? {
    val normalized = prompt.trim().replace(Regex("\\s+"), " ")
    val compact = normalized.filter { it.isLetterOrDigit() }
    val words = Regex("[A-Za-z0-9']+").findAll(normalized).map { it.value.lowercase() }.toList()
    val visible = normalized.count { !it.isWhitespace() }
    val lettersAndNumbers = normalized.count { it.isLetterOrDigit() }

    val repeatedCharacter = compact.length >= 5 && compact.all { it.equals(compact.first(), ignoreCase = true) }
    val keyboardNoise = Regex("^(asdf|asdfgh|qwer|qwerty|zxcv|hjkl|jkl|abcd|1234)+$", RegexOption.IGNORE_CASE)
        .matches(compact)
    if (repeatedCharacter || keyboardNoise) {
        return "Raven needs a coherent childcare business question. $COACHING_PROMPT_GUIDANCE"
    }

    if (normalized.length < 8 || words.size < 2) return COACHING_PROMPT_GUIDANCE

    val contentRatio = lettersAndNumbers.toDouble() / visible.coerceAtLeast(1)
    if (contentRatio < 0.45 || (words.size >= 3 && words.toSet().size == 1)) {
        return "Raven needs a coherent childcare business question. $COACHING_PROMPT_GUIDANCE"
    }

    if (genericCoachingPrompts.any { it.matches(normalized) }) {
        return "Raven needs more context before giving you a strategy. $COACHING_PROMPT_GUIDANCE"
    }

    return null
}
