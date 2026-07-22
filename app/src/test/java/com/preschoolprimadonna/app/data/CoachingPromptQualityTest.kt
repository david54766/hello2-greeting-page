package com.preschoolprimadonna.app.data

import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test

class CoachingPromptQualityTest {
    @Test
    fun rejectsKeyboardNoise() {
        assertNotNull(obviousCoachingPromptIssue("asdfasdfasdf!!!!"))
    }

    @Test
    fun rejectsUnreadableInput() {
        assertNotNull(obviousCoachingPromptIssue("!!!!!"))
        assertNotNull(obviousCoachingPromptIssue("no no no no no"))
    }

    @Test
    fun leavesLegitimatePromptsForServerClassification() {
        assertNull(obviousCoachingPromptIssue("How do I improve enrollment?"))
        assertNull(obviousCoachingPromptIssue("Advice about staffing"))
        assertNull(obviousCoachingPromptIssue("help me"))
        assertNull(obviousCoachingPromptIssue("What should I do?"))
        assertNull(obviousCoachingPromptIssue("What color should I paint my kitchen?"))
        assertNull(
            obviousCoachingPromptIssue(
                "Enrollment fell from 92 to 78 in 60 days while tour volume stayed flat. What should I audit first?"
            )
        )
    }
}
