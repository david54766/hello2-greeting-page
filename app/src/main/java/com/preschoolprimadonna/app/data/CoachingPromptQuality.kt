package com.preschoolprimadonna.app.data

private const val COACHING_PROMPT_GUIDANCE =
    "Raven could not understand that wording. Please rephrase it as a readable question or statement."

internal fun obviousCoachingPromptIssue(prompt: String): String? {
    val normalized = prompt.trim().replace(Regex("\\s+"), " ")
    val compact = normalized.filter { it.isLetterOrDigit() }
    val words = Regex("[A-Za-z0-9']+").findAll(normalized).map { it.value.lowercase() }.toList()
    val visible = normalized.count { !it.isWhitespace() }
    val lettersAndNumbers = normalized.count { it.isLetterOrDigit() }

    val repeatedCharacter = compact.length >= 5 && compact.all { it.equals(compact.first(), ignoreCase = true) }
    val keyboardNoise = Regex("^(asdf|asdfgh|qwer|qwerty|zxcv|hjkl|jkl|abcd|1234)+$", RegexOption.IGNORE_CASE)
        .matches(compact)
    if (compact.isBlank() || repeatedCharacter || keyboardNoise) return COACHING_PROMPT_GUIDANCE

    val contentRatio = lettersAndNumbers.toDouble() / visible.coerceAtLeast(1)
    if (contentRatio < 0.2 || (words.size >= 5 && words.toSet().size == 1)) return COACHING_PROMPT_GUIDANCE

    return null
}
