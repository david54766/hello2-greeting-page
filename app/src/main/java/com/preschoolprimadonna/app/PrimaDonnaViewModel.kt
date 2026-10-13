package com.preschoolprimadonna.app

import android.app.Application
import android.content.Context
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.preschoolprimadonna.app.data.AuthSession
import com.preschoolprimadonna.app.data.AccountDeletionRequest
import com.preschoolprimadonna.app.data.AuthUser
import com.preschoolprimadonna.app.data.Center
import com.preschoolprimadonna.app.data.CoachingSession
import com.preschoolprimadonna.app.data.DashboardData
import com.preschoolprimadonna.app.data.EliteReply
import com.preschoolprimadonna.app.data.EliteThread
import com.preschoolprimadonna.app.data.NotificationPreferences
import com.preschoolprimadonna.app.data.SessionStore
import com.preschoolprimadonna.app.data.SupabaseRestClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.async
import kotlinx.coroutines.launch
import kotlinx.coroutines.supervisorScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.File
import java.net.URLDecoder

data class PrimaDonnaState(
    val session: AuthSession? = null,
    val passwordRecoverySession: AuthSession? = null,
    val user: AuthUser? = null,
    val data: DashboardData = DashboardData(),
    val loading: Boolean = false,
    val saving: Boolean = false,
    val selectedEliteThread: EliteThread? = null,
    val eliteReplies: List<EliteReply> = emptyList(),
    val voiceLoadingSessionId: String? = null,
    val voicePlayingSessionId: String? = null,
    val deletionRequest: AccountDeletionRequest? = null,
    val deletionStatusLoaded: Boolean = false,
    val deletionStatusLoading: Boolean = false,
    val deletionError: String? = null,
    val error: String? = null,
    val message: String? = null
)

class PrimaDonnaViewModel(application: Application) : AndroidViewModel(application) {
    private val api = SupabaseRestClient()
    private val sessionStore by lazy { SessionStore(application) }
    private val _state = MutableStateFlow(PrimaDonnaState(loading = true))
    private var voicePlayer: MediaPlayer? = null
    private val accountScope = CoroutineScope(viewModelScope.coroutineContext + SupervisorJob(viewModelScope.coroutineContext[Job]))
    private val refreshMutex = Mutex()
    private var voiceJob: Job? = null
    private var pushToken: String? = null

    val state: StateFlow<PrimaDonnaState> = _state

    init {
        accountScope.launch {
            val storedSession = runCatching { readStoredSession() }.getOrElse { error ->
                if (error is CancellationException) throw error
                _state.value = PrimaDonnaState(error = "Saved sign-in could not be read. Please sign in again.")
                return@launch
            }
            if (storedSession == null) {
                _state.value = PrimaDonnaState(loading = false)
            } else {
                _state.value = PrimaDonnaState(session = storedSession, loading = true)
                runCatching { loadDataWithRefresh(storedSession) }
                    .onFailure { throwable ->
                        if (throwable is CancellationException) throw throwable
                        _state.update {
                            it.copy(loading = false, saving = false, error = throwable.readableMessage())
                        }
                    }
            }
        }
    }

    fun signIn(email: String, password: String) {
        accountScope.launch {
            runBlockingAction {
                val session = api.signIn(email.trim(), password)
                saveStoredSession(session)
                _state.update {
                    it.copy(
                        session = session,
                        data = DashboardData(),
                        user = null,
                        deletionRequest = null,
                        deletionStatusLoaded = false,
                        passwordRecoverySession = null,
                        error = null,
                        message = "Welcome back."
                    )
                }
                loadData(session)
            }
        }
    }

    fun signUp(fullName: String, email: String, password: String) {
        accountScope.launch {
            runBlockingAction {
                val session = api.signUp(
                    email = email.trim(),
                    password = password,
                    fullName = fullName,
                    redirectTo = BuildConfig.AUTH_REDIRECT_URL
                )
                if (session == null) {
                    _state.update {
                        it.copy(
                            loading = false,
                            error = null,
                            message = "Check your email to confirm your account."
                        )
                    }
                } else {
                    saveStoredSession(session)
                    _state.update {
                        it.copy(
                            session = session,
                            passwordRecoverySession = null,
                            error = null,
                            message = "Account created."
                        )
                    }
                    loadData(session)
                }
            }
        }
    }

