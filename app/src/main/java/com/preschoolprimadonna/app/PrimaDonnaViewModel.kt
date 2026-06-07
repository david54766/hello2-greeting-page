package com.preschoolprimadonna.app

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.preschoolprimadonna.app.data.AuthSession
import com.preschoolprimadonna.app.data.AuthUser
import com.preschoolprimadonna.app.data.Center
import com.preschoolprimadonna.app.data.DashboardData
import com.preschoolprimadonna.app.data.EliteReply
import com.preschoolprimadonna.app.data.EliteThread
import com.preschoolprimadonna.app.data.RavenSlot
import com.preschoolprimadonna.app.data.SessionStore
import com.preschoolprimadonna.app.data.SupabaseRestClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
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
    val error: String? = null,
    val message: String? = null
)

class PrimaDonnaViewModel(application: Application) : AndroidViewModel(application) {
    private val api = SupabaseRestClient()
    private val sessionStore = SessionStore(application)
    private val _state = MutableStateFlow(PrimaDonnaState(loading = true))

    val state: StateFlow<PrimaDonnaState> = _state

    init {
        val storedSession = sessionStore.read()
        if (storedSession == null) {
            _state.value = PrimaDonnaState(loading = false)
        } else {
            _state.value = PrimaDonnaState(session = storedSession, loading = true)
            refresh()
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            runBlockingAction {
                val session = api.signIn(email.trim(), password)
                sessionStore.save(session)
                _state.update {
                    it.copy(
                        session = session,
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
        viewModelScope.launch {
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
                    sessionStore.save(session)
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
        viewModelScope.launch {
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
        viewModelScope.launch {
            runBlockingAction {
                api.updatePassword(recoverySession, password)
                sessionStore.save(recoverySession)
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
            sessionStore.clear()
            _state.update {
                it.copy(
                    passwordRecoverySession = session,
                    session = null,
                    loading = false,
                    error = null,
                    message = "Enter a new password."
                )
            }
            return
        }
        viewModelScope.launch {
            runBlockingAction {
                loadData(session)
                sessionStore.save(session)
                _state.update {
                    it.copy(
                        session = session,
                        passwordRecoverySession = null,
                        error = null,
                        message = "Welcome back."
                    )
                }
            }
        }
    }

    fun signOut() {
        sessionStore.clear()
        _state.value = PrimaDonnaState()
    }

    fun refresh() {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            runBlockingAction {
                loadDataWithRefresh(session)
            }
        }
    }

    fun saveProfile(fullName: String, businessName: String, state: String, timezone: String) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        viewModelScope.launch {
            runSavingAction("Profile saved.") {
                withRefreshRetry(session) { activeSession ->
                    api.updateProfile(activeSession, userId, fullName, businessName, state, timezone)
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
        viewModelScope.launch {
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
        viewModelScope.launch {
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
        viewModelScope.launch {
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
        viewModelScope.launch {
            runSavingAction("Center deleted.") {
                withRefreshRetry(session) { activeSession ->
                    api.deleteCenter(activeSession, userId, centerId)
                    loadData(activeSession)
                }
            }
        }
    }

    fun submitCoachingPrompt(mode: String, prompt: String) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        viewModelScope.launch {
            runSavingAction("Session saved.") {
                withRefreshRetry(session) { activeSession ->
                    api.addCoachingSession(activeSession, userId, mode, prompt)
                    loadData(activeSession)
                }
            }
        }
    }

    fun deleteCoachingSession(sessionId: String) {
        val session = _state.value.session ?: return
        val userId = _state.value.user?.id ?: return
        viewModelScope.launch {
            runSavingAction("Session deleted.") {
                withRefreshRetry(session) { activeSession ->
                    api.deleteCoachingSession(activeSession, userId, sessionId)
                    loadData(activeSession)
                }
            }
        }
    }

    fun createEliteThread(title: String, body: String) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            runSavingAction("Conversation posted.") {
                withRefreshRetry(session) { activeSession ->
                    api.createEliteThread(activeSession, title, body)
                    loadData(activeSession)
                }
            }
        }
    }

    fun openEliteThread(threadId: String) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
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
                _state.update {
                    it.copy(saving = false, error = throwable.readableMessage())
                }
            }
        }
    }

    fun closeEliteThread() {
        _state.update { it.copy(selectedEliteThread = null, eliteReplies = emptyList(), error = null) }
    }

    fun replyEliteThread(threadId: String, body: String) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            runSavingAction("Reply posted.") {
                withRefreshRetry(session) { activeSession ->
                    api.replyEliteThread(activeSession, threadId, body)
                    loadData(activeSession)
                    val detail = api.getEliteThread(activeSession, threadId)
                    _state.update {
                        it.copy(selectedEliteThread = detail.thread, eliteReplies = detail.replies)
                    }
                }
            }
        }
    }

    fun deleteEliteThread(threadId: String) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
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

    fun bookRavenSlot(slot: RavenSlot, topic: String) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            runSavingAction("Raven session booked.") {
                withRefreshRetry(session) { activeSession ->
                    api.bookRavenSlot(activeSession, slot, topic)
                    loadData(activeSession)
                }
            }
        }
    }

    fun cancelRavenBooking(bookingId: String) {
        val session = _state.value.session ?: return
        viewModelScope.launch {
            runSavingAction("Booking cancelled.") {
                withRefreshRetry(session) { activeSession ->
                    api.cancelRavenBooking(activeSession, bookingId)
                    loadData(activeSession)
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
        return api.signedStorageUrl(session, bucket, path)
    }

    fun clearNotice() {
        _state.update { it.copy(error = null, message = null) }
    }

    private suspend fun loadData(session: AuthSession) {
        val user = api.getCurrentUser(session)
        val profile = api.getProfile(session, user.id)
        val subscription = api.getSubscription(session, user.id)
        val centers = api.getCenters(session, user.id)
        val templates = api.getTemplates(session)
        val videos = api.getVideos(session)
        val sessions = api.getCoachingSessions(session, user.id)
        val eliteThreads = runCatching { api.getEliteThreads(session) }.getOrDefault(emptyList())
        val (ravenSlots, ravenTimezone) = runCatching { api.getRavenSlots(session) }.getOrDefault(emptyList<RavenSlot>() to null)
        val ravenBookings = runCatching { api.getRavenBookings(session) }.getOrDefault(emptyList())
        _state.update {
            it.copy(
                user = user,
                data = DashboardData(
                    profile = profile,
                    subscription = subscription,
                    centers = centers,
                    templates = templates,
                    videos = videos,
                    coachingSessions = sessions,
                    eliteThreads = eliteThreads,
                    ravenSlots = ravenSlots,
                    ravenBookings = ravenBookings,
                    ravenTimezone = ravenTimezone
                ),
                loading = false,
                saving = false,
                error = null
            )
        }
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
        val refreshToken = session.refreshToken
            ?: throw IllegalStateException("Session expired. Please sign in again.")
        val refreshed = api.refresh(refreshToken)
        sessionStore.save(refreshed)
        _state.update { it.copy(session = refreshed, error = null) }
        return refreshed
    }

    private suspend fun runBlockingAction(block: suspend () -> Unit) {
        _state.update { it.copy(loading = true, error = null, message = null) }
        runCatching { block() }
            .onFailure { throwable ->
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
                _state.update {
                    it.copy(saving = false, error = throwable.readableMessage())
                }
            }
    }

    private fun Throwable.readableMessage(): String {
        return message
            ?.replace("{", "")
            ?.replace("}", "")
            ?.takeIf { it.isNotBlank() }
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
}
