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
    fun rejectsGenericFiller() {
        assertNotNull(obviousCoachingPromptIssue("help me"))
        assertNotNull(obviousCoachingPromptIssue("advice about staffing"))
        assertNotNull(obviousCoachingPromptIssue("How do I improve enrollment?"))
    }

    @Test
    fun leavesSpecificPromptsForServerClassification() {
        assertNull(
            obviousCoachingPromptIssue(
                "Enrollment fell from 92 to 78 in 60 days while tour volume stayed flat. What should I audit first?"
            )
        )
    }
}