    fun requestPasswordReset(email: String) {
        accountScope.launch {
            runBlockingAction {
                api.requestPasswordReset(email.trim(), BuildConfig.AUTH_REDIRECT_URL)
                _state.update {
                    it.copy(
                        loading = false,
                        error = null,
                        message = "Password reset email sent if that account exists."
                    )
                }
            }
        }
    }

    fun completePasswordReset(password: String) {
        val recoverySession = _state.value.passwordRecoverySession ?: return
        accountScope.launch {
            runBlockingAction {
                api.updatePassword(recoverySession, password)
                saveStoredSession(recoverySession)
                _state.update {
                    it.copy(
                        session = recoverySession,
                        passwordRecoverySession = null,
                        error = null,
                        message = "Password updated."
                    )
                }
                loadData(recoverySession)
            }
        }
    }

    fun handleAuthRedirect(uri: Uri) {
        if (uri.scheme != "preschoolprimadonna" || uri.host != "auth-callback") return
        accountScope.coroutineContext.cancelChildren()
        stopRavenVoice()
        _state.value = PrimaDonnaState()
        val params = uri.authParams()
        val redirectError = params["error_description"] ?: params["error"]
        if (!redirectError.isNullOrBlank()) {
            _state.update { it.copy(error = redirectError, loading = false) }
            return
        }
        val accessToken = params["access_token"] ?: return
        val session = AuthSession(
            accessToken = accessToken,
            refreshToken = params["refresh_token"],
            expiresIn = params["expires_in"]?.toLongOrNull(),
            tokenType = params["token_type"] ?: "bearer"
        )
        if (params["type"] == "recovery") {
            viewModelScope.launch(Dispatchers.IO) {
                sessionStore.clear()
            }
            _state.update {
                it.copy(
                    data = DashboardData(), user = null,
                    passwordRecoverySession = session,
                    session = null,
                    loading = false,
                    error = null,
                    message = "Enter a new password."
                )
            }
            return
        }
        accountScope.launch {
            runBlockingAction {
                saveStoredSession(session)
                _state.update {
                    it.copy(
                        session = session,
                        data = DashboardData(),
                        user = null,
                        deletionRequest = null,
                        deletionStatusLoaded = false,
                        passwordRecoverySession = null,
                        error = null,
                        message = "Welcome back."
                    )
                }
                loadDataWithRefresh(session)
            }
        }
    }

