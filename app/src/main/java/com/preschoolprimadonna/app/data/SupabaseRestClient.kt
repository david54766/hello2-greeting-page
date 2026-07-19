package com.preschoolprimadonna.app.data

import com.preschoolprimadonna.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.decodeFromJsonElement
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.HttpUrl.Companion.toHttpUrl
import java.io.InterruptedIOException
import java.net.SocketTimeoutException
import java.util.Base64
import java.util.concurrent.TimeUnit

@Serializable
private data class OptionalAuthSession(
    @SerialName("access_token") val accessToken: String? = null,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
    @SerialName("token_type") val tokenType: String? = null,
    val user: AuthUser? = null
) {
    fun toAuthSessionOrNull(): AuthSession? {
        return accessToken?.let {
            AuthSession(
                accessToken = it,
                refreshToken = refreshToken,
                expiresIn = expiresIn,
                tokenType = tokenType,
                user = user
            )
        }
    }
}

class SupabaseRestClient {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .callTimeout(120, TimeUnit.SECONDS)
        .build()
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }
    private val serverFunctionCodec = ServerFunctionCodec(json)
    private val jsonMediaType = "application/json".toMediaType()

    private object ServerFunctions {
        const val RUN_COACHING = "a4a21ef578913f4db5a54cf2f4ae7347a8fa87028bb88e27156a7c4fe191b62c"
        const val TODAY_RECOMMENDATION = "888a6cf6656e518e13491e5818c5c55374e34b0a70f191aa06b96da73e50d29f"
        const val LIST_THREADS = "ed759d5fefb644e4e280c13ac67a9ef31842917a7b657b3fdb5fe0e03e18a69c"
        const val CREATE_THREAD = "c060c6d01170e66edff932b8eab3bb5093309c354a251f1c3dde1b262fdeda55"
        const val GET_THREAD = "2708943f773c3c19f5379f9fc764ba17f7fc97cd69787eac0d6cfc3508575816"
        const val REPLY_THREAD = "217400c3f492d5f842bc0b88b8f44f89fba1b80d8e3232ccb1fd184625ec4938"
        const val DELETE_THREAD = "490af8a295d7a209cd6be9304ca3139a49654b9e1714e63d5db1d9a3409c83af"
    }

    suspend fun signIn(email: String, password: String): AuthSession {
        val body = JsonObject(
            mapOf(
                "email" to JsonPrimitive(email),
                "password" to JsonPrimitive(password)
            )
        )
        val request = baseRequest("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=password")
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()
        return json.decodeFromString(execute(request))
    }

    suspend fun signUp(email: String, password: String, fullName: String, redirectTo: String): AuthSession? {
        val body = buildJsonObject {
            put("email", email)
            put("password", password)
            put(
                "data",
                buildJsonObject {
                    put("full_name", fullName.trim())
                    put("intended_tier", "essentials")
                }
            )
        }
        val url = "${BuildConfig.SUPABASE_URL}/auth/v1/signup".toHttpUrl().newBuilder()
            .apply {
                redirectTo.takeIf { it.isNotBlank() }?.let { addQueryParameter("redirect_to", it) }
            }
            .build()
        val request = baseRequest(url.toString())
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()
        return json.decodeFromString<OptionalAuthSession>(execute(request)).toAuthSessionOrNull()
    }

    suspend fun requestPasswordReset(email: String, redirectTo: String) {
        val body = buildJsonObject {
            put("email", email)
        }
        val url = "${BuildConfig.SUPABASE_URL}/auth/v1/recover".toHttpUrl().newBuilder()
            .apply {
                redirectTo.takeIf { it.isNotBlank() }?.let { addQueryParameter("redirect_to", it) }
            }
            .build()
        val request = baseRequest(url.toString())
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()
        execute(request)
    }

    suspend fun updatePassword(session: AuthSession, password: String) {
        val body = buildJsonObject {
            put("password", password)
        }
        val request = baseRequest("${BuildConfig.SUPABASE_URL}/auth/v1/user", session)
            .put(body.toString().toRequestBody(jsonMediaType))
            .build()
        execute(request)
    }

    suspend fun refresh(refreshToken: String): AuthSession {
        val body = JsonObject(mapOf("refresh_token" to JsonPrimitive(refreshToken)))
        val request = baseRequest("${BuildConfig.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token")
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()
        return json.decodeFromString(execute(request))
    }

    suspend fun getCurrentUser(session: AuthSession): AuthUser {
        val request = baseRequest("${BuildConfig.SUPABASE_URL}/auth/v1/user", session)
            .get()
            .build()
        return json.decodeFromString(execute(request))
    }

    suspend fun getProfile(session: AuthSession, userId: String): Profile? {
        return select<Profile>(
            session = session,
            table = "profiles",
            select = "*",
            params = mapOf("id" to "eq.$userId"),
            limit = 1
        ).firstOrNull()
    }

    suspend fun getSubscription(session: AuthSession, userId: String): Subscription? {
        return select<Subscription>(
            session = session,
            table = "subscriptions",
            select = "*",
            params = mapOf("user_id" to "eq.$userId"),
            limit = 1
        ).firstOrNull()
    }

    suspend fun getNotificationPreferences(session: AuthSession, userId: String): NotificationPreferences? {
        return select<NotificationPreferences>(
            session = session,
            table = "notification_preferences",
            select = "*",
            params = mapOf("user_id" to "eq.$userId"),
            limit = 1
        ).firstOrNull()
    }

    suspend fun getCenters(session: AuthSession, userId: String): List<Center> {
        return select(
            session = session,
            table = "centers",
            select = "*",
            params = mapOf("user_id" to "eq.$userId", "order" to "created_at.desc")
        )
    }

    suspend fun getTemplates(session: AuthSession): List<TemplateItem> {
        return select(
            session = session,
            table = "templates",
            select = "*",
            params = mapOf("order" to "category.asc,created_at.desc")
        )
    }

    suspend fun getVideos(session: AuthSession): List<RavenVideo> {
        return select(
            session = session,
            table = "raven_videos",
            select = "id,title,description,storage_path,thumbnail_path,duration_seconds,sort_order,category",
            params = mapOf(
                "published" to "eq.true",
                "order" to "category.asc,sort_order.asc"
            )
        )
    }

    suspend fun getTodayRecommendation(session: AuthSession): String? {
        val result = serverFunction(session, ServerFunctions.TODAY_RECOMMENDATION)
        result.throwIfServerResultError()
        return result["recommendation"]?.jsonPrimitive?.contentOrNull
    }

    suspend fun getCoachingSessions(session: AuthSession, userId: String): List<CoachingSession> {
        return select(
            session = session,
            table = "coaching_sessions",
            select = "*",
            params = mapOf(
                "user_id" to "eq.$userId",
                "order" to "created_at.desc",
                "limit" to "10"
            )
        )
    }

    suspend fun runCoaching(session: AuthSession, mode: String, prompt: String): JsonObject {
        val payload = buildJsonObject {
            put("mode", mode.lowercase())
            put("prompt", prompt.trim())
        }
        val result = try {
            mobileApi(session, "run_coaching", payload)
        } catch (error: IllegalStateException) {
            if (error.canFallbackToWebCoaching()) {
                serverFunction(session, ServerFunctions.RUN_COACHING, method = "POST", data = payload)
            } else {
                throw error
            }
        }
        result.throwIfServerResultError()
        return result
    }

    suspend fun synthesizeRavenVoiceChunks(session: AuthSession, text: String): List<ByteArray> {
        val chunks = ravenVoicePayloadChunks(text)
        if (chunks.isEmpty()) throw IllegalStateException("This session does not have a saved response to play.")
        return chunks.mapIndexed { index, chunk ->
            synthesizeRavenVoiceChunk(session, chunk, index + 1, chunks.size)
        }
    }

    private suspend fun synthesizeRavenVoiceChunk(
        session: AuthSession,
        text: String,
        part: Int,
        totalParts: Int
    ): ByteArray {
        return try {
            synthesizeRavenVoiceMobile(session, text)
        } catch (error: SocketTimeoutException) {
            throw ravenVoiceTimeout(part, totalParts)
        } catch (error: InterruptedIOException) {
            if (error.message.orEmpty().contains("timeout", ignoreCase = true)) {
                throw ravenVoiceTimeout(part, totalParts)
            }
            throw error
        } catch (error: IllegalStateException) {
            if (error.canFallbackToWebVoice()) {
                try {
                    synthesizeRavenVoiceWebStream(session, text)
                } catch (timeout: SocketTimeoutException) {
                    throw ravenVoiceTimeout(part, totalParts)
                } catch (interrupted: InterruptedIOException) {
                    if (interrupted.message.orEmpty().contains("timeout", ignoreCase = true)) {
                        throw ravenVoiceTimeout(part, totalParts)
                    }
                    throw interrupted
                }
            } else {
                throw error
            }
        }
    }

    private suspend fun synthesizeRavenVoiceMobile(session: AuthSession, text: String): ByteArray {
        val result = mobileApi(session, "synthesize_raven_voice", buildJsonObject {
            put("text", text)
        })
        val audio = result["audio_base64"]?.jsonPrimitive?.contentOrNull
            ?: throw IllegalStateException("No Raven audio returned")
        return Base64.getDecoder().decode(audio)
    }

    private suspend fun synthesizeRavenVoiceWebStream(session: AuthSession, text: String): ByteArray {
        val request = Request.Builder()
            .url("${BuildConfig.WEB_APP_URL.trimEnd('/')}/api/tts-stream")
            .header("Authorization", "Bearer ${session.accessToken}")
            .header("Content-Type", "application/json")
            .header("accept", "audio/mpeg")
            .post(buildJsonObject {
                put("text", text)
            }.toString().toRequestBody(jsonMediaType))
            .build()
        return executeBytes(request)
    }

    suspend fun deleteCoachingSession(session: AuthSession, userId: String, sessionId: String) {
        val url = "${BuildConfig.SUPABASE_URL}/rest/v1/coaching_sessions".toHttpUrl().newBuilder()
            .addQueryParameter("id", "eq.$sessionId")
            .addQueryParameter("user_id", "eq.$userId")
            .build()
        val request = baseRequest(url.toString(), session)
            .delete()
            .build()
        execute(request)
    }

    suspend fun getEliteThreads(session: AuthSession): List<EliteThread> {
        val result = mobileApiOrServerFunction(session, "list_elite_threads", ServerFunctions.LIST_THREADS)
        val threads = result["threads"]?.jsonArray ?: JsonArray(emptyList())
        return json.decodeFromJsonElement(threads)
    }

    suspend fun createEliteThread(session: AuthSession, title: String, body: String) {
        val payload = buildJsonObject {
            put("title", title.trim())
            put("body", body.trim())
            put("image_urls", JsonArray(emptyList()))
        }
        mobileApiOrServerFunction(session, "create_elite_thread", ServerFunctions.CREATE_THREAD, method = "POST", data = payload)
            .throwIfServerResultError()
    }

    suspend fun getEliteThread(session: AuthSession, threadId: String): EliteThreadDetail {
        val payload = buildJsonObject { put("id", threadId) }
        val result = mobileApiOrServerFunction(session, "get_elite_thread", ServerFunctions.GET_THREAD, data = payload)
        val thread = result["thread"] ?: error("Conversation was not found")
        val replies = result["replies"]?.jsonArray ?: JsonArray(emptyList())
        return EliteThreadDetail(
            thread = json.decodeFromJsonElement(thread),
            replies = json.decodeFromJsonElement(replies)
        )
    }

    suspend fun replyEliteThread(session: AuthSession, threadId: String, body: String) {
        val payload = buildJsonObject {
            put("thread_id", threadId)
            put("body", body.trim())
            put("image_urls", JsonArray(emptyList()))
        }
        mobileApiOrServerFunction(session, "reply_elite_thread", ServerFunctions.REPLY_THREAD, method = "POST", data = payload)
            .throwIfServerResultError()
    }

    suspend fun deleteEliteThread(session: AuthSession, threadId: String) {
        val payload = buildJsonObject { put("id", threadId) }
        mobileApiOrServerFunction(session, "delete_elite_thread", ServerFunctions.DELETE_THREAD, method = "POST", data = payload)
            .throwIfServerResultError()
    }

    suspend fun reportEliteContent(
        session: AuthSession,
        userId: String,
        threadId: String,
        replyId: String?,
        reason: String,
        details: String,
        reportedTitle: String?,
        reportedBody: String?,
        reportedAuthor: String?
    ) {
        val metadata = buildJsonObject {
            put("thread_id", threadId)
            put("target", if (replyId.isNullOrBlank()) "thread" else "reply")
            replyId?.takeIf { it.isNotBlank() }?.let { put("reply_id", it) }
            put("reason", reason.trim())
            put("details", details.trim())
            reportedTitle?.takeIf { it.isNotBlank() }?.let { put("reported_title", it.trim().take(240)) }
            reportedBody?.takeIf { it.isNotBlank() }?.let { put("reported_body", it.trim().take(1600)) }
            reportedAuthor?.takeIf { it.isNotBlank() }?.let { put("reported_author", it.trim().take(160)) }
            put("source", "android")
        }
        val body = buildJsonObject {
            put("user_id", userId)
            put("event_type", "elite_conversation_report")
            put("metadata", metadata)
        }
        val request = baseRequest("${BuildConfig.SUPABASE_URL}/rest/v1/usage_events", session)
            .post(body.toString().toRequestBody(jsonMediaType))
            .header("Prefer", "return=minimal")
            .build()
        execute(request)
    }

    suspend fun registerPushToken(
        session: AuthSession,
        userId: String,
        token: String,
        appVersion: String,
        deviceName: String
    ) {
        val body = buildJsonObject {
            put("user_id", userId)
            put("token", token)
            put("platform", "android")
            put("enabled", true)
            put("app_version", appVersion)
            put("device_model", deviceName)
        }
        val url = "${BuildConfig.SUPABASE_URL}/rest/v1/push_tokens".toHttpUrl().newBuilder()
            .addQueryParameter("on_conflict", "user_id,token")
            .build()
        val request = baseRequest(url.toString(), session)
            .post(body.toString().toRequestBody(jsonMediaType))
            .header("Prefer", "resolution=merge-duplicates,return=minimal")
            .build()
        execute(request)
    }

    suspend fun saveNotificationPreferences(
        session: AuthSession,
        userId: String,
        preferences: NotificationPreferences
    ) {
        val body = buildJsonObject {
            put("user_id", userId)
            put("email_brief", preferences.emailBrief)
            put("elite_reminders", preferences.eliteReminders)
            put("ai_product_updates", preferences.aiProductUpdates)
            put("push_alerts", preferences.pushAlerts)
        }
        val url = "${BuildConfig.SUPABASE_URL}/rest/v1/notification_preferences".toHttpUrl().newBuilder()
            .addQueryParameter("on_conflict", "user_id")
            .build()
        val request = baseRequest(url.toString(), session)
            .post(body.toString().toRequestBody(jsonMediaType))
            .header("Prefer", "resolution=merge-duplicates,return=minimal")
            .build()
        execute(request)
    }

    suspend fun updateProfile(
        session: AuthSession,
        userId: String,
        fullName: String,
        businessName: String,
        state: String,
        timezone: String
    ): Profile? {
        val body = JsonObject(
            mapOf(
                "full_name" to JsonPrimitive(fullName),
                "business_name" to JsonPrimitive(businessName),
                "state" to JsonPrimitive(state),
                "timezone" to JsonPrimitive(timezone)
            )
        )
        val url = "${BuildConfig.SUPABASE_URL}/rest/v1/profiles".toHttpUrl().newBuilder()
            .addQueryParameter("id", "eq.$userId")
            .build()
        val request = baseRequest(url.toString(), session)
            .patch(body.toString().toRequestBody(jsonMediaType))
            .header("Prefer", "return=representation")
            .build()
        return json.decodeFromString<List<Profile>>(execute(request)).firstOrNull()
    }

    suspend fun addCenter(session: AuthSession, userId: String, center: Center): Center? {
        val body = centerBody(center, includeUserId = userId)
        val request = baseRequest("${BuildConfig.SUPABASE_URL}/rest/v1/centers", session)
            .post(body.toString().toRequestBody(jsonMediaType))
            .header("Prefer", "return=representation")
            .build()
        return json.decodeFromString<List<Center>>(execute(request)).firstOrNull()
    }

    suspend fun updateCenter(session: AuthSession, userId: String, center: Center): Center? {
        val centerId = center.id ?: error("Center id is required")
        val url = "${BuildConfig.SUPABASE_URL}/rest/v1/centers".toHttpUrl().newBuilder()
            .addQueryParameter("id", "eq.$centerId")
            .addQueryParameter("user_id", "eq.$userId")
            .build()
        val request = baseRequest(url.toString(), session)
            .patch(centerBody(center).toString().toRequestBody(jsonMediaType))
            .header("Prefer", "return=representation")
            .build()
        return json.decodeFromString<List<Center>>(execute(request)).firstOrNull()
    }

    suspend fun deleteCenter(session: AuthSession, userId: String, centerId: String) {
        val url = "${BuildConfig.SUPABASE_URL}/rest/v1/centers".toHttpUrl().newBuilder()
            .addQueryParameter("id", "eq.$centerId")
            .addQueryParameter("user_id", "eq.$userId")
            .build()
        val request = baseRequest(url.toString(), session)
            .delete()
            .build()
        execute(request)
    }

    suspend fun signedStorageUrl(session: AuthSession, bucket: String, path: String): String {
        val safePath = path.trimStart('/')
        val body = JsonObject(mapOf("expiresIn" to JsonPrimitive(3600)))
        val request = baseRequest(
            "${BuildConfig.SUPABASE_URL}/storage/v1/object/sign/$bucket/$safePath",
            session
        )
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()
        val response = json.decodeFromString<JsonObject>(execute(request))
        val relative = response["signedURL"]?.jsonPrimitive?.contentOrNull
            ?: response["signedUrl"]?.jsonPrimitive?.contentOrNull
            ?: error("No signed URL returned")
        return if (relative.startsWith("http")) {
            relative
        } else if (relative.startsWith("/storage/v1/")) {
            "${BuildConfig.SUPABASE_URL}$relative"
        } else if (relative.startsWith("/object/")) {
            "${BuildConfig.SUPABASE_URL}/storage/v1$relative"
        } else {
            "${BuildConfig.SUPABASE_URL}$relative"
        }
    }

    private inline fun <reified T> decodeList(payload: String): List<T> {
        return json.decodeFromString(payload)
    }

    private fun centerBody(center: Center, includeUserId: String? = null): JsonObject {
        return buildJsonObject {
            includeUserId?.let { put("user_id", it) }
            put("name", center.name.orEmpty())
            put("city", center.city.orEmpty())
            put("state", center.state.orEmpty())
            put("ages_served", center.agesServed.orEmpty())
            put("enrollment_size", center.enrollmentSize ?: 0)
            put("capacity", center.capacity ?: 0)
            put("tuition_range", center.tuitionRange.orEmpty())
            put("staff_count", center.staffCount ?: 0)
            put("notes", center.notes.orEmpty())
        }
    }

    private fun ravenVoicePayloadChunks(text: String): List<String> {
        val clean = text.trim().replace(Regex("\\s+"), " ")
        if (clean.isBlank()) return emptyList()

        val chunks = mutableListOf<String>()
        val current = StringBuilder()
        clean.split(Regex("(?<=[.!?])\\s+"))
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .forEach { sentence ->
                if (sentence.length > RAVEN_VOICE_CHUNK_LIMIT) {
                    flushRavenChunk(current, chunks)
                    chunks += splitLongRavenVoicePiece(sentence)
                } else if (current.isEmpty()) {
                    current.append(sentence)
                } else if (current.length + 1 + sentence.length <= RAVEN_VOICE_CHUNK_LIMIT) {
                    current.append(' ').append(sentence)
                } else {
                    flushRavenChunk(current, chunks)
                    current.append(sentence)
                }
            }
        flushRavenChunk(current, chunks)
        return chunks

    }

    private fun splitLongRavenVoicePiece(text: String): List<String> {
        val chunks = mutableListOf<String>()
        val current = StringBuilder()
        text.split(" ")
            .map { it.trim() }
            .filter { it.isNotBlank() }
            .forEach { word ->
                if (word.length > RAVEN_VOICE_CHUNK_LIMIT) {
                    flushRavenChunk(current, chunks)
                    word.chunked(RAVEN_VOICE_CHUNK_LIMIT).forEach { chunks += it }
                } else if (current.isEmpty()) {
                    current.append(word)
                } else if (current.length + 1 + word.length <= RAVEN_VOICE_CHUNK_LIMIT) {
                    current.append(' ').append(word)
                } else {
                    flushRavenChunk(current, chunks)
                    current.append(word)
                }
            }
        flushRavenChunk(current, chunks)
        return chunks
    }

    private fun flushRavenChunk(current: StringBuilder, chunks: MutableList<String>) {
        val chunk = current.toString().trim()
        if (chunk.isNotBlank()) chunks += chunk
        current.clear()
    }

    private fun ravenVoiceTimeout(part: Int, totalParts: Int): IllegalStateException {
        return IllegalStateException("Raven voice timed out on part $part of $totalParts. Try again in a moment.")
    }

    private suspend inline fun <reified T> select(
        session: AuthSession,
        table: String,
        select: String,
        params: Map<String, String> = emptyMap(),
        limit: Int? = null
    ): List<T> {
        val builder = "${BuildConfig.SUPABASE_URL}/rest/v1/$table".toHttpUrl().newBuilder()
            .addQueryParameter("select", select)
        params.forEach { (key, value) -> builder.addQueryParameter(key, value) }
        limit?.let { builder.addQueryParameter("limit", it.toString()) }
        val request = baseRequest(builder.build().toString(), session)
            .get()
            .build()
        return decodeList(execute(request))
    }

    private suspend fun mobileApiOrServerFunction(
        session: AuthSession,
        action: String,
        fallbackHash: String,
        method: String = "GET",
        data: JsonElement? = null
    ): JsonObject {
        return try {
            mobileApi(session, action, data)
        } catch (error: IllegalStateException) {
            if (error.isMissingMobileApi()) {
                serverFunction(session, fallbackHash, method = method, data = data)
            } else {
                throw error
            }
        }
    }

    private suspend fun mobileApi(
        session: AuthSession,
        action: String,
        data: JsonElement? = null
    ): JsonObject {
        val body = buildJsonObject {
            put("action", action)
            data?.let { put("data", it) }
        }
        val request = baseRequest("${BuildConfig.SUPABASE_URL}/functions/v1/mobile-api", session)
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()
        val decoded = json.decodeFromString<JsonObject>(execute(request))
        val error = decoded["error"]?.jsonPrimitive?.contentOrNull
        if (!error.isNullOrBlank()) throw IllegalStateException(error)
        val ok = decoded["ok"]?.jsonPrimitive?.booleanOrNull
        if (ok == false) {
            val message = decoded["message"]?.jsonPrimitive?.contentOrNull ?: "Request failed"
            throw IllegalStateException(message)
        }
        return decoded
    }

    private suspend fun serverFunction(
        session: AuthSession,
        hash: String,
        method: String = "GET",
        data: JsonElement? = null
    ): JsonObject {
        val urlBuilder = "${BuildConfig.WEB_APP_URL.trimEnd('/')}/_serverFn/$hash".toHttpUrl().newBuilder()
        val requestBuilder = Request.Builder()
            .header("Authorization", "Bearer ${session.accessToken}")
            .header("accept", "application/json")
            .header("x-tsr-serverFn", "true")

        if (method == "GET" && data != null) {
            urlBuilder.addQueryParameter("payload", serverFunctionCodec.requestEnvelope(buildJsonObject {
                put("data", data)
            }))
        }

        requestBuilder.url(urlBuilder.build())
        if (method == "POST") {
            val envelope = serverFunctionCodec.requestEnvelope(buildJsonObject {
                data?.let { put("data", it) }
            })
            requestBuilder
                .post(envelope.toRequestBody(jsonMediaType))
                .header("content-type", "application/json")
        } else {
            requestBuilder.get()
        }

        val decoded = serverFunctionCodec.decode(execute(requestBuilder.build())).jsonObject
        val error = decoded["error"]
        if (error != null && error !is JsonNull) {
            val message = error.jsonObject["message"]?.jsonPrimitive?.contentOrNull ?: error.toString()
            throw IllegalStateException(message)
        }
        return decoded["result"]?.jsonObject ?: JsonObject(emptyMap())
    }

    private fun IllegalStateException.isMissingMobileApi(): Boolean {
        val payload = message.orEmpty().lowercase()
        return "function not found" in payload ||
            "function was not found" in payload ||
            "function_not_found" in payload ||
            "\"code\":\"not_found\"" in payload ||
            "\"code\":404" in payload ||
            "http 404" in payload
    }

    private fun IllegalStateException.canFallbackToWebCoaching(): Boolean {
        val payload = message.orEmpty().lowercase()
        return isMissingMobileApi() ||
            "ai strategy key is not configured" in payload
    }

    private fun IllegalStateException.canFallbackToWebVoice(): Boolean {
        val payload = message.orEmpty().lowercase()
        return isMissingMobileApi() ||
            "raven voice is not configured" in payload
    }

    private fun JsonObject.throwIfServerResultError() {
        val resultError = this["error"]
        if (resultError != null && resultError !is JsonNull) {
            val message = resultError.jsonPrimitive.contentOrNull ?: resultError.toString()
            if (message.isNotBlank()) throw IllegalStateException(message)
        }
        if (this["ok"]?.jsonPrimitive?.booleanOrNull == false) {
            val message = this["message"]?.jsonPrimitive?.contentOrNull ?: "Request failed"
            throw IllegalStateException(message)
        }
    }

    private fun baseRequest(url: String, session: AuthSession? = null): Request.Builder {
        val builder = Request.Builder()
            .url(url)
            .header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            .header("Content-Type", "application/json")
        session?.let { builder.header("Authorization", "Bearer ${it.accessToken}") }
        return builder
    }

    private suspend fun execute(request: Request): String = withContext(Dispatchers.IO) {
        client.newCall(request).execute().use { response ->
            val payload = response.body.string()
            if (!response.isSuccessful) {
                throw IllegalStateException(payload.ifBlank { "HTTP ${response.code}" })
            }
            payload
        }
    }

    private suspend fun executeBytes(request: Request): ByteArray = withContext(Dispatchers.IO) {
        client.newCall(request).execute().use { response ->
            val payload = response.body.bytes()
            if (!response.isSuccessful) {
                throw IllegalStateException(payload.toString(Charsets.UTF_8).ifBlank { "HTTP ${response.code}" })
            }
            payload
        }
    }

    private companion object {
        const val RAVEN_VOICE_CHUNK_LIMIT = 650
    }

}
