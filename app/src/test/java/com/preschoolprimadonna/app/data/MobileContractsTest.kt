package com.preschoolprimadonna.app.data

import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.*
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class MobileContractsTest {
    private lateinit var server: MockWebServer
    private lateinit var api: SupabaseRestClient
    private val session = AuthSession("test-token", user = AuthUser("user-1"))
    @Before fun setup() {
        server = MockWebServer()
        server.start()
        api = SupabaseRestClient(server.url("/").toString().trimEnd('/'), server.url("/").toString().trimEnd('/'), "public-test-key")
    }
    @After fun cleanup() { server.shutdown() }
    private fun respond(body: String, code: Int = 200) { server.enqueue(MockResponse().setResponseCode(code).setBody(body)) }

    @Test fun reportsUseModerationQueueWithAuthenticatedReplyIdentity() = runBlocking {
        respond("{\"ok\":true,\"id\":\"report-1\"}")
        api.reportEliteContent(session, "user-1", "thread-1", "reply-1", "Harassment", "Details", null, null, null)
        val request = server.takeRequest()
        assertEquals("/functions/v1/mobile-api", request.path)
        assertEquals("Bearer test-token", request.getHeader("Authorization"))
        val body = Json.parseToJsonElement(request.body.readUtf8()).jsonObject
        assertEquals("report_elite_content", body["action"]!!.jsonPrimitive.content)
        val data = body["data"]!!.jsonObject
        assertEquals("reply", data["content_type"]!!.jsonPrimitive.content)
        assertEquals("reply-1", data["content_id"]!!.jsonPrimitive.content)
        assertEquals("android", data["platform"]!!.jsonPrimitive.content)
    }

    @Test fun failedStrategyPayloadNeverLooksSuccessfulEvenWithHttp200() = runBlocking {
        respond("{\"ok\":false,\"error\":\"Rate limit reached\"}")
        val error = runCatching { api.runCoaching(session, "CEO", "How do I hire?") }.exceptionOrNull()
        assertTrue(error is IllegalStateException)
        assertEquals("Rate limit reached", error?.message)
        assertEquals(1, server.requestCount)
    }

    @Test fun serverValidationIsNotReplayedThroughFallback() = runBlocking {
        respond("{\"error\":\"prompt is invalid\"}", 400)
        assertTrue(runCatching { api.runCoaching(session, "CEO", " ") }.isFailure)
        assertEquals(1, server.requestCount)
    }

    @Test fun blockAndUnblockUseSameTargetAndDistinctActions() = runBlocking {
        respond("{\"ok\":true}")
        respond("{\"ok\":true}")
        api.setEliteBlocked(session, "member-2", true)
        api.setEliteBlocked(session, "member-2", false)
        listOf("block_elite_user", "unblock_elite_user").forEach { action ->
            val body = Json.parseToJsonElement(server.takeRequest().body.readUtf8()).jsonObject
            assertEquals(action, body["action"]!!.jsonPrimitive.content)
            assertEquals("member-2", body["data"]!!.jsonObject["blocked_user_id"]!!.jsonPrimitive.content)
        }
    }

    @Test fun deletionDoesNotDuplicateAnExistingRequest() = runBlocking {
        respond("[{\"id\":\"request-1\",\"status\":\"pending\"}]")
        assertEquals("request-1", api.requestAccountDeletion(session, "user-1").id)
        assertEquals(1, server.requestCount)
        assertEquals("GET", server.takeRequest().method)
    }

    @Test fun deletionCreatesAuthenticatedAndroidPendingRequest() = runBlocking {
        respond("[]")
        respond("[{\"id\":\"request-1\",\"status\":\"pending\"}]")
        assertEquals("pending", api.requestAccountDeletion(session, "user-1").status)
        server.takeRequest()
        val request = server.takeRequest()
        val body = Json.parseToJsonElement(request.body.readUtf8()).jsonObject
        assertEquals("POST", request.method)
        assertEquals("user-1", body["user_id"]!!.jsonPrimitive.content)
        assertEquals("android", body["platform"]!!.jsonPrimitive.content)
    }

    @Test fun deletionReadFailureDoesNotCreateAnUntrackedRequest() = runBlocking {
        respond("permission denied", 403)
        assertTrue(runCatching { api.requestAccountDeletion(session, "user-1") }.isFailure)
        assertEquals(1, server.requestCount)
    }

    @Test fun pushUnregistrationIsScopedToUserAndInstallation() = runBlocking {
        respond("")
        api.unregisterPushToken(session, "user-1", "device-1")
        val request = server.takeRequest()
        assertEquals("PATCH", request.method)
        assertEquals("eq.user-1", request.requestUrl!!.queryParameter("user_id"))
        assertEquals("eq.device-1", request.requestUrl!!.queryParameter("token"))
        assertEquals("{\"enabled\":false}", request.body.readUtf8())
    }

    @Test fun timezonePreservesIntentionalNewYorkSelection() {
        assertEquals("America/New_York", profileTimezone("America/New_York", "America/Chicago"))
        assertEquals("America/Chicago", profileTimezone(null, "America/Chicago"))
        assertEquals("America/Chicago", profileTimezone(" ", "America/Chicago"))
    }

    @Test fun vaultHonorsTierAndActiveStatus() {
        val proFile = TemplateItem("file", tierRequired = "pro")
        fun member(tier: String, status: String = "active") = Subscription("sub", "user", tier, status)
        assertFalse(canAccessTemplate(member("essentials"), false, proFile))
        assertTrue(canAccessTemplate(member("pro"), false, proFile))
        assertTrue(canAccessTemplate(member("elite"), false, proFile))
        assertFalse(canAccessTemplate(member("elite", "canceled"), false, proFile))
        assertFalse(canAccessTemplate(null, false, proFile))
        assertTrue(canAccessTemplate(null, true, proFile))
        assertFalse(canAccessTemplate(member("pro"), false, proFile.copy(isElite = true)))
        assertFalse(canAccessTemplate(member("elite"), false, proFile.copy(tierRequired = "unknown")))
    }

    @Test fun storageFilenamesCannotBecomeQueryStringsOrFragments() = runBlocking {
        respond("{\"signedURL\":\"/object/sign/templates/file?token=test\"}")
        val signed = api.signedStorageUrl(session, "templates", "folder/Plan #1?final.pdf")
        val request = server.takeRequest()
        assertEquals("/storage/v1/object/sign/templates/folder/Plan%20%231%3Ffinal.pdf", request.path)
        assertEquals(null, request.requestUrl!!.query)
        assertEquals(server.url("/storage/v1/object/sign/templates/file?token=test").toString(), signed)
    }

    @Test fun storageRejectsExternalUrlsAndTraversalBeforeSendingCredentials() = runBlocking {
        listOf("https://example.com/file", "../file", "folder/../file", "").forEach { path ->
            assertTrue(runCatching { api.signedStorageUrl(session, "templates", path) }.isFailure)
        }
        assertEquals(0, server.requestCount)
    }

    @Test fun voiceSplitsLongResponsesIntoBoundedOrderedRequests() = runBlocking {
        val text = (1..220).joinToString(" ") { "Step$it." }
        repeat(10) { respond("{\"ok\":true,\"audio_base64\":\"YWJj\"}") }
        val audio = api.synthesizeRavenVoiceChunks(session, text)
        assertTrue(audio.size > 1)
        val chunks = audio.map {
            assertArrayEquals("abc".toByteArray(), it)
            Json.parseToJsonElement(server.takeRequest().body.readUtf8()).jsonObject["data"]!!.jsonObject["text"]!!.jsonPrimitive.content
        }
        assertTrue(chunks.all { it.length <= 650 })
        assertEquals(text, chunks.joinToString(" "))
    }

    @Test fun voicePreservesProviderErrorWithoutFallbackOrAudio() = runBlocking {
        respond("""{"ok":false,"error":"Raven voice is temporarily unavailable."}""")
        val error = runCatching { api.synthesizeRavenVoiceChunks(session, "Hello.") }.exceptionOrNull()
        assertEquals("Raven voice is temporarily unavailable.", error?.message)
        assertEquals(1, server.requestCount)
    }

    @Test fun homeRetainsAllFourCentersAndTheirOwnMetrics() = runBlocking {
        respond((1..4).joinToString(prefix = "[", postfix = "]") {
            """{"id":"center-$it","name":"Center $it","enrollment_size":${it * 10},"capacity":${it * 20}}"""
        })
        val centers = api.getCenters(session, "user-1")
        assertEquals(4, centers.size)
        centers.forEachIndexed { index, center ->
            assertEquals("center-${index + 1}", center.id)
            assertEquals((index + 1) * 10, center.enrollmentSize)
            assertEquals((index + 1) * 20, center.capacity)
        }
        assertEquals("eq.user-1", server.takeRequest().requestUrl!!.queryParameter("user_id"))
    }

    @Test fun homeHandlesNoSavedCenters() = runBlocking {
        respond("[]")
        assertTrue(api.getCenters(session, "user-1").isEmpty())
    }

    @Test fun voiceRejectsEmptyAudio() = runBlocking {
        respond("""{"ok":true,"audio_base64":""}""")
        val error = runCatching { api.synthesizeRavenVoiceChunks(session, "Hello.") }.exceptionOrNull()
        assertEquals("Raven voice returned empty audio. Please retry.", error?.message)
    }

    @Test fun voiceRejectsMalformedAudio() = runBlocking {
        respond("""{"ok":true,"audio_base64":"%%%"}""")
        val error = runCatching { api.synthesizeRavenVoiceChunks(session, "Hello.") }.exceptionOrNull()
        assertEquals("Raven voice returned invalid audio. Please retry.", error?.message)
    }

    @Test fun voiceRejectsMissingAudio() = runBlocking {
        respond("""{"ok":true}""")
        assertEquals("No Raven audio returned", runCatching { api.synthesizeRavenVoiceChunks(session, "Hello.") }.exceptionOrNull()?.message)
    }

    @Test fun voiceRetryCanSucceedAfterProviderFailure() = runBlocking {
        respond("""{"ok":false,"error":"Raven voice is temporarily unavailable."}""")
        respond("""{"ok":true,"audio_base64":"YWJj"}""")
        assertTrue(runCatching { api.synthesizeRavenVoiceChunks(session, "Hello.") }.isFailure)
        assertArrayEquals("abc".toByteArray(), api.synthesizeRavenVoiceChunks(session, "Hello.").single())
    }

    @Test fun canceledVoiceRequestCannotBecomeCurrentAgain() {
        val tracker = VoiceRequestTracker()
        val old = tracker.begin()
        assertTrue(tracker.isCurrent(old))
        tracker.cancel()
        assertFalse(tracker.isCurrent(old))
        val retry = tracker.begin()
        assertTrue(tracker.isCurrent(retry))
        assertFalse(tracker.isCurrent(old))
    }

    @Test fun replacedVoiceRequestCannotOverrideNewPlayback() {
        val tracker = VoiceRequestTracker()
        val old = tracker.begin()
        val new = tracker.begin()
        assertFalse(tracker.isCurrent(old))
        assertTrue(tracker.isCurrent(new))
        tracker.cancel()
        assertFalse(tracker.isCurrent(new))
    }
}