    fun signOut() {
        val session = _state.value.session
        val userId = _state.value.user?.id ?: session?.user?.id
        val token = pushToken ?: sessionStore.pushToken()
        accountScope.coroutineContext.cancelChildren()
        releaseRavenPlayer()
        pushToken = null
        _state.value = PrimaDonnaState(loading = true)
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                sessionStore.clear()
                getApplication<Application>().cacheDir.listFiles()
                    ?.filter { it.name.startsWith("raven_voice_") }?.forEach { it.delete() }
            }
            // Invalidate this installation's token even when the backend is unreachable.
            withTimeoutOrNull(8000) {
                kotlinx.coroutines.suspendCancellableCoroutine<Unit> { continuation ->
                    com.google.firebase.messaging.FirebaseMessaging.getInstance().deleteToken()
                        .addOnCompleteListener {
                            if (continuation.isActive) continuation.resumeWith(Result.success(Unit))
                        }
                }
            }
            if (session != null && userId != null && token != null) {
                withTimeoutOrNull(8000) { runCatching { api.unregisterPushToken(session, userId, token) } }
            }
            _state.value = PrimaDonnaState()
        }
    }

    fun loadDeletionStatus() {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        if (_state.value.deletionStatusLoading) return
        accountScope.launch {
            _state.update { it.copy(deletionStatusLoading = true, deletionError = null) }
            runCatching { withRefreshRetry(session) { api.getAccountDeletionRequest(it, userId) } }
                .onSuccess { request ->
                    _state.update { it.copy(deletionRequest = request, deletionStatusLoaded = true, deletionStatusLoading = false) }
                }.onFailure { error ->
                    if (error is CancellationException) throw error
                    _state.update { it.copy(deletionStatusLoading = false, deletionError = error.readableMessage()) }
                }
        }
    }

    fun requestAccountDeletion() {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        if (_state.value.saving || !_state.value.deletionStatusLoaded || _state.value.deletionRequest != null) return
        accountScope.launch {
            runSavingAction("Account deletion requested.") {
                val request = withRefreshRetry(session) { api.requestAccountDeletion(it, userId) }
                _state.update { it.copy(deletionRequest = request, deletionStatusLoaded = true) }
            }
        }
    }

    fun setEliteBlocked(userId: String, blocked: Boolean) {
        val session = _state.value.session ?: return
        if (_state.value.saving || userId == _state.value.user?.id) return
        accountScope.launch {
            runSavingAction(if (blocked) "Member blocked." else "Member unblocked.") {
                withRefreshRetry(session) { activeSession ->
                    api.setEliteBlocked(activeSession, userId, blocked)
                    _state.update { it.copy(selectedEliteThread = null, eliteReplies = emptyList()) }
                    loadData(activeSession)
                }
            }
        }
    }

    fun refresh() {
        val session = _state.value.session ?: return
        accountScope.launch {
            runBlockingAction {
                loadDataWithRefresh(session)
            }
        }
    }

    fun saveProfile(fullName: String, businessName: String, state: String, timezone: String) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        accountScope.launch {
            runSavingAction("Profile saved.") {
                withRefreshRetry(session) { activeSession ->
                    api.updateProfile(activeSession, userId, fullName, businessName, state, timezone)
                    loadData(activeSession)
                }
            }
        }
    }

    fun saveNotificationPreferences(preferences: NotificationPreferences) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        accountScope.launch {
            runSavingAction("Notification preferences saved.") {
                withRefreshRetry(session) { activeSession ->
                    api.saveNotificationPreferences(activeSession, userId, preferences)
                    sessionStore.savePushAlerts(preferences.pushAlerts)
                    loadData(activeSession)
                }
            }
        }
    }

    fun acceptLegalTerms() {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: session.user?.id ?: return
        accountScope.launch {
            runSavingAction("Terms accepted.") {
                withRefreshRetry(session) { activeSession ->
                    api.acceptLegalTerms(activeSession, userId)
                    loadData(activeSession)
                }
            }
        }
    }

    fun completeOnboarding(
        fullName: String,
        businessName: String,
        state: String,
        timezone: String,
        center: Center
    ) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        accountScope.launch {
            runSavingAction("Setup saved.") {
                withRefreshRetry(session) { activeSession ->
                    api.updateProfile(activeSession, userId, fullName, businessName, state, timezone)
                    api.addCenter(activeSession, userId, center)
                    loadData(activeSession)
                }
            }
        }
    }

    fun addCenter(center: Center) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        accountScope.launch {
            runSavingAction("Center added.") {
                withRefreshRetry(session) { activeSession ->
                    api.addCenter(activeSession, userId, center)
                    loadData(activeSession)
                }
            }
        }
    }

    fun updateCenter(center: Center) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        if (center.id.isNullOrBlank()) return
        accountScope.launch {
            runSavingAction("Center updated.") {
                withRefreshRetry(session) { activeSession ->
                    api.updateCenter(activeSession, userId, center)
                    loadData(activeSession)
                }
            }
        }
    }

    fun deleteCenter(centerId: String) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        if (centerId.isBlank()) return
        accountScope.launch {
            runSavingAction("Center deleted.") {
                withRefreshRetry(session) { activeSession ->
                    api.deleteCenter(activeSession, userId, centerId)
                    loadData(activeSession)
                }
            }
        }
    }

    fun submitCoachingPrompt(mode: String, prompt: String) {
        val cleanPrompt = prompt.trim()
        if (_state.value.saving || cleanPrompt.isBlank()) {
            return
        }
        if (cleanPrompt.length > 4000) {
            _state.update { it.copy(error = "Keep your question within 4,000 characters.") }
            return
        }
        val session = _state.value.session
        if (session == null) {
            _state.update { it.copy(error = "Please sign in again before running a strategy session.", message = null) }
            return
        }
        accountScope.launch {
            runSavingAction("Strategy generated.") {
                withRefreshRetry(session) { api.runCoaching(it, mode, cleanPrompt) }
                loadDataWithRefresh(_state.value.session ?: return@runSavingAction)
            }
        }
    }

    fun deleteCoachingSession(sessionId: String) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        accountScope.launch {
            runSavingAction("Session deleted.") {
                withRefreshRetry(session) { activeSession ->
                    api.deleteCoachingSession(activeSession, userId, sessionId)
                    loadData(activeSession)
                }
            }
        }
    }

    fun playRavenVoice(session: CoachingSession) {
        val authSession = _state.value.session
        if (authSession == null) {
            _state.update { it.copy(error = "Please sign in again before playing Raven voice.", message = null) }
            return
        }
        stopRavenVoice()
        val text = session.ravenVoiceText()
        if (text.isBlank()) {
            _state.update { it.copy(error = "This session does not have a saved response to play.", message = null) }
            return
        }
        voiceJob = accountScope.launch {
            _state.update {
                it.copy(
                    voiceLoadingSessionId = session.id,
                    error = null,
                    message = null
                )
            }
            runCatching {
                val audioChunks = withRefreshRetry(authSession) { activeSession ->
                    api.synthesizeRavenVoiceChunks(activeSession, text)
                }
                val files = withContext(Dispatchers.IO) {
                    audioChunks.mapIndexed { index, audio ->
                        File(getApplication<Application>().cacheDir, "raven_voice_${session.id}_$index.mp3").apply {
                            writeBytes(audio)
                        }
                    }
                }
                startRavenPlayback(session.id, files)
            }.onFailure { throwable ->
                        if (throwable is CancellationException) throw throwable
                _state.update {
                    it.copy(
                        voiceLoadingSessionId = null,
                        voicePlayingSessionId = null,
                        error = throwable.readableMessage()
                    )
                }
            }
        }
    }

    fun stopRavenVoice() {
        voiceJob?.cancel()
        voiceJob = null
        releaseRavenPlayer()
        _state.update { it.copy(voiceLoadingSessionId = null, voicePlayingSessionId = null) }
    }

    fun createEliteThread(title: String, body: String, imageUrls: List<String> = emptyList(), onSuccess: () -> Unit = {}) {
        val session = _state.value.session ?: return
        accountScope.launch {
            runSavingAction("Conversation posted.") {
                withRefreshRetry(session) { api.createEliteThread(it, title, body, imageUrls) }
                onSuccess()
                loadDataWithRefresh(_state.value.session ?: return@runSavingAction)
            }
        }
    }

    fun openEliteThread(threadId: String) {
        val session = _state.value.session ?: return
        accountScope.launch {
            _state.update { it.copy(saving = true, error = null, message = null) }
            runCatching {
                val detail = withRefreshRetry(session) { activeSession ->
                    api.getEliteThread(activeSession, threadId)
                }
                _state.update {
                    it.copy(
                        saving = false,
                        selectedEliteThread = detail.thread,
                        eliteReplies = detail.replies,
                        error = null
                    )
                }
            }.onFailure { throwable ->
                        if (throwable is CancellationException) throw throwable
                _state.update {
                    it.copy(saving = false, error = throwable.readableMessage())
                }
            }
        }
    }

    fun closeEliteThread() {
        _state.update { it.copy(selectedEliteThread = null, eliteReplies = emptyList(), error = null) }
    }

    fun replyEliteThread(threadId: String, body: String, imageUrls: List<String> = emptyList(), onSuccess: () -> Unit = {}) {
        val session = _state.value.session ?: return
        accountScope.launch {
            runSavingAction("Reply posted.") {
                withRefreshRetry(session) { api.replyEliteThread(it, threadId, body, imageUrls) }
                onSuccess()
                withRefreshRetry(session) { activeSession ->
                    loadData(activeSession)
                    val detail = api.getEliteThread(activeSession, threadId)
                    _state.update {
                        it.copy(selectedEliteThread = detail.thread, eliteReplies = detail.replies)
                    }
                }
            }
        }
    }

    suspend fun uploadEliteImage(context: Context, uri: Uri): String {
        val session = _state.value.session ?: error("Please sign in again before adding images.")
        val userId = session.user?.id ?: _state.value.user?.id ?: error("User account was not loaded.")
        val resolver = context.contentResolver
        val contentType = resolver.getType(uri)?.lowercase().orEmpty()
        val extension = when (contentType) {
            "image/jpeg", "image/jpg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            "image/gif" -> "gif"
            else -> error("Use a JPG, PNG, WEBP, or GIF image.")
        }
        val bytes = withContext(Dispatchers.IO) {
            resolver.openInputStream(uri)?.use { it.readBytes() }
        } ?: error("Could not read that image.")
        if (bytes.size > ELITE_IMAGE_MAX_BYTES) {
            error("Images must be 5 MB or smaller.")
        }
        return withRefreshRetry(session) { activeSession ->
            api.uploadEliteImage(activeSession, userId, bytes, contentType, extension)
        }
    }

    fun deleteEliteThread(threadId: String) {
        val session = _state.value.session ?: return
        accountScope.launch {
            runSavingAction("Conversation deleted.") {
                withRefreshRetry(session) { activeSession ->
                    api.deleteEliteThread(activeSession, threadId)
                    if (_state.value.selectedEliteThread?.id == threadId) {
                        _state.update { it.copy(selectedEliteThread = null, eliteReplies = emptyList()) }
                    }
                    loadData(activeSession)
                }
            }
        }
    }

    fun reportEliteContent(
        threadId: String,
        replyId: String?,
        reason: String,
        details: String,
        reportedTitle: String?,
        reportedBody: String?,
        reportedAuthor: String?
    ) {
        val session = _state.value.session ?: return
        val userId = session.user?.id ?: _state.value.user?.id ?: return
        accountScope.launch {
            runSavingAction("Report sent for compliance review.") {
                withRefreshRetry(session) { activeSession ->
                    val activeUserId = activeSession.user?.id ?: userId
                    api.reportEliteContent(
                        activeSession,
                        activeUserId,
                        threadId,
                        replyId,
                        reason,
                        details,
                        reportedTitle,
                        reportedBody,
                        reportedAuthor
                    )
                }
            }
        }
    }

    fun registerPushToken(token: String) {
        val session = _state.value.session ?: return
        val userId = session.user?.id ?: _state.value.user?.id ?: return
        pushToken = token
        sessionStore.savePushToken(token)
        accountScope.launch {
            runCatching {
                withRefreshRetry(session) { activeSession ->
                    api.registerPushToken(
                        session = activeSession,
                        userId = activeSession.user?.id ?: userId,
                        token = token,
                        appVersion = BuildConfig.VERSION_NAME,
                        deviceName = deviceName()
                    )
                }
            }
        }
    }

    fun flagNativeEndpointTodo(feature: String) {
        _state.update {
            it.copy(
                message = "$feature needs a stable mobile API endpoint before it can be completed natively.",
                error = null
            )
        }
    }

    suspend fun signedUrl(bucket: String, path: String): String {
        val session = _state.value.session ?: error("Not signed in")
        if (bucket == "templates") {
            val data = _state.value.data
            check(data.templates.any { it.storagePath == path &&
                com.preschoolprimadonna.app.data.canAccessTemplate(data.subscription, data.isAdmin, it) }) {
                "This resource is not included in your current plan."
            }
        }
        return withRefreshRetry(session) { api.signedStorageUrl(it, bucket, path) }
    }

    fun clearNotice() {
        _state.update { it.copy(error = null, message = null) }
    }

    private suspend fun loadData(session: AuthSession) {
        val user = session.user ?: api.getCurrentUser(session)
        val userId = user.id
        val acceptance = api.getLegalAcceptance(session, userId)
        if (acceptance == null) {
            _state.update { it.copy(user = user, data = DashboardData(), loading = false, saving = false) }
            return
        }
        val data = supervisorScope {
            val profile = async { api.getProfile(session, userId) }
            val subscription = async { api.getSubscription(session, userId) }
            val isAdmin = async { runCatching { api.isAdmin(session, userId) }.getOrDefault(false) }
            val notificationPreferences = async {
                // A failed read must not replace an existing opt-out with defaults.
                api.getNotificationPreferences(session, userId) ?: NotificationPreferences(userId = userId)
            }
            val centers = async { api.getCenters(session, userId) }
            val templates = async { api.getTemplates(session) }
            val videos = async { api.getVideos(session) }
            val sessions = async { api.getCoachingSessions(session, userId) }
            val todayRecommendation = async { runCatching { api.getTodayRecommendation(session) }.getOrNull() }
            val resolvedSubscription = subscription.await()
            val resolvedIsAdmin = isAdmin.await()
            val hasEliteAccess = resolvedIsAdmin ||
                (resolvedSubscription?.tier == "elite" && resolvedSubscription.status == "active")
            val eliteResult = if (hasEliteAccess) runCatching {
                api.getEliteThreads(session) to api.getEliteBlocks(session)
            }.onFailure { if (it is CancellationException) throw it } else null
            DashboardData(
                profile = profile.await(),
                subscription = resolvedSubscription,
                isAdmin = resolvedIsAdmin,
                notificationPreferences = notificationPreferences.await(),
                legalAcceptance = acceptance,
                centers = centers.await(),
                templates = templates.await(),
                videos = videos.await(),
                coachingSessions = sessions.await(),
                eliteThreads = eliteResult?.getOrNull()?.first.orEmpty(),
                eliteBlocks = eliteResult?.getOrNull()?.second.orEmpty(),
                eliteError = eliteResult?.exceptionOrNull()?.readableMessage(),
                todayRecommendation = todayRecommendation.await()
            )
        }
        _state.update {
            it.copy(
                user = user,
                data = data,
                loading = false,
                saving = false,
                error = null
            )
        }
        sessionStore.savePushAlerts(data.notificationPreferences.pushAlerts)
    }

    private suspend fun loadDataWithRefresh(session: AuthSession) {
        withRefreshRetry(session) { activeSession ->
            loadData(activeSession)
        }
    }

    private suspend fun <T> withRefreshRetry(
        session: AuthSession,
        block: suspend (AuthSession) -> T
    ): T {
        return try {
            block(session)
        } catch (throwable: Throwable) {
            if (!throwable.isExpiredSession()) throw throwable
            val refreshed = refreshStoredSession(session)
            block(refreshed)
        }
    }

    private suspend fun refreshStoredSession(session: AuthSession): AuthSession {
        return refreshMutex.withLock {
            currentCoroutineContext().ensureActive()
            val current = _state.value.session ?: throw CancellationException("Signed out")
            if (current.accessToken != session.accessToken) return@withLock current
            val refreshToken = session.refreshToken
                ?: throw IllegalStateException("Session expired. Please sign in again.")
            val refreshed = api.refresh(refreshToken)
            saveStoredSession(refreshed)
            _state.update { it.copy(session = refreshed, error = null) }
            refreshed
        }
    }

    private suspend fun readStoredSession(): AuthSession? = withContext(Dispatchers.IO) {
        sessionStore.read()
    }

    private suspend fun saveStoredSession(session: AuthSession) = withContext(Dispatchers.IO) {
        sessionStore.save(session)
    }

    private suspend fun runBlockingAction(block: suspend () -> Unit) {
        _state.update { it.copy(loading = true, error = null, message = null) }
        runCatching { block() }
            .onFailure { throwable ->
                        if (throwable is CancellationException) throw throwable
                _state.update {
                    it.copy(loading = false, saving = false, error = throwable.readableMessage())
                }
            }
    }

    private suspend fun runSavingAction(successMessage: String, block: suspend () -> Unit) {
        _state.update { it.copy(saving = true, error = null, message = null) }
        runCatching { block() }
            .onSuccess {
                _state.update { state -> state.copy(saving = false, message = successMessage) }
            }
            .onFailure { throwable ->
                        if (throwable is CancellationException) throw throwable
                _state.update {
                    it.copy(saving = false, error = throwable.readableMessage())
                }
            }
    }

    private fun Throwable.readableMessage(): String {
        val raw = message.orEmpty()
        val lower = raw.lowercase()
        return when {
            "invalid_credentials" in lower || "invalid login credentials" in lower ->
                "Invalid email or password. Please try again."
            "email not confirmed" in lower ->
                "Please confirm your email before signing in."
            "rate limit" in lower || "too many requests" in lower ->
                "Too many attempts. Please wait a moment and try again."
            else -> raw
                .replace("{", "")
                .replace("}", "")
                .takeIf { it.isNotBlank() }
        }
            ?: "Something went wrong."
    }

    private fun Throwable.isExpiredSession(): Boolean {
        val text = message.orEmpty().lowercase()
        return "token is expired" in text ||
            "jwt expired" in text ||
            "expired jwt" in text ||
            "bad_jwt" in text
    }

    private fun Uri.authParams(): Map<String, String> {
        val values = mutableMapOf<String, String>()
        queryParameterNames.forEach { name ->
            getQueryParameter(name)?.let { values[name] = it }
        }
        fragment
            ?.split("&")
            ?.mapNotNull { pair ->
                val key = pair.substringBefore("=", missingDelimiterValue = "").takeIf { it.isNotBlank() }
                val value = pair.substringAfter("=", missingDelimiterValue = "")
                key?.let { decodeAuthParam(it) to decodeAuthParam(value) }
            }
            ?.forEach { (key, value) -> values[key] = value }
        return values
    }

    private fun decodeAuthParam(value: String): String {
        return runCatching { URLDecoder.decode(value, Charsets.UTF_8.name()) }.getOrDefault(value)
    }

    private fun startRavenPlayback(sessionId: String, files: List<File>) {
        if (files.isEmpty()) {
            _state.update {
                it.copy(
                    voiceLoadingSessionId = null,
                    voicePlayingSessionId = null,
                    error = "Raven voice could not generate audio for this strategy."
                )
            }
            return
        }
        releaseRavenPlayer()
        _state.update {
            it.copy(
                voiceLoadingSessionId = null,
                voicePlayingSessionId = sessionId,
                error = null,
                message = null
            )
        }
        playRavenFile(sessionId, files, index = 0)
    }

    private fun playRavenFile(sessionId: String, files: List<File>, index: Int) {
        if (index >= files.size) {
            releaseRavenPlayer()
            _state.update { state ->
                if (state.voicePlayingSessionId == sessionId) {
                    state.copy(voicePlayingSessionId = null)
                } else {
                    state
                }
            }
            return
        }
        val file = files[index]
        val player = MediaPlayer().apply {
            setDataSource(file.absolutePath)
            setOnCompletionListener { completedPlayer ->
                if (voicePlayer === completedPlayer) {
                    voicePlayer = null
                }
                completedPlayer.release()
                if (_state.value.voicePlayingSessionId == sessionId) {
                    playRavenFile(sessionId, files, index + 1)
                }
            }
            setOnErrorListener { _, _, _ ->
                releaseRavenPlayer()
                _state.update {
                    it.copy(
                        voiceLoadingSessionId = null,
                        voicePlayingSessionId = null,
                        error = "Raven voice could not play on this device."
                    )
                }
                true
            }
            prepare()
            start()
        }
        voicePlayer = player
    }

    private fun releaseRavenPlayer() {
        voicePlayer?.let { player ->
            runCatching {
                if (player.isPlaying) player.stop()
            }
            player.release()
        }
        voicePlayer = null
    }

    override fun onCleared() {
        releaseRavenPlayer()
        super.onCleared()
    }

    private companion object {
        const val ELITE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
    }

    private fun deviceName(): String {
        val manufacturer = Build.MANUFACTURER.orEmpty().replaceFirstChar { it.uppercase() }
        val model = Build.MODEL.orEmpty()
        return listOf(manufacturer, model)
            .filter { it.isNotBlank() }
            .joinToString(" ")
            .ifBlank { "Android" }
    }
}

