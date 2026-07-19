package com.preschoolprimadonna.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class AuthSession(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String? = null,
    @SerialName("expires_in") val expiresIn: Long? = null,
    @SerialName("token_type") val tokenType: String? = null,
    val user: AuthUser? = null
)

@Serializable
data class AuthUser(
    val id: String,
    val email: String? = null
)

@Serializable
data class Profile(
    val id: String,
    @SerialName("full_name") val fullName: String? = null,
    @SerialName("business_name") val businessName: String? = null,
    val state: String? = null,
    val timezone: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class Subscription(
    val id: String,
    @SerialName("user_id") val userId: String,
    val tier: String? = null,
    val status: String? = null,
    @SerialName("current_period_end") val currentPeriodEnd: String? = null
)

@Serializable
data class Center(
    val id: String? = null,
    @SerialName("user_id") val userId: String? = null,
    val name: String? = null,
    val city: String? = null,
    val state: String? = null,
    @SerialName("ages_served") val agesServed: String? = null,
    @SerialName("enrollment_size") val enrollmentSize: Int? = null,
    val capacity: Int? = null,
    @SerialName("tuition_range") val tuitionRange: String? = null,
    @SerialName("staff_count") val staffCount: Int? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class TemplateItem(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    val category: String? = null,
    @SerialName("tier_required") val tierRequired: String? = null,
    @SerialName("storage_path") val storagePath: String? = null,
    @SerialName("is_elite") val isElite: Boolean? = null
)

@Serializable
data class RavenVideo(
    val id: String,
    val title: String? = null,
    val description: String? = null,
    @SerialName("storage_path") val storagePath: String? = null,
    @SerialName("thumbnail_path") val thumbnailPath: String? = null,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    val category: String? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)

@Serializable
data class CoachingSession(
    val id: String,
    @SerialName("user_id") val userId: String,
    val mode: String? = null,
    val prompt: String? = null,
    val response: JsonElement? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class EliteThread(
    val id: String,
    @SerialName("user_id") val userId: String? = null,
    val title: String? = null,
    val body: String? = null,
    @SerialName("image_urls") val imageUrls: List<String> = emptyList(),
    val pinned: Boolean? = null,
    @SerialName("author_name") val authorName: String? = null,
    @SerialName("reply_count") val replyCount: Int? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)

@Serializable
data class EliteReply(
    val id: String,
    @SerialName("thread_id") val threadId: String? = null,
    @SerialName("user_id") val userId: String? = null,
    val body: String? = null,
    @SerialName("image_urls") val imageUrls: List<String> = emptyList(),
    @SerialName("author_name") val authorName: String? = null,
    @SerialName("created_at") val createdAt: String? = null
)

@Serializable
data class EliteThreadDetail(
    val thread: EliteThread,
    val replies: List<EliteReply> = emptyList()
)

data class DashboardData(
    val profile: Profile? = null,
    val subscription: Subscription? = null,
    val centers: List<Center> = emptyList(),
    val templates: List<TemplateItem> = emptyList(),
    val videos: List<RavenVideo> = emptyList(),
    val coachingSessions: List<CoachingSession> = emptyList(),
    val eliteThreads: List<EliteThread> = emptyList(),
    val todayRecommendation: String? = null
)
