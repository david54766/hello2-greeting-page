package com.preschoolprimadonna.app.data

// Used on the main thread by both coroutine results and MediaPlayer callbacks.
internal class VoiceRequestTracker {
    private var generation = 0L
    private var active = false

    fun begin(): Long {
        generation += 1
        active = true
        return generation
    }

    fun cancel() {
        active = false
        generation += 1
    }

    fun isCurrent(request: Long): Boolean = active && generation == request
}