private fun CoachingSession.ravenVoiceText(): String {
    val response = response?.jsonObjectOrNull()
    val actionSteps = (
        response?.get("action_steps")?.jsonArrayOrNull()
            ?: response?.get("actions")?.jsonArrayOrNull()
        )
        ?.mapNotNull { it.jsonTextOrNull() }
        .orEmpty()
    val parts = listOfNotNull(
        response?.get("diagnosis")?.jsonTextOrNull(),
        response?.get("impact")?.jsonTextOrNull(),
        response?.get("strategic_move")?.jsonTextOrNull()
            ?: response?.get("recommendation")?.jsonTextOrNull(),
        response?.get("elevation")?.jsonTextOrNull(),
        actionSteps
            .takeIf { it.isNotEmpty() }
            ?.joinToString(separator = " Then, ", prefix = "Here's where to start. ")
    )
    return parts
        .map { it.trim().replace(Regex("\\s+"), " ") }
        .filter { it.isNotBlank() }
        .joinToString(" ")
        .take(5000)
}

private fun JsonElement.jsonObjectOrNull(): JsonObject? = runCatching { jsonObject }.getOrNull()

private fun JsonElement.jsonArrayOrNull(): JsonArray? = runCatching { jsonArray }.getOrNull()

private fun JsonElement.jsonTextOrNull(): String? {
    return when (this) {
        is JsonPrimitive -> contentOrNull
        else -> toString().takeIf { it.isNotBlank() && it != "null" }
    }
}
